export default function FormDetails({
  name,
  status,
  submitButtonText,
  successMessage,
  onChange,
}) {
  return (
    <s-section heading="Form details">
      <s-grid
        gridTemplateColumns="repeat(4, minmax(0, 1fr))"
        gap="base"
        alignItems="start"
      >
        <s-grid-item>
          <s-text-field
            label="Form name"
            name="name"
            value={name}
            onChange={(event) => onChange("name", event.currentTarget.value)}
            required
          />
        </s-grid-item>

        <s-grid-item>
          <s-select
            label="Status"
            name="status"
            value={status}
            onChange={(event) => onChange("status", event.currentTarget.value)}
          >
            <s-option value="draft">Draft</s-option>
            <s-option value="published">Active</s-option>
          </s-select>
        </s-grid-item>

        <s-grid-item>
          <s-text-field
            label="Submit button text"
            value={submitButtonText}
            onChange={(event) =>
              onChange("submitButtonText", event.currentTarget.value)
            }
          />
        </s-grid-item>

        <s-grid-item>
          <s-text-field
            label="Success message"
            value={successMessage}
            onChange={(event) =>
              onChange("successMessage", event.currentTarget.value)
            }
          />
        </s-grid-item>
      </s-grid>
    </s-section>
  );
}
