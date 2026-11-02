import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Must match blocks/<handle>.liquid in your theme app extension (Step 5).
const FORM_BLOCK_HANDLE = "form-embed";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const [totalForms, totalSubmissions, unreadSubmissions, recentForms] =
    await Promise.all([
      prisma.form.count({ where: { shop } }),
      prisma.submission.count({ where: { form: { shop } } }),
      prisma.submission.count({ where: { form: { shop }, isRead: false } }),
      prisma.form.findMany({
        where: { shop },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { submissions: true } },
        },
      }),
    ]);

  const themeEditorUrl =
    `https://${shop}/admin/themes/current/editor?context=apps&template=index` +
    `&addAppBlockId=${process.env.SHOPIFY_API_KEY}/${FORM_BLOCK_HANDLE}` +
    `&target=newAppsSection`;

  return {
    totalForms,
    totalSubmissions,
    unreadSubmissions,
    themeEditorUrl,
    forms: recentForms.map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      submissionCount: f._count.submissions,
    })),
  };
};

export default function Index() {
  const {
    totalForms,
    totalSubmissions,
    unreadSubmissions,
    forms,
    themeEditorUrl,
  } = useLoaderData();

  const hasForms = totalForms > 0;
  // Submissions only arrive through the storefront, so one existing means it is live.
  const storefrontLive = totalSubmissions > 0;

  return (
    <s-page heading="Form Builder">
      {/* <s-box padding="base" background="subdued" gap="base">
        Contact form
      </s-box> */}
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

      <s-section heading="Welcome to Form Builder">
        <s-paragraph>
          Create custom forms for your Shopify store in minutes.
        </s-paragraph>
      </s-section>

      {hasForms ? (
        <>
          <s-query-container>
            <s-grid
              gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr"
              gap="base"
            >
              <s-grid-item>
                <StatCard
                  icon="forms"
                  label="Total forms"
                  value={totalForms}
                  caption="Forms created"
                />
              </s-grid-item>
              <s-grid-item>
                <StatCard
                  icon="email"
                  label="Total submissions"
                  value={totalSubmissions}
                  caption="Responses received"
                  badge={
                    unreadSubmissions > 0 ? `${unreadSubmissions} unread` : null
                  }
                />
              </s-grid-item>
            </s-grid>
          </s-query-container>

          <s-section>
            <s-stack gap="base">
              <s-stack
                direction="inline"
                justifyContent="space-between"
                alignItems="center"
              >
                <s-heading>Your forms</s-heading>
                <s-link href="/app/forms">View all</s-link>
              </s-stack>
              {forms.map((form, index) => (
                <s-stack key={form.id} gap="base">
                  {index > 0 && <s-divider />}
                  <FormRow form={form} />
                </s-stack>
              ))}
            </s-stack>
          </s-section>
        </>
      ) : (
        <s-section>
          <s-stack gap="base" alignItems="center">
            <s-heading>Create your first form</s-heading>
            <s-paragraph>
              Build a form, then show it on your storefront.
            </s-paragraph>
            <s-button variant="primary" href="/app/create_form">
              Create form
            </s-button>
          </s-stack>
        </s-section>
      )}

      <s-section heading="Getting started">
        <s-stack gap="base">
          <Step
            done={hasForms}
            title="Create your first form"
            description="Add fields and customize the form."
          />
          <Step
            done={storefrontLive}
            title="Add it to your storefront"
            description="Display your form using a theme app block."
            action={
              !storefrontLive && (
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
    </s-page>
  );
}

function StatCard({ icon, label, value, caption, badge }) {
  return (
    <s-section>
      <s-stack gap="small-300">
        <s-stack direction="inline" alignItems="center" gap="small-300">
          <s-icon type={icon} color="subdued" />
          <s-text color="subdued">{label}</s-text>
          {badge && <s-badge tone="info">{badge}</s-badge>}
        </s-stack>
        <s-heading>{value}</s-heading>
        <s-text color="subdued">{caption}</s-text>
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
