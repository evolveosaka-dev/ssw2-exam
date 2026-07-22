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
//   TEST-TRIAL-FIRST  -> valid, plan_type="trial" (TRIAL/20問固定), is_first_attempt=true
//   TEST-TRIAL-REPEAT -> valid:false, reason="exhausted" (trial chỉ có 1 lượt, mô phỏng lượt đã dùng hết)
//   TEST-UNKNOWN-PLAN -> valid, plan_type="beta" (không thuộc whitelist FULL/TRIAL nào -> FE phải chặn ở gate)
//   TEST-EXHAUSTED    -> valid:false, reason="exhausted"
//   TEST-EXPIRED      -> valid:false, reason="expired"
//   TEST-REVOKED      -> valid:false, reason="revoked"
//   TEST-FLAKY        -> valid, plan_type="subscription" — POST /api/exam-results trả 500
//                        cho 2 lần thử đầu (mỗi access_code), thành công ở lần thứ 3.
//                        Dùng để test retry-with-backoff phía client.
//   TEST-ALWAYS-DOWN  -> valid, plan_type="subscription" — POST /api/exam-results luôn trả 500.
//                        Dùng để test "hết lượt retry -> giữ localStorage + gọi report-failure".
//   TEST-BAD-RESPONSE -> valid, plan_type="subscription" — POST /api/exam-results luôn trả 404
//                        với body không phải JSON (mô phỏng api_base sai/WAF chặn). Dùng để test
//                        "fail fast, không đợi hết 3 lần retry" (NonRetryableSubmitError).
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
  "TEST-FLAKY": { valid: true, display_name: "テスト 不安定", exam_type: "特定技能2号・外食業", remaining_attempts: 3, expires_at: "2027-01-01T00:00:00Z", plan_type: "subscription", is_first_attempt: true },
  "TEST-ALWAYS-DOWN": { valid: true, display_name: "テスト 応答なし", exam_type: "特定技能2号・外食業", remaining_attempts: 3, expires_at: "2027-01-01T00:00:00Z", plan_type: "subscription", is_first_attempt: true },
  "TEST-BAD-RESPONSE": { valid: true, display_name: "テスト 不正応答", exam_type: "特定技能2号・外食業", remaining_attempts: 3, expires_at: "2027-01-01T00:00:00Z", plan_type: "subscription", is_first_attempt: true },
};

// (access_code, client_submission_id) -> attempt_number, để mô phỏng dedup
// idempotent phía server thật (submit_exam_result RPC): resend cùng
// client_submission_id phải trả về cùng attempt_number, không tăng thêm.
const submissionsBySubmissionId = new Map();
// access_code -> số lần POST /api/exam-results đã nhận (kể cả các lần fail
// giả lập của TEST-FLAKY), dùng để biết khi nào ngừng trả 500.
const examResultCallCounts = new Map();

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

    const callNumber = (examResultCallCounts.get(payload.access_code) || 0) + 1;
    examResultCallCounts.set(payload.access_code, callNumber);

    if (payload.access_code === "TEST-ALWAYS-DOWN" || (payload.access_code === "TEST-FLAKY" && callNumber <= 2)) {
      console.log(`exam-results simulated 500 (call #${callNumber}):`, payload.access_code);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accepted: false, reason: "simulated_server_error" }));
      return;
    }

    if (payload.access_code === "TEST-BAD-RESPONSE") {
      console.log(`exam-results simulated non-JSON 404 (call #${callNumber})`);
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<html><body>Not Found</body></html>");
      return;
    }

    // Idempotent replay: cùng client_submission_id -> trả lại đúng
    // attempt_number cũ, không tăng thêm (mô phỏng submit_exam_result RPC thật).
    const dedupKey = payload.client_submission_id
      ? `${payload.access_code}|${payload.client_submission_id}`
      : null;
    if (dedupKey && submissionsBySubmissionId.has(dedupKey)) {
      const n = submissionsBySubmissionId.get(dedupKey);
      console.log("exam-results idempotent replay, attempt_number unchanged:", n);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ accepted: true, attempt_number: n, remaining_attempts: Math.max(0, 3 - n) }));
      return;
    }

    const n = (attemptCounts.get(payload.access_code) || 0) + 1;
    attemptCounts.set(payload.access_code, n);
    if (dedupKey) submissionsBySubmissionId.set(dedupKey, n);
    console.log("exam-results received:", JSON.stringify(payload, null, 2));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ accepted: true, attempt_number: n, remaining_attempts: Math.max(0, 3 - n) }));
    return;
  }

  if (req.method === "POST" && req.url === "/api/exam-results/report-failure") {
    const payload = await readJson(req).catch(() => ({}));
    console.log("exam-results/report-failure (client gave up retrying):", JSON.stringify(payload));
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => console.log(`mock-api listening on http://localhost:${PORT}`));
