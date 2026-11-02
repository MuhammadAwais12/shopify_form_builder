import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const forms = await prisma.form.findMany({
    where: { shop: session.shop },
    include: {
      _count: {
        select: {
          fields: true,
          submissions: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    forms,
    totalForms: forms.length,
    publishedForms: forms.filter((form) => form.status === "published").length,
    draftForms: forms.filter((form) => form.status === "draft").length,
  };
}

export default function FormsPage() {
  const { forms, totalForms, publishedForms, draftForms } = useLoaderData();

  return (
    <s-page heading="All forms">
      <s-button slot="primary-action" variant="primary" href="/app/forms/new">
        Create form
      </s-button>

      <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="base">
        <s-grid-item>
          <s-box border="base" padding="base" borderRadius="base">
            <s-text color="subdued">Total forms</s-text>
            <s-heading>{totalForms}</s-heading>
          </s-box>
        </s-grid-item>

        <s-grid-item>
          <s-box border="base" padding="base" borderRadius="base">
            <s-text color="subdued">Published</s-text>
            <s-heading>{publishedForms}</s-heading>
          </s-box>
        </s-grid-item>

        <s-grid-item>
          <s-box border="base" padding="base" borderRadius="base">
            <s-text color="subdued">Drafts</s-text>
            <s-heading>{draftForms}</s-heading>
          </s-box>
        </s-grid-item>
      </s-grid>

      <s-section heading="Your forms">
        {forms.length === 0 ? (
          <s-box padding="large">
            <s-text>No forms created yet.</s-text>
            <s-button href="/app/forms/new" variant="primary">
              Create your first form
            </s-button>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Form name</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Fields</s-table-header>
              <s-table-header>Submissions</s-table-header>
              <s-table-header>Action</s-table-header>
            </s-table-header-row>

            <s-table-body>
              {forms.map((form) => (
                <s-table-row key={form.id}>
                  <s-table-cell>
                    <s-text fontWeight="semibold">{form.name}</s-text>
                  </s-table-cell>

                  <s-table-cell>
                    <s-badge
                      tone={form.status === "published" ? "success" : "info"}
                    >
                      {form.status === "published" ? "Published" : "Draft"}
                    </s-badge>
                  </s-table-cell>

                  <s-table-cell>{form._count.fields}</s-table-cell>

                  <s-table-cell>{form._count.submissions}</s-table-cell>

                  <s-table-cell>
                    <s-button href={`/app/forms/${form.id}`}>Edit</s-button>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}
