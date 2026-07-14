# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULE #1 — KHÔNG được đụng vào logic ra đề và logic chấm điểm

**TUYỆT ĐỐI KHÔNG thay đổi hành vi của hai khối logic sau, trừ khi người dùng yêu cầu tường minh và rõ ràng bằng lời:**

1. **Logic ra đề** — hàm `buildExam()` trong `index.html`.
   - Cách chọn số câu mỗi `sect`/`part` theo `BLUEPRINT`, cơ chế fallback khi thiếu câu (`extra`), cách `shuffle()` thứ tự 4 đáp án và remap lại `answer`/`why_wrong` index — giữ nguyên y hệt.
2. **Logic chấm điểm** — hàm `finishExam()` trong `index.html`.
   - Cách tính `sectScore`, `total`, `maxTotal`, so sánh với `PASS_MARK` để ra `passed` — giữ nguyên y hệt.
   - `BLUEPRINT`, `PASS_MARK`, `TOTAL_MARK`, `EXAM_MINUTES` là dữ liệu **theo ngành/bậc**, nạp lúc runtime từ `data/manifest.json` (xem mục Kiến trúc) — không hardcode lại thành hằng số cố định trong code.

**Ngoại lệ duy nhất đã được duyệt và đã đóng (không còn treo, không cần hỏi lại):** `buildExam()` có thêm đúng 1 field pass-through `qid: q.qid` khi dựng object câu hỏi output — để `sendResult()` có thể tham chiếu id gốc ổn định trong ngân hàng đề. Không đụng vào lựa chọn câu, thuật toán shuffle, hay remap `answer`/`why_wrong`.

Mọi thay đổi khác (UI, màn hình gate/survey, nguồn dữ liệu câu hỏi, endpoint/định dạng gửi kết quả, thêm ngành mới...) đều được phép, **miễn là không chạm vào hai vùng trên**. Nếu một thay đổi bắt buộc phải sửa thêm vào `buildExam`/`finishExam` ngoài ngoại lệ đã đóng ở trên, phải dừng lại và hỏi lại người dùng trước khi sửa, không tự ý suy diễn.

## Tổng quan dự án

Site thi thử kỹ năng đặc định (特定技能) cho lao động nước ngoài tại Nhật, chạy tĩnh trên GitHub Pages, không có backend riêng trong repo này. Dự kiến mở rộng cho 11 ngành × 2 bậc (特定技能1号/2号); hiện tại chỉ có ngành ẩm thực/外食業 bậc 2号 (327 câu) làm **mẫu/template** cho các ngành sau. Xác thực và ghi nhận kết quả thi qua API của một hệ thống corporate-site riêng (xem mục API contract).

## Lệnh thường dùng

Không có build step, không có package.json cho app, không có test suite tự động. `index.html` là app shell duy nhất (không build), dữ liệu đề nằm trong `data/`.

- **Chạy thử local**: serve thư mục gốc qua static server bất kỳ (vd. `npx serve .`), vì `fetch()` tới `data/manifest.json`/API cần http(s), không chạy được qua `file://`.
- **Test trước khi có API thật của corporate-site**: chạy `node tools/mock-api.js [port]` (mặc định 8787, không cần cài dependency), rồi mở app kèm query param override: `?api_base=http://localhost:8787&code=TEST-FIRST`. Các mã test có sẵn trong `tools/mock-api.js`: `TEST-FIRST` (lần đầu), `TEST-REPEAT` (lần sau), `TEST-EXHAUSTED`/`TEST-EXPIRED`/`TEST-REVOKED` (các trường hợp `valid:false`), bất kỳ mã khác → `reason:"not_found"`.
- `?code=` tự điền access code vào màn gate; `?data_base=`/`?api_base=` override nguồn data/API khi test local (mặc định `data_base="."`, `API_BASE` mặc định là domain production thật của corporate-site).
- **Deploy**: push lên nhánh mà GitHub Pages đang trỏ tới — không có CI/build pipeline.
- Không có linter/formatter được cấu hình trong repo.

## Kiến trúc

App shell là **một file `index.html`** (React 18 UMD + Babel standalone qua CDN, `<script type="text/babel">`, không bundler). Ngân hàng đề và cấu hình theo ngành/bậc nằm ngoài `index.html`, trong thư mục `data/`, nạp qua `fetch()` lúc runtime.

### `data/` — ngân hàng đề theo ngành/bậc

```
data/
  manifest.json              # exam_type -> {industry, industryLabel, tier, tierLabel, file, examMinutes, passMark, totalMark}
  gaishoku-tokutei2.json     # {blueprint, sectLabels, questions}  — ngành mẫu (外食業/特定技能2号, 327 câu)
```

- Key trong `manifest.json` là chuỗi `exam_type` mà API `/api/verify-code` trả về — phải khớp chính xác với giá trị thật từ corporate-site.
- Mỗi file dữ liệu ngành đóng gói `blueprint` (số câu + điểm/câu mỗi sect×part), `sectLabels` (nhãn hiển thị + dùng làm `topic` khi gửi kết quả), và `questions` (mỗi câu có `qid` ổn định + schema gốc: `sect, part, q, options, answer, explain, why_wrong, img?`).
- **Thêm ngành mới**: chỉ cần thêm 1 entry vào `manifest.json` + 1 file JSON cùng shape — không cần sửa `index.html`.

### Nạp dữ liệu runtime

`loadExamData(examType)` (đầu file JS trong `index.html`) fetch `manifest.json` rồi fetch file ngành tương ứng, gán vào các biến module-level `QUESTION_BANK`, `BLUEPRINT`, `SECT_LABEL`, `PASS_MARK`, `TOTAL_MARK`, `EXAM_MINUTES`, `EXAM_LABEL`. `buildExam()`/`finishExam()` đọc các biến này y hệt cách chúng hardcode trước đây — không phụ thuộc vào cách chúng được nạp.

### Chế độ FULL / TRIAL (`examMode`, từ `plan_type`)

Sau `loadExamData()`, `verifyCode()` phân loại `plan_type` bằng whitelist tường minh:
- `FULL_PLAN_TYPES = ["staff","one_time","subscription"]` → `examMode="full"`, hành vi **y hệt trước khi có trial** — 55 câu, `PASS_MARK`/`TOTAL_MARK`/`EXAM_MINUTES` từ `manifest.json`, màn kết quả có đậu/rớt.
- `TRIAL_PLAN_TYPES = ["trial"]` → `examMode="trial"`.
- `plan_type` không thuộc 2 nhóm trên → chặn ngay ở gate, message "不明なプランです。運営にお問い合わせください。" (không đoán mò, không coi là full).

Khi `examMode==="trial"`, ngay sau `loadExamData()` (vẫn trước khi gọi `buildExam()`), giá trị gốc được chụp lại vào `REAL_BLUEPRINT`/`REAL_PASS_MARK`/`REAL_TOTAL_MARK`, sau đó `BLUEPRINT`/`TOTAL_MARK`/`PASS_MARK`/`EXAM_MINUTES` bị **ghi đè** thành bản trial (`deriveTrialBlueprint()`: mỗi sect ở mỗi part cố định `n=5, per=1` → 40 câu; `PASS_MARK=null`; `EXAM_MINUTES=30`). Đây là tham số hóa đầu vào, giống hệt cách `loadExamData()` đổi ngành — **`buildExam()`/`finishExam()` không có dòng nào biết tới `examMode`**, chỉ đọc lại đúng các biến module-level như cũ.

Màn kết quả trial không dùng `result.sectScore`/`result.passed` (bỏ hẳn đậu/rớt). Bảng "8 hạng mục" (2 part × 4 sect) được tính bằng hàm riêng `trialBreakdown(questions, answers)` — đọc lại state đã có, độc lập hoàn toàn với `finishExam()`. Khối "本番の試験構成" trên màn kết quả trial luôn lấy số liệu từ `REAL_BLUEPRINT`/`REAL_PASS_MARK`/`REAL_TOTAL_MARK` (55問/250点/163点), không bao giờ bị ảnh hưởng bởi việc `BLUEPRINT` đã bị ghi đè.

### Flow thi (component `App`, state machine qua `screen`)

`gate → survey (nếu is_first_attempt) → start → quiz → result`:

1. **gate**: nhập access code (tự điền từ `?code=`), gọi `POST /api/verify-code`. Chặn lại nếu `valid:false` (hiện message theo `reason`), thiếu `exam_type`, hoặc `plan_type` không thuộc whitelist FULL/TRIAL nào (xem mục "Chế độ FULL / TRIAL"). Thành công → `loadExamData(exam_type)` → set `examMode` → chuyển `survey` hoặc `start` tùy `is_first_attempt`.
2. **survey** (chỉ hiện lần đầu, có thể bỏ qua): 3 dropdown — 年代 (`AGE_RANGES`), 国籍 (`NATIONALITIES`), お住まい (`PREFECTURES`, 47 都道府県 + 海外) — cộng checkbox opt-in mặc định tắt. Bỏ qua → không gửi field `survey` trong kết quả. Giống nhau ở cả 2 `examMode`.
3. **start**: chỉ hiển thị `display_name` (từ verify-code, không cho sửa) — không còn ô nhập nào (email đã bị loại bỏ, xem mục API contract). `startExam()` gọi `buildExam()` ngay, không cần validate gì thêm.
4. **quiz**: đếm ngược `EXAM_MINUTES` phút (30 phút nếu trial, 70 phút nếu full), tự nộp khi hết giờ; lưu lựa chọn vào `answers` theo `q.id`.
5. `finishExam()`: chấm điểm, tạo `result`, chuyển **result**, gọi `sendResult(res)`. Không phân biệt `examMode` bên trong hàm này.
6. **result**: nếu `examMode==="full"` — điểm theo sect, đậu/rớt, đúng/sai từng câu kèm giải thích, `attempt_number`/`remaining_attempts` từ response exam-results, y hệt trước khi có trial. Nếu `examMode==="trial"` — bảng tỉ lệ đúng 8 hạng mục (tô màu theo ngưỡng <60%/60-79%/≥80%), không có đậu/rớt, khối tĩnh giới thiệu cấu trúc đề thật + disclaimer, nút "有料プランで対策する" (URL placeholder, sẽ nối ở Phase 5); phần "解説" (đáp án đúng + giải thích từng câu) dùng chung với full. Cả 2 nhánh: nút quay lại **gate** để lấy lại đúng trạng thái lượt thi/`is_first_attempt` từ server.

### Gửi kết quả

`sendResult()` POST JSON tới `${API_BASE}/api/exam-results` (thật, có đọc response, không còn `no-cors`/webhook). Xem shape chính xác ở mục API contract bên dưới.

**Chống mất kết quả khi submit fail** (không đụng `finishExam()`/`buildExam()`, xem RULE #1): `sendResult()` sinh `client_submission_id` (`crypto.randomUUID()`), lưu payload vào `localStorage` (`ssw2exam_pending_result`) trước khi fetch, retry 3 lần có backoff (0/2s/5s) cho lỗi mạng/5xx, không retry cho lỗi nghiệp vụ (`exhausted`/`revoked`/...). Hết lượt retry → giữ `localStorage` + `navigator.sendBeacon` báo `report-failure` cho corporate-site. Màn kết quả phủ overlay chặn khi đang gửi (`SavingOverlay`), có nút "再送信" khi cần retry thủ công. `useEffect` ở mount tự động gửi lại kết quả tồn đọng từ phiên trước (`resumePendingSubmission`), hiện banner ở màn gate.

Các lỗi phát hiện qua code review (đã sửa, xem commit sau `42c0923`):
- `postExamResultOnce` phân biệt lỗi 5xx/mạng (retry được) với response không phải JSON ở status khác (`NonRetryableSubmitError` — cấu hình sai `api_base`/WAF chặn, retry không bao giờ giúp được nên fail fast thay vì tốn hết 3 lần thử)
- `handleSubmitClick` + `submittingRef` (useRef, không sửa `finishExam()`) chặn double-tap trên 2 nút submit tạo 2 `client_submission_id` khác nhau, tốn 2 lượt thi cho 1 lần làm bài
- `handleRetake` chặn nút "もう一度" bằng `window.confirm()` nếu còn kết quả chưa gửi được (`saveState.retryable`), tránh bị `localStorage` (1 slot duy nhất) ghi đè mất kết quả trước đó
- `retryResultSubmission`/`resumePendingSubmission` báo rõ thay vì im lặng không làm gì khi `localStorage` đã bị dọn bởi nơi khác (VD: tab khác tự resume xong)

## API contract (corporate-site, ngoài repo này)

`API_BASE` mặc định = hằng số `PRODUCTION_API_BASE` khai báo đầu `index.html`, hiện là `https://api.avecvous-evolve.com` (custom domain gắn vào project corporate-site trên Vercel, thay cho alias `.vercel.app` cũ vì alias đó bị Vercel Deployment Protection chặn với người dùng ẩn danh). Đổi domain production sau này chỉ cần sửa giá trị `PRODUCTION_API_BASE`. CORS mở cho origin `https://evolveosaka-dev.github.io`. Không có lớp token/session — `access_code` được gửi lại và server tự xác thực ở mỗi request. Tất cả field response đều snake_case.

**`POST /api/verify-code`**
- Request: `{ access_code }`
- Hợp lệ (`valid:true`, HTTP 200): `{ valid, display_name, exam_type, remaining_attempts, expires_at, plan_type, is_first_attempt }`
  - `display_name`: rỗng `""` nếu user không có tên. `exam_type`: `string | null`. `plan_type`: `"trial" | "one_time" | "subscription" | "staff"` (`"staff"` là giá trị mới phía corporate-site, không phải alias của `"subscription"`). FE map `plan_type` → `examMode` bằng whitelist tường minh trong `index.html` (`TRIAL_PLAN_TYPES`/`FULL_PLAN_TYPES`, xem mục "Chế độ FULL / TRIAL"); giá trị nào không thuộc 2 nhóm này bị FE chặn ở gate, không suy diễn.
  - `is_first_attempt` = true khi access_code chưa có bản ghi nào trong exam_results (server tính, không phải client).
- Không hợp lệ (`valid:false`): `{ valid, reason }`, `reason` ∈ `"invalid_request"` (HTTP 400) | `"not_found" | "revoked" | "expired" | "exhausted"` (HTTP 200). FE map `reason` → message tiếng Nhật qua `CODE_REASON_MESSAGES` trong `index.html`.
- `exam_type` cho 外食業/2号 đã chốt và corporate-site đã triển khai: `"特定技能2号・外食業"` (khớp từng ký tự, gồm dấu `・` U+30FB) — là key trong `data/manifest.json`.

**`POST /api/exam-results`**
- Request:
  ```json
  {
    "access_code": "...", "exam_type": "...",
    "total_score": 0,
    "sections": [{ "topic": "衛生管理", "correct": 6, "total": 15 }],
    "wrong_questions": [{ "id": "gaishoku_tokutei2_011", "topic": "...", "question": "...", "user_answer": "...", "correct_answer": "..." }],
    "survey": { "age_range": "30代", "nationality": "ベトナム", "region": "大阪府", "marketing_opt_in": false }
  }
  ```
  - **Không còn `email` trong payload** — email đã gắn với `access_code` trong DB corporate-site, server tự tra khi cần chứ FE không gửi nữa (FE cũng đã bỏ hẳn ô nhập email khỏi màn `start`). ⚠️ Nếu schema `exam-results` phía corporate-site đang khai báo `email` là field bắt buộc, cần đội corporate-site cập nhật đồng bộ (nếu chưa) — nếu không request sẽ bị `invalid_request` trở lại như lần hợp long trước.
  - `sections[].correct/total` = **số câu** đúng/tổng (không phải điểm).
  - `wrong_questions` chỉ chứa câu trả lời sai; `id` là `qid` gốc ổn định (không phải vị trí trong đề); `user_answer`/`correct_answer` là text đáp án, không phải index.
  - `survey` đổi từ ô gõ tự do (`age`/`location` number/text) sang 3 dropdown: `age_range` (string, "10代"–"50代以上"), `nationality` (string, danh sách + "その他"), `region` (string, 47 都道府県 + "海外" — **không phải `prefecture`**, tên field phải khớp chính xác với schema `zod` phía corporate-site), `marketing_opt_in` (boolean — **không phải `opted_in`**). Chỉ có mặt khi `is_first_attempt` và người dùng không bỏ qua; ngược lại field này vắng mặt hoàn toàn. `region` là field bắt buộc trong schema phía corporate-site (không cho phép thiếu), nên sai tên field này khiến **toàn bộ submit có kèm survey bị `invalid_request`** dù không hiện lỗi rõ ràng ở màn kết quả (màn kết quả tính điểm ở client, không phụ thuộc response của `sendResult()`) — đã từng xảy ra thực tế trong lần go-live đầu tiên, xem `git log` commit sửa lỗi này. Danh sách `NATIONALITIES` trong `index.html` đã đồng bộ đúng 9 giá trị với corporate-site (`src/lib/surveyCategories.ts`).
  - Không gửi `attempt_number` — server tự gán khi ghi (RPC `submit_exam_result` phía corporate-site).
  - ⚠️ **TRIAL gửi payload theo đúng shape này, KHÔNG đổi field** (`total_score`/`sections[].correct/total` trên thang 40 câu, `per=1` đều — khác thang 250 điểm của FULL). Vì `exam_results` có `access_code` để tra ra `plan_type`, mọi thống kê/AI-feedback phía corporate-site đọc bảng này **phải lọc/chuẩn hóa theo `plan_type` trước khi so sánh hoặc gộp**, không được trộn thang điểm 40 (trial) với 250 (full) — cần đội corporate-site xác nhận đã xử lý đúng trước khi bật trial ở production. Nếu sau này cần thêm field nhận diện tường minh (ví dụ `"mode":"trial"|"full"`) vào payload, đó là thay đổi contract — phải đồng bộ 2 đầu trước, không tự ý thêm field một phía.
- Chấp nhận (`accepted:true`, HTTP 200): `{ accepted, attempt_number, remaining_attempts }` — dùng để hiển thị "受験 N回目・残りM回" trên màn kết quả.
- Từ chối (`accepted:false`): `{ accepted, reason }`, `reason` ∈ `"invalid_request"` (HTTP 400) | `"not_found" | "revoked" | "expired" | "exhausted" | "exam_type_mismatch"` (HTTP 200) — cùng map qua `CODE_REASON_MESSAGES`.

## Test local

`tools/mock-api.js` mô phỏng 2 endpoint trên đúng theo contract ở trên (không có dependency ngoài Node built-in `http`). Đã verify bằng Playwright qua các kịch bản: lần đầu (đủ luồng gate→survey→start→quiz→result), lần sau (bỏ qua survey), hết lượt/hết hạn/bị thu hồi (chặn ở gate với đúng message theo `reason`), mã sai (`not_found`), thiếu `access_code` (`invalid_request`, HTTP 400) — payload gửi đi đúng contract, không phát sinh lỗi console.

Mã test cho chế độ FULL/TRIAL (xem comment header `tools/mock-api.js`): `TEST-STAFF` (`plan_type="staff"`, FULL/55問), `TEST-TRIAL-FIRST`/`TEST-TRIAL-REPEAT` (`plan_type="trial"`, TRIAL/40問, lần đầu/lần sau), `TEST-UNKNOWN-PLAN` (`plan_type="beta"` — không thuộc whitelist nào, phải bị chặn ở gate với message "不明なプランです").

**Công thức chạy test local (2 lệnh song song):**
```
node tools/mock-api.js 8787      # mock API, port 8787
npx serve -l 5500 .              # static server serving repo root, port 5500
```

**URL mở trình duyệt:**
```
http://localhost:5500/?api_base=http://localhost:8787&code=TEST-FIRST
```
- Phải mở ở path gốc `/` (không phải `/index.html?...`) — `serve` sẽ redirect và làm mất query string nếu mở `/index.html?...`.
- Đổi `code=` để test kịch bản khác: `TEST-FIRST` (lần đầu, có survey), `TEST-REPEAT` (lần sau, bỏ qua survey), `TEST-EXHAUSTED`/`TEST-EXPIRED`/`TEST-REVOKED` (chặn ở gate), bất kỳ chuỗi khác (`not_found`).
- Bỏ `?api_base=...` để gọi thẳng API production thật (`API_BASE` mặc định) — khi đó cần access code thật và origin phải nằm trong CORS allowlist của corporate-site (mặc định chỉ mở cho `https://evolveosaka-dev.github.io`, không phải `localhost`).
