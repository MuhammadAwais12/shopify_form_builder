import { useState } from "react";

import FormDetails from "./FormDetails";
import NotificationSettings from "./NotificationSettings";
import AddFieldsPanel from "./AddFieldsPanel";
import FormFieldsList from "./FormFieldsList";
import FieldSettings from "./FieldSettings";
import FormBuilderLayout from "./FormBuilderLayout";

import {
  buildPayloadFields,
  createField,
  moveFieldInList,
  updateFieldList,
} from "../../utils/form-fields";

// Shared by the create and edit pages: owns the editor state and hands a
// ready-to-send payload to `onSave`. Children render inside the page (use them
// for page-level actions such as delete).
export default function FormBuilder({
  heading,
  initialDetails,
  initialFields = [],
  isSaving,
  error,
  onSave,
  children,
}) {
  const [formDetails, setFormDetails] = useState(initialDetails);
  const [fields, setFields] = useState(initialFields);
  const [selectedId, setSelectedId] = useState(null);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;
  const cannotSave = isSaving || !formDetails.name.trim();

  function updateFormDetail(key, value) {
    setFormDetails((prev) => ({ ...prev, [key]: value }));
  }

  function addField(type) {
    const field = createField(type, fields.length);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function updateSelectedField(key, value) {
    if (!selectedId) return;
    setFields((prev) => updateFieldList(prev, selectedId, key, value));
  }

  function moveField(index, direction) {
    setFields((prev) => moveFieldInList(prev, index, direction));
  }

  function removeField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleSave() {
    onSave({ ...formDetails, fields: buildPayloadFields(fields) });
  }

  return (
    <s-page heading={heading}>
      <s-link slot="breadcrumb-actions" href="/app/forms">
        Forms
      </s-link>
      <s-button slot="secondary-actions" icon="view" disabled>
        Preview
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
        {...(cannotSave ? { disabled: true } : {})}
      >
        Save form
      </s-button>

      {error && <s-banner tone="critical">{error}</s-banner>}

      <FormBuilderLayout
        details={<FormDetails {...formDetails} onChange={updateFormDetail} />}
        notifications={
          <NotificationSettings
            notificationEmail={formDetails.notificationEmail}
            onChange={updateFormDetail}
          />
        }
        addFields={<AddFieldsPanel onAddField={addField} />}
        fieldsList={
          <FormFieldsList
            fields={fields}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveField}
            onRemove={removeField}
          />
        }
        fieldSettings={
          <FieldSettings field={selectedField} onChange={updateSelectedField} />
        }
      />

      {children}
    </s-page>
  );
}
