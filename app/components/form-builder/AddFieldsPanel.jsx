import { FIELD_TYPES } from "../../utils/form-fields";

export default function AddFieldsPanel({ onAddField }) {
  return (
    <s-section heading="Add fields">
      <s-grid
        gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr"
        gap="base"
      >
        {FIELD_TYPES.map(({ type, label }) => (
          <s-grid-item key={type}>
            <s-button variant="secondary" onClick={() => onAddField(type)}>
              {label}
            </s-button>
          </s-grid-item>
        ))}
      </s-grid>
    </s-section>
  );
}
