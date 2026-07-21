/** Analytics webhook stub — sessions, conversions, top pages */

export function handleAnalytics(req, res, url) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const period = url.searchParams.get("period") || "2026-07";
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      tenant: "rr_wigs",
      period,
      note: "Use FAOS /api/apps/rr-wigs?resource=analytics for live tenant data",
    })
  );
}
