import { useEffect } from "react";
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  deleteFormForShop,
  getFormForShop,
  parseFormPayload,
  updateFormWithFields,
} from "../lib/forms.server";
import { toEditorField } from "../utils/form-fields";
import FormBuilder from "../components/form-builder/FormBuilder";

const notFound = () => new Response("Form not found", { status: 404 });

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const form = await getFormForShop(session.shop, params.id);
  if (!form) throw notFound();

  return {
    form: {
      id: form.id,
      name: form.name,
      status: form.status,
      submitButtonText: form.submitButtonText,
      successMessage: form.successMessage,
      notificationEmail: form.notificationEmail ?? "",
      updatedAt: form.updatedAt,
      submissionCount: form._count.submissions,
    },
    fields: form.fields.map(toEditorField),
  };
}

export async function action({ request, params }) {
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

  if (body?.intent === "delete") {
    try {
      if (!(await deleteFormForShop(session.shop, params.id))) {
        throw notFound();
      }
    } catch (error) {
      if (error instanceof Response) throw error;
      console.error("Delete form failed:", error);
      return data(
        { error: "Unable to delete the form. Please try again." },
        { status: 500 },
      );
    }
    return redirect("/app/forms");
  }

  const parsed = parseFormPayload(body);
  if (parsed.error) return data({ error: parsed.error }, { status: 400 });

  try {
    const saved = await updateFormWithFields(
      session.shop,
      params.id,
      parsed.data,
    );
    if (!saved) throw notFound();
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Update form failed:", error);
    return data(
      { error: "Unable to save your form. Please try again." },
      { status: 500 },
    );
  }

  return { saved: true };
}

export default function EditFormPage() {
  const { form, fields } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();

  const isBusy = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.saved) shopify.toast.show("Form saved");
  }, [actionData, shopify]);

  const send = (payload) =>
    submit(payload, { method: "post", encType: "application/json" });

  return (
    <FormBuilder
      // Remount with the server's copy after every save so new fields pick up
      // their real ids (otherwise the next save would duplicate them).
      key={`${form.updatedAt}:${fields.map((f) => f.id).join(",")}`}
      heading={form.name || "Edit form"}
      initialDetails={{
        name: form.name,
        status: form.status,
        submitButtonText: form.submitButtonText,
        successMessage: form.successMessage,
        notificationEmail: form.notificationEmail,
      }}
      initialFields={fields}
      isSaving={isBusy}
      error={actionData?.error}
      onSave={send}
    >
      <s-button
        slot="secondary-actions"
        tone="critical"
        commandFor="delete-form-modal"
        command="--show"
      >
        Delete
      </s-button>

      <s-modal id="delete-form-modal" heading="Delete this form?">
        <s-text>
          This permanently deletes “{form.name}”, its fields and{" "}
          {form.submissionCount}{" "}
          {form.submissionCount === 1 ? "submission" : "submissions"}. This
          cannot be undone.
        </s-text>
        <s-button
          slot="secondary-actions"
          commandFor="delete-form-modal"
          command="--hide"
        >
          Cancel
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          onClick={() => send({ intent: "delete" })}
        >
          Delete form
        </s-button>
      </s-modal>
    </FormBuilder>
  );
}
