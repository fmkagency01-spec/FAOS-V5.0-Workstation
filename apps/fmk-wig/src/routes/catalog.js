/** Export/import catalog endpoints */

export function handleCatalog(req, res, url) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const type = url.searchParams.get("type") || "export";
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      brain_node: "fmk_wig_internal_engine",
      catalog_type: type,
      note: "Use FAOS /api/apps/fmk-wig?resource=catalog for live catalog",
    })
  );
}
