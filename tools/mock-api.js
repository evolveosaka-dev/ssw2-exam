// Mock corporate-site API for local testing of index.html before the real
// /api/verify-code and /api/exam-results endpoints exist.
// Usage: node tools/mock-api.js [port]   (default port 8787)
// Then open index.html via a static server with:
//   ?api_base=http://localhost:8787&code=TEST-FIRST
//
// Test codes:
//   TEST-FIRST        -> valid, plan_type="subscription" (FULL/55問), is_first_attempt=true
//   TEST-REPEAT       -> valid, plan_type="one_time" (FULL/55問), is_first_attempt=false
//   TEST-STAFF        -> valid, plan_type="staff" (FULL/55問), is_first_attempt=true
//   TEST-TRIAL-FIRST  -> valid, plan_type="trial" (TRIAL/40問), is_first_attempt=true
//   TEST-TRIAL-REPEAT -> valid:false, reason="exhausted" (trial chỉ có 1 lượt, mô phỏng lượt đã dùng hết)
//   TEST-UNKNOWN-PLAN -> valid, plan_type="beta" (không thuộc whitelist FULL/TRIAL nào -> FE phải chặn ở gate)
//   TEST-EXHAUSTED    -> valid:false, reason="exhausted"
//   TEST-EXPIRED      -> valid:false, reason="expired"
//   TEST-REVOKED      -> valid:false, reason="revoked"
//   anything else     -> valid:false, reason="not_found"

const http = require("node:http");

const PORT = Number(process.argv[2]) || 8787;
const attemptCounts = new Map();

const CODES = {
  "TEST-FIRST": { valid: true, display_name: "テスト 太郎", exam_type: "特定技能2号・外食業", remaining_attempts: 3, expires_at: "2027-01-01T00:00:00Z", plan_type: "subscription", is_first_attempt: true },
  "TEST-REPEAT": { valid: true, display_name: "テスト 花子", exam_type: "特定技能2号・外食業", remaining_attempts: 2, expires_at: "2027-01-01T00:00:00Z", plan_type: "one_time", is_first_attempt: false },
  "TEST-STAFF": { valid: true, display_name: "テスト staff", exam_type: "特定技能2号・外食業", remaining_attempts: 5, expires_at: "2027-01-01T00:00:00Z", plan_type: "staff", is_first_attempt: true },
  "TEST-TRIAL-FIRST": { valid: true, display_name: "テスト 次郎", exam_type: "特定技能2号・外食業", remaining_attempts: 1, expires_at: "2027-01-01T00:00:00Z", plan_type: "trial", is_first_attempt: true },
  "TEST-TRIAL-REPEAT": { valid: false, reason: "exhausted" },
  "TEST-UNKNOWN-PLAN": { valid: true, display_name: "テスト 不明", exam_type: "特定技能2号・外食業", remaining_attempts: 1, expires_at: "2027-01-01T00:00:00Z", plan_type: "beta", is_first_attempt: true },
  "TEST-EXHAUSTED": { valid: false, reason: "exhausted" },
  "TEST-EXPIRED": { valid: false, reason: "expired" },
  "TEST-REVOKED": { valid: false, reason: "revoked" },
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
    if (!access_code) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ valid: false, reason: "invalid_request" }));
      return;
    }
    const info = CODES[access_code] || { valid: false, reason: "not_found" };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(info));
    return;
  }

  if (req.method === "POST" && req.url === "/api/exam-results") {
    const payload = await readJson(req);
    if (!payload.access_code) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accepted: false, reason: "invalid_request" }));
      return;
    }
    const n = (attemptCounts.get(payload.access_code) || 0) + 1;
    attemptCounts.set(payload.access_code, n);
    console.log("exam-results received:", JSON.stringify(payload, null, 2));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ accepted: true, attempt_number: n, remaining_attempts: Math.max(0, 3 - n) }));
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => console.log(`mock-api listening on http://localhost:${PORT}`));
