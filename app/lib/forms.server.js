import { randomBytes } from "node:crypto";
import prisma from "../db.server";
import {
  FIELD_TYPES as FIELD_TYPE_DEFINITIONS,
  FORM_STATUSES,
  OPTION_FIELD_TYPES,
} from "../utils/form-fields";

const FIELD_TYPES = new Set(FIELD_TYPE_DEFINITIONS.map(({ type }) => type));
const OPTION_TYPES = new Set(OPTION_FIELD_TYPES);
const STATUSES = new Set(FORM_STATUSES);

export const LIMITS = {
  name: 191,
  submitText: 100,
  successMessage: 500,
  fields: 100,
  label: 100,
  placeholder: 150,
  options: 50,
  option: 100,
};

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => (typeof v === "string" ? v.trim() : null);

function createSlug(name) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "form"
  );
}

function parseOptions(input, label) {
  if (
    !Array.isArray(input) ||
    input.length < 1 ||
    input.length > LIMITS.options
  ) {
    return {
      error: `"${label}" needs between 1 and ${LIMITS.options} options.`,
    };
  }
  const options = input.map((o) => text(o));
  if (options.some((o) => !o || o.length > LIMITS.option)) {
    return {
      error: `Each option in "${label}" must be 1-${LIMITS.option} characters.`,
    };
  }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    return { error: `"${label}" has duplicate options.` };
  }
  return { value: options };
}

function parseFields(input) {
  if (!Array.isArray(input)) return { error: "Fields must be a valid list." };
  if (input.length > LIMITS.fields) {
    return { error: `You can add a maximum of ${LIMITS.fields} fields.` };
  }

  const value = [];
  const seenIds = new Set();
  for (const [index, field] of input.entries()) {
    const n = index + 1;
    if (!isPlainObject(field)) return { error: `Field ${n} is invalid.` };
    if (!FIELD_TYPES.has(field.fieldType)) {
      return { error: `Field ${n} has an unsupported type.` };
    }

    const label = text(field.label);
    if (!label || label.length > LIMITS.label) {
      return {
        error: `Field ${n} needs a label of 1-${LIMITS.label} characters.`,
      };
    }
    if (field.required !== undefined && typeof field.required !== "boolean") {
      return { error: `The required setting for "${label}" is invalid.` };
    }

    let placeholder = null;
    if (field.placeholder != null) {
      placeholder = text(field.placeholder);
      if (placeholder === null || placeholder.length > LIMITS.placeholder) {
        return {
          error: `The placeholder for "${label}" must be at most ${LIMITS.placeholder} characters.`,
        };
      }
    }

    // `id` is only kept when it is a plain string: the update flow uses it to
    // match existing fields (and checks ownership); create ignores it.
    let id;
    if (field.id !== undefined) {
      if (
        typeof field.id !== "string" ||
        field.id.length === 0 ||
        field.id.length > 191 ||
        seenIds.has(field.id)
      ) {
        return { error: `Field ${n} is invalid.` };
      }
      seenIds.add(field.id);
      id = field.id;
    }

    // Build a clean object: unknown client keys (position...) are dropped.
    const clean = {
      ...(id ? { id } : {}),
      label,
      fieldType: field.fieldType,
      required: field.required ?? false,
      placeholder: placeholder || null,
      position: index, // order comes from array order, never from the client
    };

    if (OPTION_TYPES.has(field.fieldType)) {
      const options = parseOptions(field.options, label);
      if (options.error) return options;
      clean.options = options.value;
    }
    value.push(clean);
  }
  return { value };
}

export function parseFormPayload(body) {
  if (!isPlainObject(body))
    return { error: "Invalid form data. Please try again." };

  const name = text(body.name);
  if (!name || name.length > LIMITS.name) {
    return { error: `Form name is required (max ${LIMITS.name} characters).` };
  }
  if (!STATUSES.has(body.status))
    return { error: "Please select a valid form status." };

  const submitText = text(body.submitButtonText);
  if (!submitText || submitText.length > LIMITS.submitText) {
    return {
      error: `Submit button text must be 1-${LIMITS.submitText} characters.`,
    };
  }

  const successMessage = text(body.successMessage);
  if (!successMessage || successMessage.length > LIMITS.successMessage) {
    return {
      error: `Success message is required (max ${LIMITS.successMessage} characters).`,
    };
  }

  const fields = parseFields(body.fields);
  if (fields.error) return fields;

  if (body.status === "published" && fields.value.length === 0) {
    return { error: "Add at least one field before publishing." };
  }

  return {
    data: {
      name,
      status: body.status,
      submitButtonText: submitText,
      successMessage,
      fields: fields.value,
    },
  };
}

const withoutId = (field) =>
  Object.fromEntries(Object.entries(field).filter(([key]) => key !== "id"));

export async function createFormWithUniqueSlug(shop, { fields, ...form }) {
  const baseSlug = createSlug(form.name);
  const newFields = fields.map(withoutId);

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${randomBytes(3).toString("hex")}`;
    try {
      // Nested create = one atomic write (form and fields together).
      return await prisma.form.create({
        data: { shop, slug, ...form, fields: { create: newFields } },
        select: { id: true, slug: true },
      });
    } catch (error) {
      // P2002 = unique constraint on (shop, slug): retry with a suffix.
      if (error?.code !== "P2002" || attempt === 4) throw error;
    }
  }
  throw new Error("Could not generate a unique slug.");
}

// Every lookup below filters by `shop`, so one store can never read or change
// another store's forms even when it guesses an id.
export function getFormForShop(shop, id) {
  return prisma.form.findFirst({
    where: { id, shop },
    include: {
      fields: { where: { archivedAt: null }, orderBy: { position: "asc" } },
      _count: { select: { submissions: true } },
    },
  });
}

/**
 * Saves form settings and its fields in one transaction.
 * - Fields whose id belongs to this form are updated in place, so existing
 *   submissions (keyed by field id) keep matching their field.
 * - Unknown ids are treated as new fields (a client can never adopt a field
 *   that belongs to another form).
 * - Fields missing from the payload are archived, never deleted.
 * Returns null when the form does not exist for this shop.
 */
export async function updateFormWithFields(shop, id, { fields, ...form }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.form.findFirst({
      where: { id, shop },
      select: {
        id: true,
        fields: { where: { archivedAt: null }, select: { id: true } },
      },
    });
    if (!existing) return null;

    const activeIds = new Set(existing.fields.map((f) => f.id));
    const keptIds = new Set();

    await tx.form.update({ where: { id }, data: form });

    for (const field of fields) {
      const data = withoutId(field);
      if (field.id && activeIds.has(field.id)) {
        keptIds.add(field.id);
        await tx.field.update({ where: { id: field.id }, data });
      } else {
        await tx.field.create({ data: { ...data, formId: id } });
      }
    }

    const removedIds = [...activeIds].filter(
      (fieldId) => !keptIds.has(fieldId),
    );
    if (removedIds.length > 0) {
      await tx.field.updateMany({
        where: { id: { in: removedIds }, formId: id },
        data: { archivedAt: new Date() },
      });
    }

    return { id };
  });
}

export async function deleteFormForShop(shop, id) {
  const { count } = await prisma.form.deleteMany({ where: { id, shop } });
  return count > 0;
}
