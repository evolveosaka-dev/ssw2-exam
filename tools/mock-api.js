// Mock corporate-site API for local testing of index.html before the real
// /api/verify-code and /api/exam-results endpoints exist.
// Usage: node tools/mock-api.js [port]   (default port 8787)
// Then open index.html via a static server with:
//   ?api_base=http://localhost:8787&code=TEST-FIRST
//
// Test codes:
//   TEST-FIRST    -> valid, is_first_attempt=true
//   TEST-REPEAT   -> valid, is_first_attempt=false
//   TEST-NOATTEMPTS -> valid but attempts_remaining=0 (blocks on gate)
//   anything else -> invalid code (400)

const http = require("node:http");

const PORT = Number(process.argv[2]) || 8787;
const attemptCounts = new Map();

const CODES = {
  "TEST-FIRST": { display_name: "テスト 太郎", exam_type: "gaishoku_tokutei2", attempts_remaining: 3, expires_at: "2027-01-01T00:00:00Z", plan_type: "standard", is_first_attempt: true },
  "TEST-REPEAT": { display_name: "テスト 花子", exam_type: "gaishoku_tokutei2", attempts_remaining: 2, expires_at: "2027-01-01T00:00:00Z", plan_type: "standard", is_first_attempt: false },
  "TEST-NOATTEMPTS": { display_name: "テスト 次郎", exam_type: "gaishoku_tokutei2", attempts_remaining: 0, expires_at: "2027-01-01T00:00:00Z", plan_type: "standard", is_first_attempt: false },
};

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  withCors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST" && req.url === "/api/verify-code") {
    const { access_code } = await readJson(req);
    const info = CODES[access_code];
    if (!info) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_code" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(info));
    return;
  }

  if (req.method === "POST" && req.url === "/api/exam-results") {
    const payload = await readJson(req);
    const n = (attemptCounts.get(payload.access_code) || 0) + 1;
    attemptCounts.set(payload.access_code, n);
    console.log("exam-results received:", JSON.stringify(payload, null, 2));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, attempt_number: n }));
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => console.log(`mock-api listening on http://localhost:${PORT}`));
