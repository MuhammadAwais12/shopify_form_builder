import { data, redirect, useActionData, useNavigation, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import {
  parseFormPayload,
  createFormWithUniqueSlug,
} from "../lib/forms.server";
import FormBuilder from "../components/form-builder/FormBuilder";

const INITIAL_DETAILS = {
  name: "",
  status: "draft",
  submitButtonText: "Submit",
  successMessage: "Thanks! Your response was received.",
  notificationEmail: "",
};

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

  let form;
  try {
    form = await createFormWithUniqueSlug(session.shop, parsed.data);
  } catch (error) {
    console.error("Create form failed:", error);
    return data(
      { error: "Unable to save your form. Please try again." },
      { status: 500 },
    );
  }

  return redirect(`/app/forms/${form.id}`);
}

export default function NewFormPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  return (
    <FormBuilder
      heading="Create form"
      initialDetails={INITIAL_DETAILS}
      isSaving={navigation.state === "submitting"}
      error={actionData?.error}
      onSave={(payload) =>
        submit(payload, { method: "post", encType: "application/json" })
      }
    />
  );
}
