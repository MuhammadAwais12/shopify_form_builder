import { FIELD_TYPES } from "../../utils/form-fields";

export default function AddFieldsPanel({ onAddField, disabled = false }) {
  return (
    <s-section heading="Add fields">
      <s-stack gap="base">
        {FIELD_TYPES.map(({ type, label }) => (
          <s-button
            key={type}
            inlineSize="fill"
            accessibilityLabel={`Add ${label} field`}
            onClick={() => onAddField(type)}
            {...(disabled ? { disabled: true } : {})}
          >
            {label}
          </s-button>
        ))}
      </s-stack>
    </s-section>
  );
}
