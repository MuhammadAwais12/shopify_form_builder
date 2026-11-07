import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// GET /apps/forms/api/form?slug=<handle>  (through the app proxy)
export async function loader({ request }) {
  await authenticate.public.appProxy(request); // throws if the signature is invalid

  // `shop` is part of the signed query string, so it can be trusted after the check above.
  const params = new URL(request.url).searchParams;
  const shop = params.get("shop");
  const slug = params.get("slug");
  if (!shop || !slug) return data({ error: "Not found" }, { status: 404 });

  const form = await prisma.form.findFirst({
    where: { shop, slug, status: "published" },
    include: {
      fields: { where: { archivedAt: null }, orderBy: { position: "asc" } },
    },
  });
  if (!form) return data({ error: "Not found" }, { status: 404 });

  return data({
    name: form.name,
    submitButtonText: form.submitButtonText,
    successMessage: form.successMessage,
    fields: form.fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      placeholder: f.placeholder,
      options: Array.isArray(f.options) ? f.options : [],
    })),
  });
}