/**
 * RR Wigs Client Web Engine — isolated tenant Node backend
 * B2B inquiry API · analytics webhooks · factory media hooks
 */

import http from "http";
import { handleInquiry } from "./routes/inquiry.js";
import { handleAnalytics } from "./routes/analytics.js";

const PORT = Number(process.env.HARNESS_RR_WIGS_PORT || 3102);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-FAOS-Tenant");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const body = req.method === "POST" ? await readBody(req) : "";

  try {
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          ok: true,
          tenant: "rr_wigs",
          brain_node: "rr_wigs_client_workspace",
        })
      );
    }
    if (url.pathname === "/api/inquiry" || url.pathname === "/inquiry") {
      return handleInquiry(req, res, body);
    }
    if (url.pathname === "/api/analytics" || url.pathname === "/analytics") {
      return handleAnalytics(req, res, url);
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Internal error" }));
  }
}

export { handler };

if (process.argv[1]?.includes("server.js")) {
  http.createServer(handler).listen(PORT, () => {
    console.log(`RR Wigs client engine listening on :${PORT}`);
  });
}
