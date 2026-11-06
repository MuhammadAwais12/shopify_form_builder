import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // Change the destination but preserve Shopify query parameters
  url.pathname = "/app";

  return redirect(url.toString());
};

