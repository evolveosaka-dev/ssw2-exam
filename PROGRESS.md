# 進捗状況

## Hoàn tất (2026-07-28, khóa 1 phần màn kết quả TRIAL làm phễu chuyển đổi lên gói trả phí)

- Theo yêu cầu người dùng: màn kết quả TRIAL không còn hiển thị dữ liệu thật của radar chart (4 phân môn), thay bằng hình minh họa cố định + làm mờ (`filter:blur`) + overlay "🔒 分野別の詳しい正答率は有料プランでご確認いただけます".
- Phần 解説 (giải thích đáp án) của TRIAL: chỉ vấn 4 câu đầu (問1〜4) hiển thị đầy đủ furigana + giải thích + lý do đáp án sai như cũ. Từ câu 5 trở đi: bỏ furigana, ẩn giải thích/lý do sai, thay bằng box "🔒 有料プランでご覧いただけます". Câu hỏi/đáp án/kết quả đúng-sai vẫn hiển thị bình thường ở mọi câu.
- FULL mode không đổi gì (đã verify thủ công qua `TEST-FIRST`: radar chart hiện rõ dữ liệu thật, 問5+ vẫn đầy đủ furigana/解説).
- Chi tiết kỹ thuật đầy đủ xem `CLAUDE.md` mục "TRIAL: khóa 1 phần nội dung màn kết quả làm phễu chuyển đổi sang gói trả phí".

## Hoàn tất (2026-07-27, radar chart 4 phân môn ở màn kết quả)

- Theo yêu cầu người dùng: màn kết quả (cả thi thử TRIAL lẫn thi thật FULL) hiển thị thêm biểu đồ lưới nhện (radar chart) 4 góc = 4 phân môn 衛生管理/飲食物調理/接客全般/店舗運営.
- Thêm 2 hàm thuần hiển thị trong `index.html`: `sectAccuracyData()` (đọc lại `sectPartScoreBreakdown()`/`result.sectScore` có sẵn, không đụng `finishExam()`/`buildExam()` — RULE #1) và `SectRadarChart({data})` (vẽ SVG tay, không thêm thư viện ngoài).
- Sự cố phát hiện lúc test: nhãn trục bên phải bị cắt mất ký tự cuối do `textAnchor="middle"` cố định làm chữ tràn ra ngoài `viewBox`. Đã sửa bằng cách chọn `textAnchor` động theo hướng trục (phải→start/trái→end/trên-dưới→middle).
- Test thủ công qua `tools/mock-api.js` với `TEST-TRIAL-FIRST` (TRIAL, 20 câu) và `TEST-FIRST` (FULL, 55 câu) — cả 2 hiển thị đúng 4 trục, không lỗi console kể cả lúc tải trang. Chưa viết test script tự động cho phần này (app không có test suite, xem mục "Lệnh thường dùng" trong `CLAUDE.md`).
- Chi tiết kỹ thuật đầy đủ xem `CLAUDE.md` mục "Radar chart 4 phân môn ở màn kết quả".

## Hoàn tất (2026-07-23, màn nhập thông tin bắt buộc cho gói trả phí)

- **Vấn đề**: với gói trả phí (mua qua Stripe), chỉ có email là dữ liệu chắc chắn thu được — Stripe Checkout chấp nhận tên rỗng, và không hề thu thập quốc tịch/độ tuổi/nơi ở. Màn khảo sát cũ (tùy chọn, bỏ qua được) không đủ để đảm bảo có đủ dữ liệu liên hệ cho nhóm khách hàng quan trọng nhất này.
- **Giải pháp**: thêm màn hình mới `screen==="profile"` — **bắt buộc, không thể bỏ qua** — chỉ áp dụng cho `plan_type` `one_time`/`subscription` (trial/staff không đổi gì). Sau khi nhập access code, nếu `verify-code` trả `profile_required:true`, người dùng phải điền đủ 4 trường (Tên, Quốc tịch, Độ tuổi, Nơi ở theo tỉnh) — email hiển thị readonly để xác nhận, không cho sửa — mới được vào màn bắt đầu thi. Dữ liệu được gửi **ngay lập tức** tới corporate-site (endpoint mới `POST /api/access-codes/profile`), không đợi tới lúc nộp bài thi — tránh mất dữ liệu nếu người dùng bỏ ngang không thi.
- Toàn bộ logic mới (`MANDATORY_PROFILE_PLAN_TYPES`, `submitMandatoryProfile()`, màn `profile`) nằm ở tầng App/UI, không đụng `buildExam()`/`finishExam()`. Màn `survey` cũ vẫn giữ nguyên hành vi cho trial/staff.
- Đã kiểm tra kỹ Supabase trước khi làm: cả 5 trường (name/email/nationality/age_range/region) **đã có sẵn cột trong bảng `users`** từ trước — không cần migration mới, chỉ cần luồng nhập liệu mới.
- Đã verify qua Playwright (mock-api, đủ 3 kịch bản: cần nhập profile/đã có sẵn profile/regression trial+staff) và qua test thật chống lại corporate-site dev server + Supabase production thật (tạo user rỗng tên → xác nhận `profile_required:true` → gửi profile → xác nhận `profile_required:false` → xác nhận gọi endpoint với code trial bị từ chối `plan_type_mismatch`) — chi tiết đầy đủ xem `corporate-site/CLAUDE.md` mục "有料プラン専用の必須プロフィール入力".
- ⚠️ Cross-repo: `verify-code` response giờ có thêm `profile_required` (luôn có) và `email` (chỉ khi `profile_required:true` — ngoại lệ có chủ đích của nguyên tắc cũ "không bao giờ trả email"). Xem mục API contract.

## Hoàn tất (2026-07-23, nối nút "有料プランで対策する" sang landing page thật)

- Nút "有料プランで対策する" ở màn kết quả trial trước đây trỏ tới `UPGRADE_URL_PLACEHOLDER` (`#upgrade-phase5-todo`, chưa làm gì). Đã thêm hàm `upgradeUrl(examType)` (`index.html`) trả về `${API_BASE}/upgrade?exam_type=${encodeURIComponent(examType)}` — tái dùng `API_BASE`/`PRODUCTION_API_BASE` sẵn có (không thêm hằng số domain thứ 2, khi đổi domain ở Phase 7 chỉ cần sửa 1 chỗ như cũ).
- Trang `/upgrade` thật (landing page thuyết phục có bảng so sánh, ảnh minh họa, nút mua) đã dựng bên **corporate-site** — dùng chính `exam_type` truyền qua để tra đúng sản phẩm khớp ngành (`getProductByExamType()`), nếu không khớp/không có sẽ hiện "プランが見つかりませんでした" thay vì đoán mò sang sản phẩm ngành khác. Chi tiết đầy đủ xem `corporate-site/CLAUDE.md` mục "/upgrade".
- Đã verify end-to-end bằng Playwright: từ màn kết quả trial (mock-api) → href đúng format → mở đúng bằng corporate-site dev server → hiện đúng sản phẩm 特定技能2号・外食業 → nút mua nhảy thẳng sang Stripe Checkout (test mode).
- ⚠️ Cross-repo: trang `/upgrade` bên corporate-site có hardcode lại số liệu trial (20問/93点/3回/7日間) thành hằng số `TRIAL_SUMMARY` riêng để hiển thị bảng so sánh — **không tự động đồng bộ**. Nếu sau này đổi cấu trúc trial (`TRIAL_FIXED_QIDS`) hoặc đổi `max_attempts`/hạn dùng của trial code, phải cập nhật tay `TRIAL_SUMMARY` bên corporate-site.

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

- ~~Merge `feature/access-code` vào `main` khi go-live~~ → **đã xong từ lâu** (xác nhận lại 2026-07-24: `git log main..feature/access-code` rỗng — không còn commit nào của nhánh này chưa nằm trong `main`; `main` đã có thêm 22 commit kể từ đó và đang chạy production qua GitHub Pages). Nhánh cũ `feature/access-code` vẫn còn tồn tại trên remote nhưng chỉ là lịch sử, không cần thao tác gì thêm — có thể xoá khi thuận tiện, không phải việc gấp.
- ~~Vô hiệu webhook Make.com cũ~~ → **hoàn tất (2026-07-27)**: rà soát trực tiếp trên Make.com dashboard, xác nhận webhook đời cũ `https://hook.us2.make.com/jpntp3uy57g9dtdp9r6qsqmaub263ujd` (tên "SSW2 外食 試験結果 受信", dùng trước khi có `POST /api/exam-results` thật) vẫn còn tồn tại và **đang bật**, gắn với scenario "特定技能2号 外食 試験結果 → Google Sheets" (Scenario ID `5581542`, lần chạy cuối 2026-07-07 — trước go-live). Đã xác nhận với người dùng và chuyển scenario này vào Trash (Make giữ 30 ngày trước khi xoá vĩnh viễn, khôi phục được trong thời gian đó nếu cần) — webhook gắn liền với trigger của scenario này tự động biến mất khỏi danh sách Webhooks theo. Danh sách Webhooks hiện chỉ còn đúng 5 webhook đang dùng thật của outbox pattern hiện tại: `registration`/`contact`/`exam_result`/`MAKE_WEBHOOK_URL_EXAM_FAILURE`/`Avecvous-Evolve_order`.

## Chưa xác nhận / theo dõi tiếp

- ~~Domain production chính thức `avecvous-evolve.com` vẫn đang cố ý hoãn~~ → **cập nhật (2026-07-27, đối chiếu lại `corporate-site/CLAUDE.md` bản 2026-07-24): domain đã chuyển xong**, không còn hoãn. DNS thực tế cho thấy Aレコード của `avecvous-evolve.com` đã trỏ sang Vercel (`76.76.21.21`) — thời điểm/người thực hiện việc chuyển DNS không có ghi chép rõ bên corporate-site. Kèm theo đó corporate-site đã dọn xong hậu kỳ: xoá WordPress cũ trên Xserver (file+DB), thêm 301 redirect cho URL cũ, gắn canonical tag + `X-Robots-Tag: noindex` cho `api.avecvous-evolve.com` (tránh trùng nội dung với domain chính), và đã submit sitemap lên Google Search Console. **`PRODUCTION_API_BASE` trong `index.html` của ssw2-exam vẫn đang trỏ `https://api.avecvous-evolve.com`(chưa đổi sang domain chính) — vẫn hoạt động bình thường vì cả 2 domain trỏ cùng 1 deployment, chỉ là `api.` subdomain giờ bị noindex. Đổi sang `avecvous-evolve.com` không bắt buộc, có thể làm khi thuận tiện (SEO/nhất quán), chỉ cần sửa 1 dòng hằng số này.**
- ~~email/NATIONALITIES chưa đồng bộ với corporate-site~~ → **đã xác nhận từ lâu, không còn là vấn đề** (xem mục "API contract" trong `CLAUDE.md`): payload `/api/exam-results` không gửi `email` nữa và corporate-site đã cập nhật đồng bộ; `NATIONALITIES` (9 giá trị) đã khớp với `corporate-site/src/lib/surveyCategories.ts`. Đây là 2 mục còn sót lại từ giai đoạn Phase 4 (trước go-live), nay dọn bỏ vì đã lỗi thời so với thực tế production hiện tại.
