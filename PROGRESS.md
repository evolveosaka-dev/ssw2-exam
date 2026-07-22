# 進捗状況

## Hoàn tất (2026-07-23, TRIAL đổi sang 20 câu cố định)

- **TRIAL đổi từ 40 câu random mỗi lần thi sang 20 câu cố định, thứ tự cố định, giống nhau cho mọi user** — mục đích: cho user thấy đủ **các loại câu hỏi** (4 phân môn × 3 type: 学科/判断試験/計画立案), không phải luyện đề diện rộng. Danh sách 20 `qid` do người dùng duyệt tay (câu dễ hiểu, có `explain`/`why_wrong` rõ, không câu khó nhất, không câu có `img`), đủ 12 tổ hợp sect×type, giữ nguyên trọng số điểm/câu như đề thật (93 điểm: 学科 12 câu/41点 + 実技 8 câu/52点, chia theo 4 sect đúng bảng cấu trúc thật — khác thiết kế cũ vốn làm phẳng về `per=1`/40 điểm). Chi tiết cơ chế (`TRIAL_FIXED_QIDS`, `deriveTrialBlueprintFromFixedQids()`, `buildTrialExam()`) xem `CLAUDE.md` mục "Chế độ FULL / TRIAL". `buildExam()`/`finishExam()` không đổi — `buildTrialExam()` là hàm hoàn toàn tách biệt, chỉ `startExam()` rẽ nhánh gọi hàm nào theo `examMode`.
- Chỉ **thứ tự đáp án** trong mỗi câu vẫn `shuffle()` (giữ giá trị chống học thuộc vị trí đáp án khi thi lại tối đa 3 lần); thứ tự 20 câu thì cố định tuyệt đối, không random.
- Thêm 3 tính năng UI liên quan (đã duyệt tay trước khi code):
  1. Bảng so sánh Trial vs Đề thật (学科試験/実技試験/合計/合否判定/問題) ở màn start, chỉ hiện khi `examMode==="trial"`, số liệu tự tính từ `BLUEPRINT`/`REAL_BLUEPRINT` (không hardcode).
  2. Nhãn loại câu (`typeLabel(q.type)`: 学科試験/実技試験・判断試験/実技試験・計画立案) hiển thị ở quiz + phần "解説" màn kết quả — áp dụng cho **cả FULL lẫn TRIAL**, chỉ đọc để hiển thị, không gửi payload.
  3. Bảng điểm chi tiết theo phần (`sectPartScoreBreakdown()`: 分野/学科/実技/合計/正答率, 4 dòng + 1 dòng 合計) thay cho bảng "8 hạng mục" đếm số câu cũ (`trialBreakdown()` — đã xoá hàm này, không còn nơi gọi) ở màn kết quả trial.
- Đã verify qua Playwright (local, `tools/mock-api.js` + `TEST-TRIAL-FIRST`/`TEST-FIRST`): đủ 20 câu đúng thứ tự/nhãn loại, bảng điểm cộng đúng 93 theo từng sect, gửi kết quả thành công; đồng thời regression-test lại FULL mode (`TEST-FIRST`, 55 câu) — không có console error, không có thay đổi hành vi.
- ⚠️ **Cross-repo (chưa xác nhận với corporate-site)**: `total_score`/`sectScore` gửi trong `POST /api/exam-results` cho trial giờ dùng thang **93 điểm** (lệch theo sect: 32/12/21/28), thay vì thang 40 điểm phẳng (`per=1`) như trước. `sections[].correct/total` **không đổi** (luôn là số câu, không phải điểm). Cần đối chiếu lại phía corporate-site (đặc biệt Phase 6 AI feedback/section trend) xem có giả định trial luôn max=40 hay không trước khi coi thay đổi này là an toàn cho production.

## Hoàn tất (2026-07, cập nhật ngân hàng đề + cấu trúc rút đề/chấm điểm)

- **Đối chiếu toàn bộ 485 câu hỏi (sau đó 532) với 4 file PDF giáo trình gốc** (学習テキスト 衛生管理/飲食物調理/接客全般/店舗運営, 一般社団法人日本フードサービス協会) — đọc từng trang (127 trang) qua ảnh render (fix bug font CJK của `pdf-parse`: cần trỏ `cMapUrl`/`standardFontDataUrl` vào data có sẵn trong `pdfjs-dist`, không cần cài poppler), đối chiếu từng câu một với 4 agent song song.
  - Phát hiện & sửa 2 lỗi nhỏ: `qid_006` sai cách đọc "習慣" (ghi nhầm しつけ thay vì しゅうかん trong `explain`), `qid_067` lẫn chữ "food" tiếng Anh vào đáp án sai.
  - Không phát hiện lỗi sai đáp án nào trong toàn bộ 485 câu — bộ đề chính xác cao.
  - Phát hiện một số nội dung sách chưa được câu hỏi nào bao phủ → soạn thêm **47 câu mới** (qid 486–536, có xác minh từng câu với đúng trang sách trước khi thêm), ngân hàng đề: 485 → **532 câu**.
- **Đổi field `type` mỗi câu từ 2 giá trị (`chishiki`/`keisan`, không phân theo part) sang 3 giá trị** (`gakkachishiki`/`handan`/`keikakuritsuan`, xem `CLAUDE.md` mục "Cấu trúc đề 学科/実技") — mapping xác định từ chính nội dung câu hỏi (câu judgment-style = `handan`, câu tính toán = `keikakuritsuan`), không phải đoán mò.
- **Cấu trúc rút đề 実技 giờ đúng bản chất đề thật**: mỗi section thực kỹ luôn rút đúng **3 câu 判断試験 + 2 câu 計画立案** (trước đây rút ngẫu nhiên 5 câu trộn lẫn 2 loại, không đảm bảo tỷ lệ). Đã xác nhận tường minh với người dùng trước khi sửa `buildExam()` (RULE #1 ngoại lệ #3 mới trong `CLAUDE.md`) — verify 500 lần chạy đều đúng tuyệt đối 3+2/section.
- **Màn kết quả FULL thêm breakdown 学科(120点)/実技(130点)**, và trong 実技 tách tiếp 判断試験(78点)/計画立案(52点) — tính bằng hàm `partTypeBreakdown()` độc lập, không đụng `finishExam()` (cùng pattern `trialBreakdown()` có sẵn).
- Toàn bộ thay đổi trên đã **push lên GitHub Pages (production)**, xác nhận qua Playwright E2E (build/nộp/chấm điểm) + kiểm tra trực tiếp dữ liệu live sau mỗi lần deploy.
- **Sửa lỗi phát hiện qua test thật (access code RZYAMXEL)**: 47 câu mới thiếu hoàn toàn furigana (bỏ sót khi thêm câu, vì generator furigana chạy offline không nằm trong repo) — đã sinh lại bằng `kuroshiro`+`kuroshiro-analyzer-kuromoji`, verify khớp byte-for-byte với format cũ, coverage 100% (3254→3579 entries).
- **Liên kết chéo (2026-07-22): corporate-site Phase 6 (AI feedback qua Make.com) đã hoàn tất**, dùng trực tiếp dữ liệu ssw2-exam gửi lên (`wrong_questions[].id` ổn định theo `qid`, `sections[].correct/total`) để tính `repeated_mistakes_text`/`section_trend_text` — **không cần thay đổi gì ở ssw2-exam**, toàn bộ nằm ở phía `corporate-site`. Chi tiết xem `corporate-site/CLAUDE.md` mục "フェーズ6".

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
