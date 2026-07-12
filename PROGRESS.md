# 進捗状況

## Hoàn tất

- **Phase 4** (cổng access code + khảo sát lần đầu + gửi kết quả qua API corporate-site) — **hoàn tất**.
  - Tách ngân hàng đề ra `data/manifest.json` + `data/gaishoku-tokutei2.json` (327 câu, `exam_type="特定技能2号・外食業"` đã xác nhận và corporate-site đã triển khai).
  - Màn gate (access code + `?code=` tự điền) + màn khảo sát lần đầu (skippable).
  - `sendResult()` gửi `POST /api/exam-results` đúng contract thật (đã khớp với response schema `valid/reason`, `accepted/reason`, `remaining_attempts`).
  - `buildExam()`/`finishExam()` không đổi logic (RULE #1 trong `CLAUDE.md`), chỉ thêm 1 field pass-through `qid` đã được duyệt.
- **E2E local pass**: test qua `tools/mock-api.js` (Playwright, 4+ kịch bản: lần đầu/lần sau/hết lượt/mã sai) và **hợp long với corporate-site thật — cả 3 trạm (verify-code, survey, exam-results) đều thông**.

## Việc chờ

- **Merge `feature/access-code` vào `main`** khi go-live bản mới (chưa merge — nhánh vẫn đang mở để chờ thời điểm go-live).
- **Vô hiệu webhook Make.com cũ** (đã được thay thế bởi `POST /api/exam-results` trong code, nhưng webhook Make.com phía ngoài — nếu vẫn còn cấu hình nhận dữ liệu ở đâu đó — cần được tắt/gỡ khi go-live để tránh nhầm lẫn nguồn dữ liệu).

## Chưa xác nhận / theo dõi tiếp

- Domain production chính thức `avecvous-evolve.com` cho corporate-site (Phase 7 phía corporate-site) — khi gắn xong cần đổi `API_BASE` trong `index.html`.
- **Đã bỏ hẳn ô nhập email và field `email` khỏi payload `/api/exam-results`** (email nay tra theo `access_code` trong DB, server tự lo). ⚠️ Cần đội corporate-site xác nhận schema `exam-results` không còn bắt buộc `email` — nếu vẫn required phía server sẽ lại bị `invalid_request` (400) như lần hợp long trước, cần sửa đồng bộ hai đầu trước khi go-live.
- **Màn khảo sát đổi từ ô gõ tự do sang 3 dropdown** (年代/国籍/お住まい), payload `survey` đổi field name (`age_range`/`nationality`/`prefecture`/`opted_in` thay vì `age`/`location`/`opted_in`). ⚠️ **Danh sách `NATIONALITIES` trong `index.html` hiện là danh sách tạm** (10 quốc gia phổ biến + その他) — cần đội corporate-site xác nhận/cung cấp danh sách thật khớp enum phía DB trước khi go-live, tránh ghi nhận sai giá trị.
