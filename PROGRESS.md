# 進捗状況

## Hoàn tất (2026-07, cập nhật ngân hàng đề + cấu trúc rút đề/chấm điểm)

- **Đối chiếu toàn bộ 485 câu hỏi (sau đó 532) với 4 file PDF giáo trình gốc** (学習テキスト 衛生管理/飲食物調理/接客全般/店舗運営, 一般社団法人日本フードサービス協会) — đọc từng trang (127 trang) qua ảnh render (fix bug font CJK của `pdf-parse`: cần trỏ `cMapUrl`/`standardFontDataUrl` vào data có sẵn trong `pdfjs-dist`, không cần cài poppler), đối chiếu từng câu một với 4 agent song song.
  - Phát hiện & sửa 2 lỗi nhỏ: `qid_006` sai cách đọc "習慣" (ghi nhầm しつけ thay vì しゅうかん trong `explain`), `qid_067` lẫn chữ "food" tiếng Anh vào đáp án sai.
  - Không phát hiện lỗi sai đáp án nào trong toàn bộ 485 câu — bộ đề chính xác cao.
  - Phát hiện một số nội dung sách chưa được câu hỏi nào bao phủ → soạn thêm **47 câu mới** (qid 486–536, có xác minh từng câu với đúng trang sách trước khi thêm), ngân hàng đề: 485 → **532 câu**.
- **Đổi field `type` mỗi câu từ 2 giá trị (`chishiki`/`keisan`, không phân theo part) sang 3 giá trị** (`gakkachishiki`/`handan`/`keikakuritsuan`, xem `CLAUDE.md` mục "Cấu trúc đề 学科/実技") — mapping xác định từ chính nội dung câu hỏi (câu judgment-style = `handan`, câu tính toán = `keikakuritsuan`), không phải đoán mò.
- **Cấu trúc rút đề 実技 giờ đúng bản chất đề thật**: mỗi section thực kỹ luôn rút đúng **3 câu 判断試験 + 2 câu 計画立案** (trước đây rút ngẫu nhiên 5 câu trộn lẫn 2 loại, không đảm bảo tỷ lệ). Đã xác nhận tường minh với người dùng trước khi sửa `buildExam()` (RULE #1 ngoại lệ #3 mới trong `CLAUDE.md`) — verify 500 lần chạy đều đúng tuyệt đối 3+2/section.
- **Màn kết quả FULL thêm breakdown 学科(120点)/実技(130点)**, và trong 実技 tách tiếp 判断試験(78点)/計画立案(52点) — tính bằng hàm `partTypeBreakdown()` độc lập, không đụng `finishExam()` (cùng pattern `trialBreakdown()` có sẵn).
- Toàn bộ thay đổi trên đã **push lên GitHub Pages (production)**, xác nhận qua Playwright E2E (build/nộp/chấm điểm) + kiểm tra trực tiếp dữ liệu live sau mỗi lần deploy.

## Hoàn tất (trước đó)

- **Phase 4** (cổng access code + khảo sát lần đầu + gửi kết quả qua API corporate-site) — **hoàn tất**.
  - Tách ngân hàng đề ra `data/manifest.json` + `data/gaishoku-tokutei2.json` (327 câu, `exam_type="特定技能2号・外食業"` đã xác nhận và corporate-site đã triển khai).
  - Màn gate (access code + `?code=` tự điền) + màn khảo sát lần đầu (skippable).
  - `sendResult()` gửi `POST /api/exam-results` đúng contract thật (đã khớp với response schema `valid/reason`, `accepted/reason`, `remaining_attempts`).
  - `buildExam()`/`finishExam()` không đổi logic (RULE #1 trong `CLAUDE.md`), chỉ thêm 1 field pass-through `qid` đã được duyệt.
- **E2E local pass**: test qua `tools/mock-api.js` (Playwright, 4+ kịch bản: lần đầu/lần sau/hết lượt/mã sai) và **hợp long với corporate-site thật — cả 3 trạm (verify-code, survey, exam-results) đều thông**.
- **Bỏ ô email + đổi màn khảo sát sang 3 dropdown (年代/国籍/お住まい)** — đã tự test lại (local), xác nhận chạy đúng.

## Việc chờ

- **Merge `feature/access-code` vào `main`** khi go-live bản mới (chưa merge — nhánh vẫn đang mở để chờ thời điểm go-live).
- **Vô hiệu webhook Make.com cũ** (đã được thay thế bởi `POST /api/exam-results` trong code, nhưng webhook Make.com phía ngoài — nếu vẫn còn cấu hình nhận dữ liệu ở đâu đó — cần được tắt/gỡ khi go-live để tránh nhầm lẫn nguồn dữ liệu).

## Chưa xác nhận / theo dõi tiếp

- Domain production chính thức `avecvous-evolve.com` cho corporate-site (Phase 7 phía corporate-site) — khi gắn xong cần đổi `API_BASE` trong `index.html`.
- **Đã bỏ hẳn ô nhập email và field `email` khỏi payload `/api/exam-results`** (email nay tra theo `access_code` trong DB, server tự lo). ⚠️ Cần đội corporate-site xác nhận schema `exam-results` không còn bắt buộc `email` — nếu vẫn required phía server sẽ lại bị `invalid_request` (400) như lần hợp long trước, cần sửa đồng bộ hai đầu trước khi go-live.
- **Màn khảo sát đổi từ ô gõ tự do sang 3 dropdown** (年代/国籍/お住まい), payload `survey` đổi field name (`age_range`/`nationality`/`prefecture`/`opted_in` thay vì `age`/`location`/`opted_in`). ⚠️ **Danh sách `NATIONALITIES` trong `index.html` hiện là danh sách tạm** (10 quốc gia phổ biến + その他) — cần đội corporate-site xác nhận/cung cấp danh sách thật khớp enum phía DB trước khi go-live, tránh ghi nhận sai giá trị.
