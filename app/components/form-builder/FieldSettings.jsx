import {
  OPTION_FIELD_TYPES,
  PLACEHOLDER_FIELD_TYPES,
} from "../../utils/form-fields";

export default function FieldSettings({ field, onChange }) {
  if (!field) {
    return (
      <s-section heading="Field settings">
        <s-text>Select a field to edit its settings.</s-text>
      </s-section>
    );
  }

  const hasOptions = OPTION_FIELD_TYPES.includes(field.fieldType);
  const optionsText = field.optionsText ?? (field.options || []).join("\n");

  return (
    <s-section heading="Field settings">
      <s-stack gap="base">
        <s-text-field
          label="Field label"
          value={field.label}
          onChange={(event) => onChange("label", event.currentTarget.value)}
        />

        {PLACEHOLDER_FIELD_TYPES.includes(field.fieldType) && (
          <s-text-field
            label="Placeholder"
            value={field.placeholder || ""}
            onChange={(event) =>
              onChange("placeholder", event.currentTarget.value)
            }
          />
        )}

        <s-checkbox
          label="Required field"
          checked={field.required}
          onChange={(event) =>
            onChange("required", event.currentTarget.checked)
          }
        />

        {hasOptions && (
          <s-text-area
            label={
              field.fieldType === "radio"
                ? "Radio button options (one per line)"
                : "Dropdown options (one per line)"
            }
            value={optionsText}
            onChange={(event) =>
              onChange("optionsText", event.currentTarget.value)
            }
            rows={5}
          />
        )}

        <s-text color="subdued">Field type: {field.fieldType}</s-text>
      </s-stack>
    </s-section>
  );
}
