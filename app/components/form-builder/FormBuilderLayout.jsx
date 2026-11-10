export default function FormBuilderLayout({
  details,
  notifications,
  addFields,
  fieldsList,
  fieldSettings,
}) {
  return (
    <s-stack gap="base">
      {/* First row: Full-width form details */}
      {details}

      {/* Optional full-width panel under the details */}
      {notifications}

      {/* Second row: Three columns */}
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size > 900px) 1fr 2fr 1fr, 1fr"
          gap="base"
          alignItems="start"
        >
          <s-grid-item>{addFields}</s-grid-item>

          <s-grid-item>{fieldsList}</s-grid-item>

          <s-grid-item>{fieldSettings}</s-grid-item>
        </s-grid>
      </s-query-container>
    </s-stack>
  );
}
