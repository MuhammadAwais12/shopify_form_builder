import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getPagination, pageRows } from "../lib/pagination.server";

const PAGE_SIZE = 25;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const { page, skip, take } = getPagination(request, PAGE_SIZE);

  // Optional ?form=<id> filter. The shop condition is always applied, so a
  // guessed id from another store simply matches nothing.
  const formId = new URL(request.url).searchParams.get("form");
  const where = { form: { shop, ...(formId ? { id: formId } : {}) } };

  const [filterForm, totalSubmissions, unreadCount, rows] = await Promise.all([
    formId
      ? prisma.form.findFirst({
          where: { id: formId, shop },
          select: { id: true, name: true },
        })
      : null,
    prisma.submission.count({ where }),
    prisma.submission.count({ where: { ...where, isRead: false } }),
    prisma.submission.findMany({
      where,
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        form: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const { rows: submissions, hasNextPage } = pageRows(rows, PAGE_SIZE);

  return {
    submissions,
    page,
    hasNextPage,
    totalSubmissions,
    unreadCount,
    filterForm,
    formId: filterForm ? filterForm.id : null,
  };
}

export default function SubmissionsPage() {
  const {
    submissions,
    page,
    hasNextPage,
    totalSubmissions,
    unreadCount,
    filterForm,
    formId,
  } = useLoaderData();

  const pageHref = (n) =>
    `/app/submissions?page=${n}${formId ? `&form=${formId}` : ""}`;

  return (
    <s-page heading="Submissions">
      {filterForm && (
        <s-banner tone="info">
          Showing submissions for “{filterForm.name}”.{" "}
          <s-link href="/app/submissions">Show all</s-link>
        </s-banner>
      )}
<s-section>
      <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
        <s-grid-item>
          <s-box border="base" padding="base" borderRadius="base">
            <s-text color="subdued">Total submissions</s-text>
            <s-heading>{totalSubmissions}</s-heading>
          </s-box>
        </s-grid-item>

        <s-grid-item>
          <s-box border="base" padding="base" borderRadius="base">
            <s-text color="subdued">Unread submissions</s-text>
            <s-heading>{unreadCount}</s-heading>
          </s-box>
        </s-grid-item>
      </s-grid>
</s-section>
      <s-section heading="All submissions" >
        {submissions.length === 0 ? (
          <s-box padding="large">
            <s-text>
              {page > 1 ? "No more submissions." : "No submissions received yet."}
            </s-text>
          </s-box>
        ) : (
          <s-stack gap="base">
            <s-table>
              <s-table-header-row>
                <s-table-header>Form</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Submitted at</s-table-header>
                <s-table-header>Action</s-table-header>
              </s-table-header-row>

              <s-table-body>
                {submissions.map((submission) => (
                  <s-table-row key={submission.id}>
                    <s-table-cell>{submission.form.name}</s-table-cell>

                    <s-table-cell>
                      <s-badge tone={submission.isRead ? "success" : "attention"}>
                        {submission.isRead ? "Read" : "Unread"}
                      </s-badge>
                    </s-table-cell>

                    <s-table-cell>
                      {new Date(submission.createdAt).toLocaleString()}
                    </s-table-cell>

                    <s-table-cell>
                      <s-button href={`/app/submissions/${submission.id}`}>
                        View
                      </s-button>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            <s-stack direction="inline" gap="small" justifyContent="end">
              {page > 1 && (
                <s-button href={pageHref(page - 1)}>Previous</s-button>
              )}
              {hasNextPage && (
                <s-button href={pageHref(page + 1)}>Next</s-button>
              )}
            </s-stack>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
