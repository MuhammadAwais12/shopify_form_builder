const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+()\-.\s]{5,30}$/;
const MAX_LENGTH = { text: 2000, textarea: 5000, email: 254, number: 50 };

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function cleanValue(field, raw) {
  if (field.fieldType === "checkbox") {
    const checked = raw === undefined ? false : raw;
    if (typeof checked !== "boolean") return { error: "Invalid value." };
    if (field.required && !checked) return { error: "This box must be checked." };
    return { value: checked };
  }

  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return { error: "Invalid value." };
  }
  const value = (raw ?? "").trim();
  if (value === "") {
    return field.required ? { error: "This field is required." } : { value: "" };
  }

  if (value.length > (MAX_LENGTH[field.fieldType] ?? MAX_LENGTH.text)) {
    return { error: "This value is too long." };
  }

  switch (field.fieldType) {
        case "email":
      if (!EMAIL.test(value)) return { error: "Enter a valid email address." };
      break;
    case "number":
      if (!Number.isFinite(Number(value))) return { error: "Enter a valid number." };
      break;
    case "phone":
      if (!PHONE.test(value)) return { error: "Enter a valid phone number." };
      break;
    case "date":
      if (!isRealDate(value)) return { error: "Enter a valid date." };
      break;
    case "select":
    case "radio":
      if (!Array.isArray(field.options) || !field.options.includes(value)) {
        return { error: "Choose one of the available options." };
      }
      break;
    default:
      break;
  }
  return { value };
}

// Validates browser input against the saved fields. Only known field ids end up
// in `data`; anything else the client sends is ignored.
export function parseSubmission(fields, values) {
  const source =
    values && typeof values === "object" && !Array.isArray(values) ? values : {};
  const data = {};
  const errors = {};

  for (const field of fields) {
    const result = cleanValue(field, source[field.id]);
    if (result.error) errors[field.id] = result.error;
    else data[field.id] = result.value;
  }

  return Object.keys(errors).length > 0 ? { errors } : { data };
}
