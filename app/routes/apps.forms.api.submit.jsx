import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { parseSubmission } from "../lib/submissions.server";

const MAX_BODY_BYTES = 50_000;
const MAX_PER_MINUTE = 30; // per form

// POST /apps/forms/api/submit  (through the app proxy)
export async function action({ request }) {
  if (request.method !== "POST") {
    return data({ ok: false, error: "Method not allowed." }, { status: 405 });
  }
  await authenticate.public.appProxy(request); // throws if the signature is invalid
  const shop = new URL(request.url).searchParams.get("shop");
  if (!shop) return data({ ok: false, error: "Not found." }, { status: 404 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return data({ ok: false, error: "Request too large." }, { status: 413 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return data({ ok: false, error: "Request too large." }, { status: 413 });
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return data({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || typeof body.slug !== "string") {
    return data({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real visitors never fill this. Pretend success, save nothing.
  if (typeof body.website === "string" && body.website !== "") {
    return data({ ok: true });
  }

  const form = await prisma.form.findFirst({
    where: { shop, slug: body.slug, status: "published" },
    include: { fields: { where: { archivedAt: null }, orderBy: { position: "asc" } } },
  });
  if (!form) return data({ ok: false, error: "Form not found." }, { status: 404 });

  const recent = await prisma.submission.count({
    where: { formId: form.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MAX_PER_MINUTE) {
    return data(
      { ok: false, error: "Too many submissions. Please try again shortly." },
      { status: 429 },
    );
  }

  const parsed = parseSubmission(form.fields, body.values);
  if (parsed.errors) {
    return data({ ok: false, errors: parsed.errors }, { status: 400 });
  }

  try {
    await prisma.submission.create({ data: { formId: form.id, data: parsed.data } });
  } catch (error) {
    console.error("Create submission failed:", error);
    return data({ ok: false, error: "Could not save your response." }, { status: 500 });
  }

  return data({ ok: true });
}
