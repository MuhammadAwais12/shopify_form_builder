export default function FormDetails({
  name,
  status,
  submitButtonText,
  successMessage,
  onChange,
}) {
  return (
    <s-section heading="Form details">
      <s-stack gap="base">
        <s-text-field
          label="Form name"
          name="name"
          value={name}
          onChange={(event) => onChange("name", event.currentTarget.value)}
          required
        />

        <s-select
          label="Status"
          name="status"
          value={status}
          onChange={(event) => onChange("status", event.currentTarget.value)}
        >
          <s-option value="draft">Draft</s-option>
          <s-option value="active">Active</s-option>
        </s-select>

        <s-text-field
          label="Submit button text"
          value={submitButtonText}
          onChange={(event) =>
            onChange("submitButtonText", event.currentTarget.value)
          }
        />

        <s-text-area
          label="Success message"
          value={successMessage}
          onChange={(event) =>
            onChange("successMessage", event.currentTarget.value)
          }
          rows={3}
        />
      </s-stack>
    </s-section>
  );
}
