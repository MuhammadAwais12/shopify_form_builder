import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const submissions = await prisma.submission.findMany({
    where: {
      form: {
        shop: session.shop,
      },
    },
    include: {
      form: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const unreadCount = submissions.filter(
    (submission) => !submission.isRead,
  ).length;

  return {
    submissions,
    totalSubmissions: submissions.length,
    unreadCount,
  };
}

export default function SubmissionsPage() {
  const { submissions, totalSubmissions, unreadCount } = useLoaderData();

  return (
    <s-page heading="Submissions">
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

      <s-section heading="All submissions">
        {submissions.length === 0 ? (
          <s-box padding="large">
            <s-text>No submissions received yet.</s-text>
          </s-box>
        ) : (
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
        )}
      </s-section>
    </s-page>
  );
}
