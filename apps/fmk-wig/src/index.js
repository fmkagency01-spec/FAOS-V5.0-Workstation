/**
 * FMK Wig Internal B2B Engine — root-level Node backend
 * Proxied by FAOS /api/apps/fmk-wig; can run standalone on HARNESS_FMK_WIG_PORT (default 3101).
 */

import http from "http";
import { handleLeads } from "./routes/leads.js";
import { handleCatalog } from "./routes/catalog.js";
import { handleOrders } from "./routes/orders.js";

const PORT = Number(process.env.HARNESS_FMK_WIG_PORT || 3101);

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
          engine: "fmk_wig_internal_engine",
          brain_node: "fmk_wig_internal_engine",
        })
      );
    }
    if (url.pathname.startsWith("/leads")) {
      return handleLeads(req, res, url, body);
    }
    if (url.pathname.startsWith("/catalog")) {
      return handleCatalog(req, res, url);
    }
    if (url.pathname.startsWith("/orders")) {
      return handleOrders(req, res, url);
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Internal error" }));
  }
}

export { handler };

if (process.argv[1]?.includes("index.js")) {
  http.createServer(handler).listen(PORT, () => {
    console.log(`FMK Wig B2B engine listening on :${PORT}`);
  });
}
