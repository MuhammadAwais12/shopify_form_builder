import { useState } from "react";
import { useActionData, useNavigation } from "react-router";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

import FormDetails from "../components/form-builder/FormDetails";
import AddFieldsPanel from "../components/form-builder/AddFieldsPanel";
import FormFieldsList from "../components/form-builder/FormFieldsList";
import FieldSettings from "../components/form-builder/FieldSettings";
import FormBuilderLayout from "../components/form-builder/FormBuilderLayout";

import {
  createField,
  updateFieldList,
  moveFieldInList,
} from "../utils/form-fields";

const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "email",
  "number",
  "phone",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
]);

const MAX_FIELDS = 100;
const MAX_OPTIONS = 50;
 
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

function validateFields(value) {
  let fields;

  try {
    fields = JSON.parse(value || "[]");
  } catch {
    return { error: "Invalid field data. Please try again." };
  }

  if (!Array.isArray(fields)) {
    return { error: "Fields must be a valid list." };
  }

  if (fields.length > MAX_FIELDS) {
    return { error: `You can add a maximum of ${MAX_FIELDS} fields.` };
  }

  const cleanFields = [];

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];

    if (!field || typeof field !== "object" || Array.isArray(field)) {
      return { error: `Field ${index + 1} is invalid.` };
    }

    if (!ALLOWED_FIELD_TYPES.has(field.fieldType)) {
      return { error: `Field ${index + 1} has an unsupported type.` };
    }

    if (typeof field.label !== "string") {
      return { error: `Field ${index + 1} needs a valid label.` };
    }

    const label = field.label.trim();

    if (!label || label.length > 100) {
      return {
        error: `Field ${index + 1} must have a label between 1 and 100 characters.`,
      };
    }

    if (field.required !== undefined && typeof field.required !== "boolean") {
      return { error: `The required setting for "${label}" is invalid.` };
    }

    let placeholder = null;

    if (field.placeholder != null && typeof field.placeholder !== "string") {
      return { error: `The placeholder for "${label}" is invalid.` };
    }

    if (typeof field.placeholder === "string") {
      placeholder = field.placeholder.trim();

      if (placeholder.length > 200) {
        return {
          error: `The placeholder for "${label}" cannot exceed 200 characters.`,
        };
      }
    }

    const needsOptions = ["select", "radio"].includes(field.fieldType);
    let options;

    if (needsOptions) {
      if (!Array.isArray(field.options)) {
        return {
          error: `"${label}" needs a list of options.`,
        };
      }

      if (field.options.length < 1 || field.options.length > 50) {
        return {
          error: `"${label}" must have between 1 and 50 options.`,
        };
      }

      if (
        field.options.some(
          (option) =>
            typeof option !== "string" ||
            option.trim().length === 0 ||
            option.trim().length > 100,
        )
      ) {
        return {
          error: `"${label}" has an invalid option. Each option must contain 1–100 characters.`,
        };
      }

      options = field.options.map((option) => option.trim());
    }

    cleanFields.push({
      label,
      fieldType: field.fieldType,
      required: field.required ?? false,
      placeholder,
      options,
      position: index,
    });
  }

  return { fields: cleanFields };
}

// -------------------- LOADER --------------------

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

// -------------------- ACTION --------------------

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  // Never accept the shop identifier from client-submitted form data.
  const shop = session.shop;

  const nameValue = formData.get("name");
  const statusValue = formData.get("status");
  const buttonValue = formData.get("submitButtonText");
  const messageValue = formData.get("successMessage");
  const fieldsValue = formData.get("fields");

  if (
    typeof nameValue !== "string" ||
    typeof statusValue !== "string" ||
    typeof buttonValue !== "string" ||
    typeof messageValue !== "string" ||
    typeof fieldsValue !== "string"
  ) {
    return { error: "Invalid form data. Please try again." };
  }

  const name = nameValue.trim();
  const status = statusValue;
  const submitButtonText = buttonValue.trim();
  const successMessage = messageValue.trim();

  if (!name || name.length > 191) {
    return {
      error: "Form name is required and must not exceed 191 characters.",
    };
  }

  if (!["draft", "active"].includes(status)) {
    return { error: "Please select a valid form status." };
  }

  if (!submitButtonText || submitButtonText.length > 100) {
    return {
      error: "Submit button text must be between 1 and 100 characters.",
    };
  }

  if (!successMessage || successMessage.length > 1000) {
    return {
      error: "Success message is required and cannot exceed 1000 characters.",
    };
  }

  const validation = validateFields(fieldsValue);

  if (validation.error) {
    return { error: validation.error };
  }

  const fields = validation.fields;
  const baseSlug = createSlug(name);

  // Retry unique slug collisions.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    try {
      const form = await prisma.form.create({
        data: {
          shop,
          name,
          slug,
          status,
          submitButtonText,
          successMessage,

          fields: {
            create: fields.map((field) => ({
              label: field.label,
              fieldType: field.fieldType,
              required: field.required,
              placeholder: field.placeholder,
              position: field.position,
              ...(field.options !== undefined
                ? { options: field.options }
                : {}),
            })),
          },
        },
      });

      return {
        success: true,
        formId: form.id,
        message: "Form created successfully.",
      };
    } catch (error) {
      if (error?.code === "P2002" && attempt < 4) {
        continue;
      }

      console.error("Create form failed:", error);

      if (error?.code === "P2002") {
        return {
          error: "Could not generate a unique form URL. Please try again.",
        };
      }

      return {
        error: "Unable to save your form. Please try again.",
      };
    }
  }

  return { error: "Unable to generate a unique form URL." };
}

// -------------------- PAGE COMPONENT --------------------

export default function NewFormPage() {
  const actionData = useActionData();
  const navigation = useNavigation();

  const isSaving = navigation.state === "submitting";

  const [formDetails, setFormDetails] = useState({
    name: "",
    status: "draft",
    submitButtonText: "Submit",
    successMessage: "Thanks! Your response was received.",
  });

  const [fields, setFields] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const selectedField = fields.find((field) => field.id === selectedId) ?? null;

  function updateFormDetail(key, value) {
    setFormDetails((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function addField(type) {
    const field = createField(type, fields.length);

    setFields((previous) => [...previous, field]);
    setSelectedId(field.id);
  }

  function updateSelectedField(key, value) {
    if (!selectedId) return;

    setFields((previous) => updateFieldList(previous, selectedId, key, value));
  }

  function moveField(index, direction) {
    setFields((previous) => moveFieldInList(previous, index, direction));
  }

  function removeField(id) {
    setFields((previous) =>
      previous
        .filter((field) => field.id !== id)
        .map((field, position) => ({ ...field, position })),
    );

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  return (
    <s-page heading="Create form">
       <s-button slot="primary-action"  type="submit">
         Save form
       </s-button>
       <s-button
        slot="secondary-actions"

        variant="primary"
        icon="view"
        href=""
      >
        Preview
      </s-button>
      <s-button slot="breadcrumb-actions" href="/app/forms">
        Back to forms
      </s-button>

      {actionData?.error && (
        <s-banner tone="critical">{actionData.error}</s-banner>
      )}

      {actionData?.success && (
        <s-banner tone="success">{actionData.message}</s-banner>
      )}

      <form method="post">
        <input type="hidden" name="name" value={formDetails.name} />
        <input type="hidden" name="status" value={formDetails.status} />

        <input
          type="hidden"
          name="submitButtonText"
          value={formDetails.submitButtonText}
        />

        <input
          type="hidden"
          name="successMessage"
          value={formDetails.successMessage}
        />

        <input type="hidden" name="fields" value={JSON.stringify(fields)} />

        <FormBuilderLayout
          details={<FormDetails {...formDetails} onChange={updateFormDetail} />}
          addFields={<AddFieldsPanel onAddField={addField} />}
          fieldsList={
            <FormFieldsList
              fields={fields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveField}
              onRemove={removeField}
            />
          }
          fieldSettings={
            <FieldSettings
              field={selectedField}
              onChange={updateSelectedField}
            />
          }
        />

        <s-box padding-block-start="base">
          <s-button
            variant="primary"
            type="submit"
            disabled={isSaving || !formDetails.name.trim()}
            loading={isSaving}
          >
            {isSaving ? "Saving..." : "Save form"}
          </s-button>
        </s-box>
      </form>
    </s-page>
  );
}
