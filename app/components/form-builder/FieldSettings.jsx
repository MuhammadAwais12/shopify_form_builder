export default function FieldSettings({ field, onChange }) {
  if (!field) {
    return (
      <s-section heading="Field settings">
        <s-text>Select a field to edit its settings.</s-text>
      </s-section>
    );
  }

  const hasOptions = ["select", "radio"].includes(field.fieldType);

  return (
    <s-section heading="Field settings">
      <s-stack gap="base">
        <s-text-field
          label="Field label"
          value={field.label}
          onChange={(value) => onChange("label", value)}
        />

        {["text", "email", "number", "phone", "textarea"].includes(
          field.fieldType,
        ) && (
          <s-text-field
            label="Placeholder"
            value={field.placeholder || ""}
            onChange={(value) => onChange("placeholder", value)}
          />
        )}

        <s-checkbox
          label="Required field"
          checked={field.required}
          onChange={(value) => onChange("required", value)}
        />

        {hasOptions && (
          <s-text-area
            label={
              field.fieldType === "radio"
                ? "Radio button options (one per line)"
                : "Dropdown options (one per line)"
            }
            value={(field.options || []).join("\n")}
            onChange={(value) =>
              onChange(
                "options",
                value
                  .split("\n")
                  .map((option) => option.trim())
                  .filter(Boolean),
              )
            }
            rows={5}
          />
        )}

        <s-text color="subdued">Field type: {field.fieldType}</s-text>
      </s-stack>
    </s-section>
  );
}
