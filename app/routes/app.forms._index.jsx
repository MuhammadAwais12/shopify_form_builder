import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getPagination, pageRows } from "../lib/pagination.server";

const PAGE_SIZE = 20;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const { page, skip, take } = getPagination(request, PAGE_SIZE);

  const [totalForms, publishedForms, rows] = await Promise.all([
    prisma.form.count({ where: { shop } }),
    prisma.form.count({ where: { shop, status: "published" } }),
    prisma.form.findMany({
      where: { shop },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            fields: { where: { archivedAt: null } },
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const { rows: forms, hasNextPage } = pageRows(rows, PAGE_SIZE);

  return {
    forms,
    page,
    hasNextPage,
    totalForms,
    publishedForms,
    draftForms: totalForms - publishedForms,
  };
}

export default function FormsPage() {
  const { forms, page, hasNextPage, totalForms, publishedForms, draftForms } =
    useLoaderData();

  return (
    <s-page heading="All forms">
      <s-button slot="primary-action" variant="primary" href="/app/create_form">
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
            <s-text>
              {page > 1 ? "No more forms." : "No forms created yet."}
            </s-text>
            <s-button href="/app/create_form" variant="primary">
              Create your first form
            </s-button>
          </s-box>
        ) : (
          <s-stack gap="base">
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

            <s-stack direction="inline" gap="small" justifyContent="end">
              {page > 1 && (
                <s-button href={`/app/forms?page=${page - 1}`}>
                  Previous
                </s-button>
              )}
              {hasNextPage && (
                <s-button href={`/app/forms?page=${page + 1}`}>Next</s-button>
              )}
            </s-stack>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
