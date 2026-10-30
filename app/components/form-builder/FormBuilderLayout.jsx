export default function FormBuilderLayout({
  details,
  addFields,
  fieldsList,
  fieldSettings,
}) {
  return (
    <s-stack gap="base">
      {details}

      <s-grid
        gridTemplateColumns="@container (inline-size > 700px) 1fr 1fr, 1fr"
        gap="base"
      >
        <s-grid-item>
          <s-stack gap="base">
            {addFields}
            {fieldsList}
          </s-stack>
        </s-grid-item>

        <s-grid-item>{fieldSettings}</s-grid-item>
      </s-grid>
    </s-stack>
  );
}
