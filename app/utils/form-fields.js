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

export function createField(fieldType, position) {
  const fieldDefinition = FIELD_TYPES.find((item) => item.type === fieldType);

  if (!fieldDefinition) {
    throw new Error("Unsupported field type");
  }

  const needsOptions = ["select", "radio"].includes(fieldType);

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
