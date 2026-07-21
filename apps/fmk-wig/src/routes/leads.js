/** B2B lead pipeline endpoints — proxied to FAOS brain node fmk_wig_internal_engine */

export function handleLeads(req, res, url, body) {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        ok: true,
        brain_node: "fmk_wig_internal_engine",
        endpoint: "/leads",
        note: "Use FAOS /api/apps/fmk-wig for live lead data",
      })
    );
  }

  if (req.method === "POST" && url.pathname === "/leads") {
    let payload = {};
    try {
      payload = JSON.parse(body || "{}");
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    if (!payload.company || !payload.email) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "company and email required" }));
    }
    res.writeHead(201, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        ok: true,
        accepted: true,
        lead: {
          company: payload.company,
          email: payload.email,
          pipeline_stage: "new",
        },
        forward_to: "/api/apps/fmk-wig",
      })
    );
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
