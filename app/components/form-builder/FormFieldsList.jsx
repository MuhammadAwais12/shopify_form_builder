const FIELD_LABELS = {
  text: "Text field",
  email: "Email field",
  number: "Number field",
  phone: "Phone field",
  textarea: "Text area field",
  select: "Dropdown field",
  radio: "Radio buttons field",
  checkbox: "Checkbox field",
  date: "Date field",
};

export default function FormFieldsList({
  fields,
  selectedId,
  onSelect,
  onMove,
  onRemove,
}) {
  return (
    <s-section heading={`Form fields (${fields.length})`}>
      {fields.length === 0 ? (
        <s-text>Add a field to start building your form.</s-text>
      ) : (
        <s-stack gap="base">
          {fields.map((field, index) => (
            <s-box
              key={field.id}
              padding="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small">
                <s-button
                  variant={selectedId === field.id ? "primary" : "secondary"}
                  onClick={() => onSelect(field.id)}
                >
                  {field.label || "Untitled field"}
                  {field.required ? " *" : ""}
                </s-button>

                <s-text color="subdued">
                  {FIELD_LABELS[field.fieldType] || field.fieldType}
                </s-text>

                <s-stack direction="inline" gap="small">
                  <s-button
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  >
                    Move up
                  </s-button>

                  <s-button
                    variant="secondary"
                    disabled={index === fields.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    Move down
                  </s-button>

                  <s-button
                    variant="secondary"
                    onClick={() => onRemove(field.id)}
                  >
                    Remove
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      )}
    </s-section>
  );
}
