import { formatSubmissionValue } from "../utils/form-fields";

const RESEND_URL = "https://api.resend.com/emails";
// Keep this below the app proxy / serverless time limits so a slow provider
// can never hold up the visitor's response for long.
const TIMEOUT_MS = 4000;

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
// Single-line text for headers such as the subject (control characters removed).
const oneLine = (value, max) =>
  Array.from(String(value), (char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127 ? " " : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export function buildNotificationEmail({ form, fields, values, shop, submittedAt }) {
  const rows = fields.map((field) => ({
    label: field.label,
    value: formatSubmissionValue(values[field.id]),
  }));
  const when = submittedAt.toUTCString();

  const text = [
    `New submission for "${form.name}"`,
    `Store: ${shop}`,
    `Received: ${when}`,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
  ].join("\n");

  const htmlRows = rows
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e1e3e5;font-weight:600;vertical-align:top;white-space:nowrap">${escapeHtml(r.label)}</td>` +
        `<td style="padding:8px 12px;border:1px solid #e1e3e5;white-space:pre-wrap">${escapeHtml(r.value)}</td></tr>`,
    )
    .join("");
  const html =
    `<div style="font-family:Arial,sans-serif;color:#202223">` +
    `<h2 style="margin:0 0 4px">New submission: ${escapeHtml(form.name)}</h2>` +
    `<p style="margin:0 0 16px;color:#6d7175">${escapeHtml(shop)} · ${escapeHtml(when)}</p>` +
    `<table style="border-collapse:collapse;width:100%;max-width:640px">${htmlRows}</table></div>`;

  // Lets the merchant answer the customer directly. Only an already-validated
  // email-type answer is used.
  const emailField = fields.find(
    (f) => f.fieldType === "email" && typeof values[f.id] === "string" && values[f.id],
  );

  return {
    subject: `New submission: ${oneLine(form.name, 100)}`,
    text,
    html,
    replyTo: emailField ? values[emailField.id] : null,
  };
}

/**
 * Emails a saved submission to the form's notification address via Resend.
 * Never throws and never blocks saving: the submission must already be stored
 * before this is called, and every failure is only logged.
 */
export async function sendSubmissionNotification({
  form,
  fields,
  values,
  shop,
  submissionId,
}) {
  if (!form.notificationEmail) return { sent: false, reason: "no-recipient" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn(
      "Email notification skipped: RESEND_API_KEY or NOTIFICATION_FROM_EMAIL is not set.",
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const email = buildNotificationEmail({
      form,
      fields,
      values,
      shop,
      submittedAt: new Date(),
    });

    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // A retry of the same submission can never send a second email.
        ...(submissionId ? { "Idempotency-Key": `submission-${submissionId}` } : {}),
      },
      body: JSON.stringify({
        from,
        to: [form.notificationEmail],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      console.error(
        `Notification email rejected (form ${form.id}, status ${response.status}): ${detail}`,
      );
      return { sent: false, reason: "rejected" };
    }
    return { sent: true };
  } catch (error) {
    const reason = error?.name === "TimeoutError" ? "timeout" : error?.message;
    console.error(`Notification email failed (form ${form.id}): ${reason}`);
    return { sent: false, reason: "error" };
  }
}
