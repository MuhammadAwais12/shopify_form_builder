import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import LocalTime from "../components/LocalTime";

// Must match blocks/<handle>.liquid in the theme app extension.
const FORM_BLOCK_HANDLE = "form-embed";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const [
    totalForms,
    publishedForms,
    totalSubmissions,
    unreadSubmissions,
    recentForms,
    recentSubmissions,
    latestDraft,
  ] = await Promise.all([
    prisma.form.count({ where: { shop } }),
    prisma.form.count({ where: { shop, status: "published" } }),
    prisma.submission.count({ where: { form: { shop } } }),
    prisma.submission.count({ where: { form: { shop }, isRead: false } }),
    prisma.form.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.submission.findMany({
      where: { form: { shop } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        form: { select: { name: true } },
      },
    }),
    prisma.form.findFirst({
      where: { shop, status: "draft" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
  ]);

  // Without an API key the deep link would be broken, so the UI hides it.
  const apiKey = process.env.SHOPIFY_API_KEY;
  const themeEditorUrl = apiKey
    ? `https://${shop}/admin/themes/current/editor?context=apps&template=index` +
      `&addAppBlockId=${apiKey}/${FORM_BLOCK_HANDLE}&target=newAppsSection`
    : null;

  return {
    totalForms,
    publishedForms,
    totalSubmissions,
    unreadSubmissions,
    themeEditorUrl,
    latestDraftId: latestDraft?.id ?? null,
    forms: recentForms.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      status: f.status,
      submissionCount: f._count.submissions,
    })),
    submissions: recentSubmissions.map((s) => ({
      id: s.id,
      isRead: s.isRead,
      createdAt: s.createdAt,
      formName: s.form.name,
    })),
  };
};

export default function Index() {
  const {
    totalForms,
    publishedForms,
    totalSubmissions,
    unreadSubmissions,
    themeEditorUrl,
    latestDraftId,
    forms,
    submissions,
  } = useLoaderData();

  const hasForms = totalForms > 0;
  const hasPublished = publishedForms > 0;
  // Submissions only arrive through the storefront, so one existing is the
  // only reliable sign (without theme API access) that the form is live.
  const hasSubmissions = totalSubmissions > 0;
  const completed = [hasForms, hasPublished, hasSubmissions].filter(
    Boolean,
  ).length;

  return (
    <s-page heading="Form Builder" background="gray-100">
      <s-button
        slot="primary-action"
        variant="primary"
        icon="plus"
        href="/app/create_form"
      >
        Create form
      </s-button>
      <s-button slot="secondary-actions" href="/app/submissions">
        View submissions
      </s-button>

      {unreadSubmissions > 0 && (
        <s-banner
          tone="info"
          heading={`You have ${plural(unreadSubmissions, "unread submission", "unread submissions")}`}
        >
          <s-link href="/app/submissions">Review submissions</s-link>
        </s-banner>
      )}

      {!hasForms && (
        <s-section>
          <s-stack gap="base" alignItems="center">
            <s-icon type="forms" size="large" color="subdued" />
            <s-heading>Create your first form</s-heading>
            <s-paragraph>
              Build a contact, feedback or sign-up form, then show it on your
              storefront in a few clicks.
            </s-paragraph>
            <s-button variant="primary" href="/app/create_form">
              Create form
            </s-button>
          </s-stack>
        </s-section>
      )}

      {completed < 3 && (
        <s-section heading="Set up your first form">
          <s-stack gap="base">
            <s-stack gap="small-300">
              <s-text color="subdued">{completed} of 3 steps completed</s-text>
              <s-progress
                value={completed}
                max={3}
                accessibilityLabel="Setup progress"
              />
            </s-stack>

            <Step
              done={hasForms}
              title="Create a form"
              description="Add fields and choose the button text and success message."
              action={
                !hasForms && (
                  <s-button href="/app/create_form">Create form</s-button>
                )
              }
            />
            <s-divider />
            <Step
              done={hasPublished}
              title="Publish it"
              description={
                hasForms
                  ? "Set the status to Active so it can appear on your store."
                  : "Create a form first."
              }
              action={
                hasForms &&
                !hasPublished &&
                latestDraftId && (
                  <s-button href={`/app/forms/${latestDraftId}`}>
                    Open draft
                  </s-button>
                )
              }
            />
            <s-divider />
            <Step
              done={hasSubmissions}
              title="Add it to your storefront"
              description="In the theme editor, add the Form block and enter your form's handle (shown in the list below). This step completes when your first response arrives."
              action={
                !hasSubmissions &&
                hasPublished &&
                themeEditorUrl && (
                  <s-button
                    icon="theme-edit"
                    href={themeEditorUrl}
                    target="_blank"
                  >
                    Open theme editor
                  </s-button>
                )
              }
            />
          </s-stack>
        </s-section>
      )}

      {hasForms && (
        <>
          <s-query-container>
            <s-grid
              gridTemplateColumns="@container (inline-size > 400px) 1fr 1fr, 1fr"
              gap="base"
            >
              <s-grid-item>
                <StatCard
                  icon="forms"
                  label="Forms"
                  value={totalForms}
                  href="/app/forms"
                />
              </s-grid-item>

              <s-grid-item>
                <StatCard
                  icon="live"
                  label="Active"
                  value={publishedForms}
                  href="/app/forms"
                />
              </s-grid-item>

              <s-grid-item>
                <StatCard
                  icon="email"
                  label="Submissions"
                  value={totalSubmissions}
                  href="/app/submissions"
                />
              </s-grid-item>

              <s-grid-item>
                <StatCard
                  icon="notification"
                  label="Unread"
                  value={unreadSubmissions}
                  href="/app/submissions"
                  highlight={unreadSubmissions > 0}
                />
              </s-grid-item>
            </s-grid>
          </s-query-container>

          <s-section paddingBlockStart="large">
            <s-stack>
              <s-stack
                direction="inline"
                justifyContent="space-between"
                alignItems="center"
                gap="base"
              >
                <s-heading>Your forms</s-heading>
                <s-link href="/app/forms">View all</s-link>
              </s-stack>

              <s-stack gap="base">
                {forms.map((form, index) => (
                  <s-stack key={form.id} gap="base">
                    {index > 0 && <s-divider />}
                    <FormRow form={form} />
                  </s-stack>
                ))}
              </s-stack>
            </s-stack>
          </s-section>
          <s-section>
            <s-stack gap="base">
              <s-stack
                direction="inline"
                justifyContent="space-between"
                alignItems="center"
              >
                <s-heading>Recent submissions</s-heading>
                <s-link href="/app/submissions">View all</s-link>
              </s-stack>
              {submissions.length === 0 ? (
                <s-text color="subdued">
                  No submissions yet. Once your form is live on the storefront,
                  responses will appear here.
                </s-text>
              ) : (
                submissions.map((submission, index) => (
                  <s-stack key={submission.id} gap="base">
                    {index > 0 && <s-divider />}
                    <SubmissionRow submission={submission} />
                  </s-stack>
                ))
              )}
            </s-stack>
          </s-section>
        </>
      )}
    </s-page>
  );
}

function StatCard({ icon, label, value, href, highlight }) {
  return (
    <s-section>
      <s-stack gap="small-300">
        <s-stack direction="inline" alignItems="center" gap="small-300">
          <s-icon type={icon} color="subdued" />
          <s-text color="subdued">{label}</s-text>
        </s-stack>
        <s-heading>{value}</s-heading>
        {highlight ? (
          <s-link href={href}>Review now</s-link>
        ) : (
          <s-link href={href}>View</s-link>
        )}
      </s-stack>
    </s-section>
  );
}

function FormRow({ form }) {
  const isPublished = form.status === "published";
  const menuId = `form-menu-${form.id}`;

  return (
    <s-stack
      direction="inline"
      justifyContent="space-between"
      alignItems="center"
      gap="base"
    >
      <s-stack direction="inline" alignItems="center" gap="base">
        <s-icon type="forms" color="subdued" />
        <s-stack gap="small-300">
          <s-link href={`/app/forms/${form.id}`}>{form.name}</s-link>
          <s-text color="subdued">
            {plural(form.submissionCount, "submission", "submissions")}
          </s-text>
          <CopyHandle form={form} />
        </s-stack>
      </s-stack>

      <s-stack direction="inline" alignItems="center" gap="small-300">
        <s-badge tone={isPublished ? "success" : "neutral"}>
          {isPublished ? "Active" : "Draft"}
        </s-badge>
        <s-button
          icon="menu-horizontal"
          variant="tertiary"
          accessibilityLabel={`More actions for ${form.name}`}
          commandFor={menuId}
        />
        <s-menu id={menuId} accessibilityLabel={`Actions for ${form.name}`}>
          <s-button icon="edit" href={`/app/forms/${form.id}`}>
            Edit form
          </s-button>
          <s-button icon="email" href={`/app/submissions?form=${form.id}`}>
            View submissions
          </s-button>
        </s-menu>
      </s-stack>
    </s-stack>
  );
}

// The handle is what merchants type into the theme editor's Form block.
function CopyHandle({ form }) {
  const shopify = useAppBridge();

  async function copy() {
    try {
      await navigator.clipboard.writeText(form.slug);
      shopify.toast.show("Handle copied");
    } catch {
      shopify.toast.show(
        "Could not copy. Select the handle and copy it manually.",
        {
          isError: true,
        },
      );
    }
  }

  return (
    <s-stack direction="inline" alignItems="center" gap="small-300">
      <s-text color="subdued">Handle: {form.slug}</s-text>
      <s-button
        variant="tertiary"
        icon="clipboard"
        accessibilityLabel={`Copy handle for ${form.name}`}
        onClick={copy}
      />
    </s-stack>
  );
}

function SubmissionRow({ submission }) {
  return (
    <s-stack
      direction="inline"
      justifyContent="space-between"
      alignItems="center"
      gap="base"
    >
      <s-stack gap="small-300">
        <s-link href={`/app/submissions/${submission.id}`}>
          {submission.formName}
        </s-link>
        <s-text color="subdued">
          <LocalTime value={submission.createdAt} />
        </s-text>
      </s-stack>
      <s-badge tone={submission.isRead ? "neutral" : "info"}>
        {submission.isRead ? "Read" : "Unread"}
      </s-badge>
    </s-stack>
  );
}

function Step({ done, title, description, action }) {
  return (
    <s-stack direction="inline" gap="base" alignItems="start">
      <s-icon
        type={done ? "check-circle-filled" : "circle-dashed"}
        tone={done ? "success" : "neutral"}
      />
      <s-stack gap="small-300">
        <s-text type="strong">{title}</s-text>
        <s-text color="subdued">{description}</s-text>
        {action}
      </s-stack>
    </s-stack>
  );
}
