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

### Flow thi (component `App`, state machine qua `screen`)

`gate → survey (nếu is_first_attempt) → start → quiz → result`:

1. **gate**: nhập access code (tự điền từ `?code=`), gọi `POST /api/verify-code`. Chặn lại nếu `valid:false` (hiện message theo `reason`) hoặc thiếu `exam_type`. Thành công → `loadExamData(exam_type)` → chuyển `survey` hoặc `start` tùy `is_first_attempt`.
2. **survey** (chỉ hiện lần đầu, có thể bỏ qua): 3 dropdown — 年代 (`AGE_RANGES`), 国籍 (`NATIONALITIES`), お住まい (`PREFECTURES`, 47 都道府県 + 海外) — cộng checkbox opt-in mặc định tắt. Bỏ qua → không gửi field `survey` trong kết quả.
3. **start**: chỉ hiển thị `display_name` (từ verify-code, không cho sửa) — không còn ô nhập nào (email đã bị loại bỏ, xem mục API contract). `startExam()` gọi `buildExam()` ngay, không cần validate gì thêm.
4. **quiz**: đếm ngược `EXAM_MINUTES` phút, tự nộp khi hết giờ; lưu lựa chọn vào `answers` theo `q.id`.
5. `finishExam()`: chấm điểm, tạo `result`, chuyển **result**, gọi `sendResult(res)`.
6. **result**: điểm theo sect, đúng/sai từng câu kèm giải thích, `attempt_number`/`remaining_attempts` từ response exam-results. Nút "もう一度" quay lại **gate** (để trạng thái lượt thi/`is_first_attempt` được lấy lại đúng từ server).

### Gửi kết quả

`sendResult()` POST JSON tới `${API_BASE}/api/exam-results` (thật, có đọc response, không còn `no-cors`/webhook). Xem shape chính xác ở mục API contract bên dưới.

## API contract (corporate-site, ngoài repo này)

`API_BASE` mặc định = hằng số `PRODUCTION_API_BASE` khai báo đầu `index.html`, hiện là `https://api.avecvous-evolve.com` (custom domain gắn vào project corporate-site trên Vercel, thay cho alias `.vercel.app` cũ vì alias đó bị Vercel Deployment Protection chặn với người dùng ẩn danh). Đổi domain production sau này chỉ cần sửa giá trị `PRODUCTION_API_BASE`. CORS mở cho origin `https://evolveosaka-dev.github.io`. Không có lớp token/session — `access_code` được gửi lại và server tự xác thực ở mỗi request. Tất cả field response đều snake_case.

**`POST /api/verify-code`**
- Request: `{ access_code }`
- Hợp lệ (`valid:true`, HTTP 200): `{ valid, display_name, exam_type, remaining_attempts, expires_at, plan_type, is_first_attempt }`
  - `display_name`: rỗng `""` nếu user không có tên. `exam_type`: `string | null`. `plan_type`: `"trial" | "one_time" | "subscription"`.
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
    "survey": { "age_range": "30代", "nationality": "ベトナム", "prefecture": "大阪府", "opted_in": false }
  }
  ```
  - **Không còn `email` trong payload** — email đã gắn với `access_code` trong DB corporate-site, server tự tra khi cần chứ FE không gửi nữa (FE cũng đã bỏ hẳn ô nhập email khỏi màn `start`). ⚠️ Nếu schema `exam-results` phía corporate-site đang khai báo `email` là field bắt buộc, cần đội corporate-site cập nhật đồng bộ (nếu chưa) — nếu không request sẽ bị `invalid_request` trở lại như lần hợp long trước.
  - `sections[].correct/total` = **số câu** đúng/tổng (không phải điểm).
  - `wrong_questions` chỉ chứa câu trả lời sai; `id` là `qid` gốc ổn định (không phải vị trí trong đề); `user_answer`/`correct_answer` là text đáp án, không phải index.
  - `survey` đổi từ ô gõ tự do (`age`/`location` number/text) sang 3 dropdown: `age_range` (string, "10代"–"50代以上"), `nationality` (string, danh sách + "その他"), `prefecture` (string, 47 都道府県 + "海外"), `opted_in` (boolean). Chỉ có mặt khi `is_first_attempt` và người dùng không bỏ qua; ngược lại field này vắng mặt hoàn toàn. ⚠️ **Danh sách `NATIONALITIES` trong `index.html` hiện là danh sách tạm** (10 quốc gia phổ biến + その他) — cần đội corporate-site xác nhận/cung cấp danh sách thật để khớp enum phía DB, tránh lệch giá trị khi ghi nhận.
  - Không gửi `attempt_number` — server tự gán khi ghi (RPC `submit_exam_result` phía corporate-site).
- Chấp nhận (`accepted:true`, HTTP 200): `{ accepted, attempt_number, remaining_attempts }` — dùng để hiển thị "受験 N回目・残りM回" trên màn kết quả.
- Từ chối (`accepted:false`): `{ accepted, reason }`, `reason` ∈ `"invalid_request"` (HTTP 400) | `"not_found" | "revoked" | "expired" | "exhausted" | "exam_type_mismatch"` (HTTP 200) — cùng map qua `CODE_REASON_MESSAGES`.

## Test local

`tools/mock-api.js` mô phỏng 2 endpoint trên đúng theo contract ở trên (không có dependency ngoài Node built-in `http`). Đã verify bằng Playwright qua các kịch bản: lần đầu (đủ luồng gate→survey→start→quiz→result), lần sau (bỏ qua survey), hết lượt/hết hạn/bị thu hồi (chặn ở gate với đúng message theo `reason`), mã sai (`not_found`), thiếu `access_code` (`invalid_request`, HTTP 400) — payload gửi đi đúng contract, không phát sinh lỗi console.

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
