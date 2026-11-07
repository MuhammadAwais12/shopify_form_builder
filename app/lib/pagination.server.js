// Reads ?page=N and returns Prisma skip/take. We fetch one extra row so the
// caller can tell whether a next page exists without a separate count query.
export function getPagination(request, pageSize) {
  const raw = Number.parseInt(
    new URL(request.url).searchParams.get("page") ?? "1",
    10,
  );
  const page = Number.isInteger(raw) && raw >= 1 && raw <= 10000 ? raw : 1;
  return { page, skip: (page - 1) * pageSize, take: pageSize + 1 };
}

export function pageRows(rows, pageSize) {
  return { rows: rows.slice(0, pageSize), hasNextPage: rows.length > pageSize };
}
  