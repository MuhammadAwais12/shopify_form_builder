import { useState } from "react";
import { data, useActionData, useNavigation, useSubmit } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import {
  parseFormPayload,
  createFormWithUniqueSlug,
} from "../lib/forms.server";

import FormDetails from "../components/form-builder/FormDetails";
import AddFieldsPanel from "../components/form-builder/AddFieldsPanel";
import FormFieldsList from "../components/form-builder/FormFieldsList";
import FieldSettings from "../components/form-builder/FieldSettings";
import FormBuilderLayout from "../components/form-builder/FormBuilderLayout";

import {
  createField,
  updateFieldList,
  moveFieldInList,
} from "../utils/form-fields";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export async function action({ request }) {
  // shop always comes from the session, never from the request body
  const { session } = await authenticate.admin(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return data(
      { error: "Invalid form data. Please try again." },
      { status: 400 },
    );
  }

  const parsed = parseFormPayload(body);
  if (parsed.error) return data({ error: parsed.error }, { status: 400 });

  try {
    await createFormWithUniqueSlug(session.shop, parsed.data);
  } catch (error) {
    console.error("Create form failed:", error);
    return data(
      { error: "Unable to save your form. Please try again." },
      { status: 500 },
    );
  }

  // Change to `/app/forms/${form.id}` once the edit page exists.
  return redirect("/app/forms");
}

export default function NewFormPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSaving = navigation.state === "submitting";

  const [formDetails, setFormDetails] = useState({
    name: "",
    status: "draft",
    submitButtonText: "Submit",
    successMessage: "Thanks! Your response was received.",
  });
  const [fields, setFields] = useState([]);
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
    submit(
      { ...formDetails, fields },
      { method: "post", encType: "application/json" },
    );
  }

  return (
    <s-page heading="Create form">
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

      {actionData?.error && (
        <s-banner tone="critical">{actionData.error}</s-banner>
      )}

      <FormBuilderLayout
        details={<FormDetails {...formDetails} onChange={updateFormDetail} />}
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
    </s-page>
  );
}
