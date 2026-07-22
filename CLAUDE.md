# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULE #1 — KHÔNG được đụng vào logic ra đề và logic chấm điểm

**TUYỆT ĐỐI KHÔNG thay đổi hành vi của hai khối logic sau, trừ khi người dùng yêu cầu tường minh và rõ ràng bằng lời:**

1. **Logic ra đề** — hàm `buildExam()` trong `index.html`.
   - Cách chọn số câu mỗi `sect`/`part` theo `BLUEPRINT`, cơ chế fallback khi thiếu câu (`extra`), cách `shuffle()` thứ tự đáp án và remap lại `answer`/`why_wrong` index — giữ nguyên y hệt. Số lượng đáp án mỗi câu **không hardcode** (đọc từ `q.options.length` — xem ngoại lệ #2 bên dưới), hiện tại toàn bộ ngân hàng đề là 3 đáp án/câu.
2. **Logic chấm điểm** — hàm `finishExam()` trong `index.html`.
   - Cách tính `sectScore`, `total`, `maxTotal`, so sánh với `PASS_MARK` để ra `passed` — giữ nguyên y hệt.
   - `BLUEPRINT`, `PASS_MARK`, `TOTAL_MARK`, `EXAM_MINUTES` là dữ liệu **theo ngành/bậc**, nạp lúc runtime từ `data/manifest.json` (xem mục Kiến trúc) — không hardcode lại thành hằng số cố định trong code.

**Các ngoại lệ đã được duyệt và đã đóng (không còn treo, không cần hỏi lại):**
1. `buildExam()` có thêm đúng 1 field pass-through `qid: q.qid` khi dựng object câu hỏi output — để `sendResult()` có thể tham chiếu id gốc ổn định trong ngân hàng đề. Không đụng vào lựa chọn câu, thuật toán shuffle, hay remap `answer`/`why_wrong`.
2. Dòng sinh thứ tự shuffle đổi từ literal `shuffle([0,1,2,3])` thành `shuffle(q.options.map((_,i)=>i))` — để hỗ trợ ngân hàng đề chuyển từ 4 xuống 3 đáp án/câu (giảm khả năng đoán bừa theo độ dài đáp án dài nhất). Với data 4 đáp án, biểu thức mới cho ra kết quả y hệt `[0,1,2,3]` — đây là tham số hóa số lượng đáp án đọc từ chính data, không đổi cơ chế shuffle/remap/dựng lại `newOptions`/`newAnswer`/`newWhy` phía sau.
3. `buildExam()` phần rút câu 実技 (`part==="jitsugi"`): khi blueprint entry của sect đó có `handan`/`keikakuritsuan` (số câu mỗi type), rút riêng đúng số lượng mỗi type thay vì rút ngẫu nhiên `sect.n` câu từ toàn bộ pool jitsugi gộp chung — để đảm bảo đúng cấu trúc đề thật (mỗi section 実技 luôn có 3 判断試験+2 計画立案, xem mục "Cấu trúc đề 学科/実技"). Sect/industry nào **không có** 2 field này thì rơi về đúng hành vi cũ (rút `sect.n` ngẫu nhiên từ toàn pool, không phân biệt type) — không đổi hành vi khi thiếu field, nên tương thích ngược cho các ngành sẽ thêm sau. Cơ chế fallback `extra` khi thiếu câu vẫn giữ nguyên, áp dụng sau bước rút theo type nếu vẫn còn thiếu. Đồng thời thêm field pass-through thứ 2 `type: q.type` (cùng dạng với ngoại lệ #1) để màn kết quả tính được breakdown 判断試験/計画立案 mà không cần đụng `finishExam()`. Đã xác nhận tường minh bằng lời trước khi sửa (2026-07).

Mọi thay đổi khác (UI, màn hình gate/survey, nguồn dữ liệu câu hỏi, endpoint/định dạng gửi kết quả, thêm ngành mới...) đều được phép, **miễn là không chạm vào hai vùng trên**. Nếu một thay đổi bắt buộc phải sửa thêm vào `buildExam`/`finishExam` ngoài ngoại lệ đã đóng ở trên, phải dừng lại và hỏi lại người dùng trước khi sửa, không tự ý suy diễn.

## Tổng quan dự án

Site thi thử kỹ năng đặc định (特定技能) cho lao động nước ngoài tại Nhật, chạy tĩnh trên GitHub Pages, không có backend riêng trong repo này. Dự kiến mở rộng cho 11 ngành × 2 bậc (特定技能1号/2号); hiện tại chỉ có ngành ẩm thực/外食業 bậc 2号 (532 câu, mỗi câu 3 đáp án) làm **mẫu/template** cho các ngành sau. Xác thực và ghi nhận kết quả thi qua API của một hệ thống corporate-site riêng (xem mục API contract).

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
  manifest.json                  # exam_type -> {industry, industryLabel, tier, tierLabel, file, examMinutes, passMark, totalMark}
  gaishoku-tokutei2.json         # {blueprint, sectLabels, questions}  — ngành mẫu (外食業/特定技能2号, 532 câu, 3 đáp án/câu)
  gaishoku-tokutei2.meta.json    # {furigana} — dữ liệu bổ trợ CHỈ để hiển thị, xem mục "Furigana"
```

- Key trong `manifest.json` là chuỗi `exam_type` mà API `/api/verify-code` trả về — phải khớp chính xác với giá trị thật từ corporate-site.
- Mỗi file dữ liệu ngành đóng gói `blueprint` (số câu + điểm/câu mỗi sect×part, xem mục "Cấu trúc đề 学科/実技" cho shape đầy đủ của các entry `jitsugi`), `sectLabels` (nhãn hiển thị + dùng làm `topic` khi gửi kết quả), và `questions` (mỗi câu có `qid` ổn định + schema gốc: `sect, part, type, q, options, answer, explain, why_wrong, img?`). `options`/`answer`/`why_wrong` không cố định số lượng đáp án — `buildExam()` đọc `q.options.length` (xem RULE #1, ngoại lệ #2); hiện tại toàn bộ 532 câu của `gaishoku-tokutei2.json` là 3 đáp án/câu, cố ý cân độ dài đáp án đúng/sai trong khoảng ≤10 ký tự để giảm khả năng đoán bừa theo đáp án dài nhất.
- Field `type` trên mỗi câu nhận 1 trong 3 giá trị: `"gakkachishiki"` (câu 学科, thuần biên tập, `index.html` không đọc), `"handan"`/`"keikakuritsuan"` (câu 実技 — 判断試験/計画立案; 2 giá trị này **được `buildExam()` đọc** để rút đúng tỷ lệ 3:2 mỗi section, xem RULE #1 ngoại lệ #3 và mục "Cấu trúc đề 学科/実技"). Trước đây field này chỉ có 2 giá trị thuần biên tập `chishiki`/`keisan` (không phân theo part) — đã đổi mapping sang 3 giá trị trên (`gakka+chishiki→gakkachishiki`, `jitsugi+chishiki→handan`, `jitsugi+keisan→keikakuritsuan`) dựa trên đối chiếu nội dung câu hỏi thật (câu dạng "tình huống → chọn phản ứng phù hợp" = handan, câu tính toán số liệu = keikakuritsuan), xem lịch sử commit.
- `gaishoku-tokutei2.json` còn có thêm top-level `schemaVersion`, `examRules` — chỉ phục vụ biên tập nội dung, `index.html` không đọc tới (bao gồm cả tên field `keisanMin`/`keisanMax` bên trong `examRules`, vẫn giữ tên cũ vì là dữ liệu chết, không liên quan tới việc đổi giá trị `type` ở trên). **Không còn field `source`** (chương/trang/nguồn tài liệu) — đã xóa khỏi 425 câu đầu vì đối chiếu thực tế với tài liệu gốc không khớp (dữ liệu đến từ 1 quy trình tự động, `match_confidence` phần lớn thấp và không đáng tin — xem lịch sử commit). 107 câu thêm sau này (60 câu thực kỹ tính toán + 47 câu lấp khoảng trống nội dung) cũng không có field `source`, nhất quán với toàn bộ ngân hàng đề.
- **Thêm ngành mới**: chỉ cần thêm 1 entry vào `manifest.json` + 1 file JSON cùng shape — không cần sửa `index.html`. File `.meta.json` là tùy chọn (xem bên dưới) — thiếu cũng không lỗi. Nếu ngành mới không cần phân biệt 判断試験/計画立案 trong 実技, chỉ cần bỏ 2 field `handan`/`keikakuritsuan` khỏi blueprint entry — `buildExam()` tự rơi về hành vi rút ngẫu nhiên `n` câu như cũ (xem RULE #1 ngoại lệ #3).

### Cấu trúc đề 学科/実技 (外食業/特定技能2号)

Đề thi thật gồm 2 phần: **学科試験** (35問, 120点) và **実技試験** (20問, 130点) — tổng **55問, 250点**, khớp đúng bảng cấu trúc chính thức do 一般社団法人日本フードサービス協会 quy định:

| 学科 | 問題数 | 点/問 | tổng |
|---|---|---|---|
| 衛生管理 | 10 | 4 | 40 |
| 飲食物調理 | 5 | 2 | 10 |
| 接客全般 | 10 | 3 | 30 |
| 店舗運営 | 10 | 4 | 40 |

| 実技 (mỗi section 判断試験3問+計画立案2問=5問) | 点/問 | tổng |
|---|---|---|
| 衛生管理 | 8 | 40 |
| 飲食物調理 | 4 | 20 |
| 接客全般 | 6 | 30 |
| 店舗運営 | 8 | 40 |

Trong `blueprint.jitsugi`, mỗi entry có thêm 2 field `handan`/`keikakuritsuan` (số câu mỗi type, cộng lại đúng bằng `n`) bên cạnh `n`(tổng câu)/`per`(điểm/câu) sẵn có — vd. `{"key":"eisei","n":5,"per":8,"handan":3,"keikakuritsuan":2}`. `buildExam()` đọc 2 field này để rút riêng đúng 3 câu type=`handan` + 2 câu type=`keikakuritsuan` cho mỗi section thực kỹ (RULE #1 ngoại lệ #3) — đã verify 500 lần chạy `buildExam()` đều cho đúng tuyệt đối 3+2/section, 55 câu tổng, không trùng `qid`.

Màn kết quả FULL có thêm breakdown 学科/実技 và trong 実技 tách tiếp 判断試験/計画立案 (điểm), tính bằng hàm `partTypeBreakdown(questions, answers)` — cùng pattern với `sectPartScoreBreakdown()` dùng cho trial (đọc lại state `questions`/`answers`, độc lập hoàn toàn với `finishExam()`, không đụng `sectScore`/`total`/`maxTotal`/`passed`). Hiển thị **thêm vào** phía trên breakdown theo 4 section (衛生管理/飲食物調理/接客全般/店舗運営) đã có từ trước, không thay thế.

### Furigana (chỉ hiển thị ở màn kết quả, không đụng RULE #1)

`gaishoku-tokutei2.meta.json` được sinh **offline, 1 lần**, không phải lúc runtime (script sinh không nằm trong repo, dùng thư viện phân tích hình vị tiếng Nhật `kuromoji`/IPADIC chạy qua Node — nếu cần sinh lại cho ngành mới, viết lại script tương tự, không cài kuromoji vào `index.html`). Shape: `furigana` là map **text gốc nguyên văn** (câu hỏi/đáp án/giải thích/why_wrong, y hệt string trong `gaishoku-tokutei2.json`) → HTML `<ruby>…<rt>…</rt></ruby>` đã dựng sẵn. Tra theo đúng nội dung chữ vì `buildExam()` giữ nguyên nội dung text (chỉ đổi thứ tự/khóa) — nhờ vậy **không cần đụng `buildExam()`** để truyền furigana qua.

`loadExamData()` fetch file này **best-effort** (đường dẫn suy ra từ `cfg.file` bằng cách đổi đuôi `.json`→`.meta.json`) — lỗi/thiếu file thì `FURIGANA` rỗng, màn kết quả tự động rơi về hiện text thường, không chặn luồng thi. `withFurigana(text)` (module-level, ngoài `App`) tra `FURIGANA[text]`, có thì render `dangerouslySetInnerHTML` (HTML tự sinh offline, không phải input người dùng), không có thì trả về text thường — dùng ở khối "解説" (câu hỏi, đáp án, giải thích, why_wrong) trên màn kết quả, dùng chung cho cả FULL và TRIAL vì khối này đã share sẵn.

### Nạp dữ liệu runtime

`loadExamData(examType)` (đầu file JS trong `index.html`) fetch `manifest.json` rồi fetch file ngành tương ứng, gán vào các biến module-level `QUESTION_BANK`, `BLUEPRINT`, `SECT_LABEL`, `PASS_MARK`, `TOTAL_MARK`, `EXAM_MINUTES`, `EXAM_LABEL`. `buildExam()`/`finishExam()` đọc các biến này y hệt cách chúng hardcode trước đây — không phụ thuộc vào cách chúng được nạp.

### Chế độ FULL / TRIAL (`examMode`, từ `plan_type`)

Sau `loadExamData()`, `verifyCode()` phân loại `plan_type` bằng whitelist tường minh:
- `FULL_PLAN_TYPES = ["staff","one_time","subscription"]` → `examMode="full"`, hành vi **y hệt trước khi có trial** — 55 câu (random, `buildExam()`), `PASS_MARK`/`TOTAL_MARK`/`EXAM_MINUTES` từ `manifest.json`, màn kết quả có đậu/rớt.
- `TRIAL_PLAN_TYPES = ["trial"]` → `examMode="trial"` — **20 câu cố định** (không random), xem chi tiết bên dưới.
- `plan_type` không thuộc 2 nhóm trên → chặn ngay ở gate, message "不明なプランです。運営にお問い合わせください。" (không đoán mò, không coi là full).

**TRIAL = 20 câu cố định, thứ tự cố định, giống nhau cho mọi user** (đổi từ thiết kế cũ — 40 câu random mỗi lần thi, `n=5/per=1` đều mỗi sect×part — sang 2026-07). Lý do đổi: mục đích của trial là cho user thấy **các loại câu hỏi** (4 phân môn × 3 type: 学科/判断試験/計画立案), không phải luyện đề diện rộng; cố định giúp mọi user trải nghiệm đủ 12 tổ hợp và giữ đúng trọng số điểm/câu như đề thật thay vì làm phẳng về `per=1`.

- `TRIAL_FIXED_QIDS` (hằng số, đầu file): 20 `qid` cụ thể trong `gaishoku-tokutei2.json`, đã được người dùng duyệt tay (câu dễ hiểu, có `explain`/`why_wrong` rõ, không câu khó nhất, không câu có `img`) — đủ 12 tổ hợp sect×type, tổng đúng 93 điểm (学科 12 câu/41点 + 実技 8 câu/52点), khớp bảng cấu trúc điểm thật theo sect (xem mục "Cấu trúc đề 学科/実技"). **Ràng buộc**: danh sách này gắn cứng với `gaishoku-tokutei2.json` — nếu thêm ngành mới cần trial cố định, phải tạo danh sách `qid` riêng cho ngành đó (không tái dùng chung).
- `deriveTrialBlueprintFromFixedQids(real)`: thay cho `deriveTrialBlueprint()` cũ. Đếm số câu thật trong `TRIAL_FIXED_QIDS` theo từng sect×part×type rồi dựng blueprint cùng shape với bản thật (`n`/`per`/`handan`/`keikakuritsuan`, với `per`/`jp` lấy nguyên từ blueprint thật) — nhờ vậy `Masthead`/panel "出題構成" ở màn start tự động hiển thị đúng 20問/93点 mà không cần sửa UI riêng cho trial.
- `buildTrialExam()`: hàm dựng đề trial, **hoàn toàn tách biệt với `buildExam()`** (không sửa `buildExam()`, không gọi nó). Duyệt `TRIAL_FIXED_QIDS` theo đúng thứ tự khai báo (không `shuffle()` thứ tự câu/không rút ngẫu nhiên) — chỉ `shuffle()` **thứ tự đáp án** trong từng câu (giữ nguyên logic remap `answer`/`why_wrong` giống `buildExam()`) để tránh học thuộc vị trí đáp án khi thi lại (`handleRetakeSameExam()`, tối đa 3 lần). `startExam()` chọn gọi `buildTrialExam()` hay `buildExam()` dựa theo `examMode` — đây là điểm rẽ nhánh duy nhất, bản thân `buildExam()` không đổi.
- Màn **start** (trước câu hỏi đầu, chỉ khi `examMode==="trial"`): panel "無料体験について" — bảng so sánh Trial vs Đề thật (学科試験/実技試験/合計/合否判定/問題), số liệu bên trial lấy từ `BLUEPRINT` (đã derive ở trên), bên thật lấy từ `REAL_BLUEPRINT`/`REAL_PASS_MARK`/`REAL_TOTAL_MARK` — không hardcode số, tự đúng nếu danh sách 20 câu đổi sau này.
- Trong **quiz** và phần "解説" ở **result**, mỗi câu có thêm nhãn loại (`typeLabel(q.type)`: 学科試験/実技試験・判断試験/実技試験・計画立案) cạnh sect/điểm — áp dụng cho **cả FULL lẫn TRIAL** (chỉ đọc `q.type` để hiển thị, không gửi vào payload `sendResult()`).
- Màn kết quả trial không dùng `result.sectScore`/`result.passed` (bỏ hẳn đậu/rớt). Bảng điểm chi tiết theo phần được tính bằng `sectPartScoreBreakdown(questions, answers)` — đọc lại state đã có, độc lập hoàn toàn với `finishExam()` — trả về điểm đạt/tối đa 学科 và 実技 riêng theo từng sect (4 dòng + 1 dòng 合計), tô màu theo tỷ lệ đúng (`trialTierColor()`, ngưỡng <60%/60-79%/≥80%), thay cho bảng "8 hạng mục" đếm số câu (`trialBreakdown()`) trước đây — đã xoá hàm này vì không còn nơi gọi. Khối "本番の試験構成" bên dưới bảng vẫn giữ, lấy số liệu từ `REAL_BLUEPRINT`/`REAL_PASS_MARK`/`REAL_TOTAL_MARK`, không bị ảnh hưởng bởi việc `BLUEPRINT` đã bị ghi đè.

### Flow thi (component `App`, state machine qua `screen`)

`gate → survey (nếu is_first_attempt) → start → quiz → result`:

1. **gate**: nhập access code (tự điền từ `?code=`), gọi `POST /api/verify-code`. Chặn lại nếu `valid:false` (hiện message theo `reason`), thiếu `exam_type`, hoặc `plan_type` không thuộc whitelist FULL/TRIAL nào (xem mục "Chế độ FULL / TRIAL"). Thành công → `loadExamData(exam_type)` → set `examMode` → chuyển `survey` hoặc `start` tùy `is_first_attempt`.
2. **survey** (chỉ hiện lần đầu, có thể bỏ qua): 3 dropdown — 年代 (`AGE_RANGES`), 国籍 (`NATIONALITIES`), お住まい (`PREFECTURES`, 47 都道府県 + 海外) — cộng checkbox opt-in mặc định tắt. Bỏ qua → không gửi field `survey` trong kết quả. Giống nhau ở cả 2 `examMode`.
3. **start**: chỉ hiển thị `display_name` (từ verify-code, không cho sửa) — không còn ô nhập nào (email đã bị loại bỏ, xem mục API contract). Nếu `examMode==="trial"`, thêm panel so sánh Trial vs Đề thật (xem "Chế độ FULL / TRIAL"). `startExam()` gọi `buildTrialExam()` (trial) hoặc `buildExam()` (full) tùy `examMode`, không cần validate gì thêm.
4. **quiz**: đếm ngược `EXAM_MINUTES` phút (30 phút nếu trial, 70 phút nếu full), tự nộp khi hết giờ; lưu lựa chọn vào `answers` theo `q.id`. Mỗi câu có nhãn loại (`typeLabel(q.type)`) cạnh sect/điểm.
5. `finishExam()`: chấm điểm, tạo `result`, chuyển **result**, gọi `sendResult(res)`. Không phân biệt `examMode` bên trong hàm này.
6. **result**: nếu `examMode==="full"` — điểm theo sect, đậu/rớt, đúng/sai từng câu kèm giải thích, `attempt_number`/`remaining_attempts` từ response exam-results, y hệt trước khi có trial. Nếu `examMode==="trial"` — bảng điểm chi tiết theo phần (`sectPartScoreBreakdown()`, xem "Chế độ FULL / TRIAL"), không có đậu/rớt, khối tĩnh giới thiệu cấu trúc đề thật + disclaimer, nút "有料プランで対策する" (`href={upgradeUrl(verifyInfo.exam_type)}` — trỏ sang `${API_BASE}/upgrade?exam_type=...` bên corporate-site, xem `corporate-site/CLAUDE.md` mục "/upgrade"; đã thay thế `UPGRADE_URL_PLACEHOLDER` cũ, 2026-07-23); phần "解説" (đáp án đúng + giải thích từng câu, kèm nhãn loại câu) dùng chung với full. Nút quay lại: **full** → `handleRetake()` → quay lại **gate** (nhập lại code, `buildExam()` rút đề mới — xem "Chế độ FULL / TRIAL"). **trial** → `handleRetakeSameExam()` → thi lại **chính bộ đề vừa nộp** (xem mục "Chống mất kết quả khi submit fail" bên dưới, phần "もう一度 cho trial").

### Gửi kết quả

`sendResult()` POST JSON tới `${API_BASE}/api/exam-results` (thật, có đọc response, không còn `no-cors`/webhook). Xem shape chính xác ở mục API contract bên dưới.

**Chống mất kết quả khi submit fail** (không đụng `finishExam()`/`buildExam()`, xem RULE #1): `sendResult()` sinh `client_submission_id` (`crypto.randomUUID()`), lưu payload vào `localStorage` (`ssw2exam_pending_result`) trước khi fetch, retry 3 lần có backoff (0/2s/5s) cho lỗi mạng/5xx, không retry cho lỗi nghiệp vụ (`exhausted`/`revoked`/...). Hết lượt retry → giữ `localStorage` + `navigator.sendBeacon` báo `report-failure` cho corporate-site. Màn kết quả phủ overlay chặn khi đang gửi (`SavingOverlay`), có nút "再送信" khi cần retry thủ công. `useEffect` ở mount tự động gửi lại kết quả tồn đọng từ phiên trước (`resumePendingSubmission`), hiện banner ở màn gate.

**"もう一度" cho trial (`handleRetakeSameExam()`)**: trial được phép thi lại tối đa 3 lần (`max_attempts=3` phía corporate-site, xem `issue_trial_code`), và mỗi lần thi lại là **thi lại chính bộ đề vừa nộp** — không nhập lại code, không gọi `buildExam()` lần nữa. `handleRetakeSameExam()` chỉ reset `answers`/`cur`/`remaining`(timer)/`result`/`resultMeta`/`saveState` rồi chuyển thẳng `screen` sang `"quiz"` — state `questions` (thứ tự câu hỏi + thứ tự đáp án đã shuffle từ lần `buildExam()` đầu tiên) giữ nguyên không đổi. `verifyInfo.is_first_attempt` được set `false` cục bộ để không gửi lại `survey` ở các lần nộp sau. Nút "もう一度" chỉ hiện khi `resultMeta.remainingAttempts` (lấy từ response `accepted` gần nhất) là `null` (chưa biết, mặc định cho hiện) hoặc `>0`; khi về 0 thì ẩn nút, thay bằng thông báo đã dùng hết lượt trải nghiệm miễn phí + CTA nâng cấp. Nếu còn kết quả gửi dở (`saveState.retryable`) vẫn giữ `window.confirm()` trước khi cho tiếp tục, giống `handleRetake()`. **Khác với full mode**: nút "もう一度（新しい問題）" của full vẫn dùng `handleRetake()` — quay lại gate, nhập lại code, rút đề mới — hành vi này không đổi.

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
  - ⚠️ **TRIAL gửi payload theo đúng shape này, KHÔNG đổi field, nhưng thang điểm đã đổi (2026-07, cùng đợt chuyển sang 20 câu cố định)**: `sections[].correct/total` **luôn là số câu** (không đổi, xem trên) nên không bị ảnh hưởng. Nhưng `total_score` (và `sectScore` nội bộ dùng để tính nó) giờ dùng **đúng trọng số điểm/câu như đề thật** (93 điểm tối đa, lệch nhau theo sect: 衛生管理 tối đa 32, 飲食物調理 12, 接客全般 21, 店舗運営 28) — **khác với trước đây** khi trial luôn là thang 40 điểm phẳng (`per=1` mỗi câu, nên "điểm" và "số câu đúng" trùng nhau). Vì `exam_results` có `access_code` để tra ra `plan_type`, mọi thống kê/AI-feedback phía corporate-site đọc bảng này **phải lọc/chuẩn hóa theo `plan_type` trước khi so sánh hoặc gộp**, không được trộn thang điểm của trial (nay là 93, trước là 40) với 250 của full. ⚠️ **Cần đối chiếu lại phía corporate-site** (đặc biệt logic Phase 6 AI feedback/section trend) xem có chỗ nào đang giả định trial luôn là thang 40 điểm hay không — thay đổi này **chưa được xác nhận đồng bộ 2 đầu** tại thời điểm viết (khác với thay đổi trước đó liên quan đến `plan_type` filter, đã xác nhận). Nếu sau này cần thêm field nhận diện tường minh (ví dụ `"mode":"trial"|"full"`) vào payload **request** (ssw2-exam → corporate-site), đó là thay đổi contract — phải đồng bộ 2 đầu trước, không tự ý thêm field một phía.
- Chấp nhận (`accepted:true`, HTTP 200): `{ accepted, attempt_number, remaining_attempts }` — dùng để hiển thị "受験 N回目・残りM回" trên màn kết quả.
- Từ chối (`accepted:false`): `{ accepted, reason }`, `reason` ∈ `"invalid_request"` (HTTP 400) | `"not_found" | "revoked" | "expired" | "exhausted" | "exam_type_mismatch"` (HTTP 200) — cùng map qua `CODE_REASON_MESSAGES`.

## Test local

`tools/mock-api.js` mô phỏng 2 endpoint trên đúng theo contract ở trên (không có dependency ngoài Node built-in `http`). Đã verify bằng Playwright qua các kịch bản: lần đầu (đủ luồng gate→survey→start→quiz→result), lần sau (bỏ qua survey), hết lượt/hết hạn/bị thu hồi (chặn ở gate với đúng message theo `reason`), mã sai (`not_found`), thiếu `access_code` (`invalid_request`, HTTP 400) — payload gửi đi đúng contract, không phát sinh lỗi console.

Mã test cho chế độ FULL/TRIAL (xem comment header `tools/mock-api.js`): `TEST-STAFF` (`plan_type="staff"`, FULL/55問), `TEST-TRIAL-FIRST`/`TEST-TRIAL-REPEAT` (`plan_type="trial"`, TRIAL/20問固定, lần đầu/lần sau), `TEST-UNKNOWN-PLAN` (`plan_type="beta"` — không thuộc whitelist nào, phải bị chặn ở gate với message "不明なプランです").

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
