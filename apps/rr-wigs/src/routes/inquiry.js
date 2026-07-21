/**
 * RR Wigs B2B inquiry API — accepts wholesale/OEM lead forms
 * Forwarded to FAOS /api/apps/rr-wigs/inquiry for tenant storage
 */

export function handleInquiry(req, res, body) {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        ok: true,
        endpoint: "/api/inquiry",
        method: "POST",
        fields: ["company", "contact_email", "message", "source"],
        tenant: "rr_wigs",
      })
    );
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  let payload = {};
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON" }));
  }

  if (!payload.company || !payload.contact_email) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "company and contact_email required" }));
  }

  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      accepted: true,
      inquiry: {
        company: payload.company,
        contact_email: payload.contact_email,
        source: payload.source || "rr_wigs_web",
      },
      forward_to: "/api/apps/rr-wigs/inquiry",
    })
  );
}
