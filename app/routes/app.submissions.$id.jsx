import { useEffect, useRef } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useSubmit,
} from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { formatSubmissionValue } from "../utils/form-fields";

const notFound = () => new Response("Submission not found", { status: 404 });

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);

  const submission = await prisma.submission.findFirst({
    where: { id: params.id, form: { shop: session.shop } },
    include: {
      form: {
        select: {
          id: true,
          name: true,
          // Archived fields stay listed so old answers keep their label.
          fields: { orderBy: { position: "asc" } },
        },
      },
    },
  });
  if (!submission) throw notFound();

  const values =
    submission.data && typeof submission.data === "object" ? submission.data : {};

  return {
    submission: {
      id: submission.id,
      isRead: submission.isRead,
      createdAt: submission.createdAt,
    },
    form: { id: submission.form.id, name: submission.form.name },
    answers: submission.form.fields
      .filter((field) => !field.archivedAt || field.id in values)
      .map((field) => ({
        id: field.id,
        label: field.label,
        archived: Boolean(field.archivedAt),
        value: formatSubmissionValue(values[field.id]),
      })),
  };
}

export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const intent = (await request.formData()).get("intent");
  const where = { id: params.id, form: { shop: session.shop } };

  try {
    if (intent === "read" || intent === "unread") {
      await prisma.submission.updateMany({
        where,
        data: { isRead: intent === "read" },
      });
      return { ok: true };
    }
    if (intent === "delete") {
      await prisma.submission.deleteMany({ where });
      return redirect("/app/submissions");
    }
  } catch (error) {
    console.error("Submission action failed:", error);
    return data({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return data({ error: "Unknown action." }, { status: 400 });
}

export default function SubmissionPage() {
  const { submission, form, answers } = useLoaderData();
  const readFetcher = useFetcher();
  const submit = useSubmit();

  // Opening a submission marks it as read (a POST, not a side effect of GET).
  // Once per submission, so "Mark as unread" is not immediately undone.
  const markedRef = useRef(null);
  const markRead = readFetcher.submit;
  useEffect(() => {
    if (submission.isRead || markedRef.current === submission.id) return;
    markedRef.current = submission.id;
    markRead({ intent: "read" }, { method: "post" });
  }, [submission.id, submission.isRead, markRead]);

  return (
    <s-page heading={`Submission · ${form.name}`}>
      <s-link slot="breadcrumb-actions" href="/app/submissions">
        Submissions
      </s-link>
      <s-button
        slot="secondary-actions"
        onClick={() => submit({ intent: "unread" }, { method: "post" })}
      >
        Mark as unread
      </s-button>
      <s-button
        slot="secondary-actions"
        tone="critical"
        commandFor="delete-submission-modal"
        command="--show"
      >
        Delete
      </s-button>

      <s-section heading="Responses">
        <s-stack gap="base">
          <s-text color="subdued">
            Received {new Date(submission.createdAt).toLocaleString()} ·{" "}
            <s-link href={`/app/forms/${form.id}`}>{form.name}</s-link>
          </s-text>
          {answers.map((answer) => (
            <s-stack key={answer.id} gap="small-300">
              <s-text type="strong">
                {answer.label}
                {answer.archived ? " (removed field)" : ""}
              </s-text>
              <s-text>{answer.value}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-section>

      <s-modal id="delete-submission-modal" heading="Delete this submission?">
        <s-text>This permanently deletes the response. This cannot be undone.</s-text>
        <s-button
          slot="secondary-actions"
          commandFor="delete-submission-modal"
          command="--hide"
        >
          Cancel
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          onClick={() => submit({ intent: "delete" }, { method: "post" })}
        >
          Delete submission
        </s-button>
      </s-modal>
    </s-page>
  );
}
