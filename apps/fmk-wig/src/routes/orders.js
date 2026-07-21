/** Global salon order endpoints */

export function handleOrders(req, res, url) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const status = url.searchParams.get("status") || "all";
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      brain_node: "fmk_wig_internal_engine",
      filter_status: status,
      note: "Use FAOS /api/apps/fmk-wig?resource=orders for live orders",
    })
  );
}
