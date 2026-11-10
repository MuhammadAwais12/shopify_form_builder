export const FIELD_TYPES = [
  { type: "text", label: "Text field" },
  { type: "email", label: "Email field" },
  { type: "number", label: "Number field" },
  { type: "phone", label: "Phone field" },
  { type: "textarea", label: "Text area field" },
  { type: "select", label: "Dropdown field" },
  { type: "radio", label: "Radio buttons field" },
  { type: "checkbox", label: "Checkbox field" },
  { type: "date", label: "Date field" },
];

export const FORM_STATUSES = ["draft", "published"];
export const OPTION_FIELD_TYPES = ["select", "radio"];
export const PLACEHOLDER_FIELD_TYPES = [
  "text",
  "email",
  "number",
  "phone",
  "textarea",
];

export function createField(fieldType, position) {
  const fieldDefinition = FIELD_TYPES.find((item) => item.type === fieldType);

  if (!fieldDefinition) {
    throw new Error("Unsupported field type");
  }

  const needsOptions = OPTION_FIELD_TYPES.includes(fieldType);

  return {
    id: crypto.randomUUID(),
    label: fieldDefinition.label,
    fieldType,
    required: false,
    placeholder: "",
    options: needsOptions ? ["Option 1", "Option 2"] : [],
    position,
  };
}

export function updateFieldList(fields, fieldId, key, value) {
  return fields.map((field) =>
    field.id === fieldId ? { ...field, [key]: value } : field,
  );
}

export function moveFieldInList(fields, index, direction) {
  const nextFields = [...fields];
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= nextFields.length) {
    return fields;
  }

  [nextFields[index], nextFields[targetIndex]] = [
    nextFields[targetIndex],
    nextFields[index],
  ];

  return nextFields.map((field, position) => ({
    ...field,
    position,
  }));
}

// Converts a saved Field row into the shape the builder works with.
export function toEditorField(record) {
  return {
    id: record.id,
    label: record.label,
    fieldType: record.fieldType,
    required: record.required,
    placeholder: record.placeholder ?? "",
    options: Array.isArray(record.options) ? record.options : [],
    position: record.position,
  };
}

// The options textarea is edited as raw text (so Enter can add a new line);
// it is converted to a clean array only when saving.
export function parseOptionsText(text) {
  return String(text)
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

export function buildPayloadFields(fields) {
  return fields.map(({ optionsText, ...field }, position) => ({
    ...field,
    position,
    ...(optionsText !== undefined
      ? { options: parseOptionsText(optionsText) }
      : {}),
  }));
}

export function formatSubmissionValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
