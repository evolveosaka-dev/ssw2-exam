# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULE #1 — KHÔNG được đụng vào logic ra đề và logic chấm điểm

**TUYỆT ĐỐI KHÔNG thay đổi hành vi của hai khối logic sau, trừ khi người dùng yêu cầu tường minh và rõ ràng bằng lời:**

1. **Logic ra đề** — hàm `buildExam()` trong `index.html` (~dòng 197-218) và hằng số `BLUEPRINT` (~dòng 178-191).
   - Cách chọn số câu mỗi `sect`/`part` theo blueprint, cơ chế fallback khi thiếu câu (`extra`), cách `shuffle()` thứ tự 4 đáp án và remap lại `answer`/`why_wrong` index — giữ nguyên y hệt.
2. **Logic chấm điểm** — hàm `finishExam()` trong `index.html` (~dòng 254-273).
   - Cách tính `sectScore`, `total`, `maxTotal`, so sánh với `PASS_MARK` để ra `passed` — giữ nguyên y hệt.
   - Các hằng số `PASS_MARK = 163`, `TOTAL_MARK = 250`, `EXAM_MINUTES = 70` không được đổi trừ khi được yêu cầu trực tiếp.

Mọi thay đổi khác (UI, màn hình gate access code, nguồn dữ liệu câu hỏi, endpoint/định dạng gửi kết quả, thêm ngành/topic...) đều được phép, **miễn là không chạm vào hai vùng trên**. Nếu một thay đổi bắt buộc phải sửa `buildExam`/`finishExam` (ví dụ: mở rộng sang nhiều ngành với blueprint khác nhau), phải dừng lại và hỏi lại người dùng trước khi sửa, không tự ý suy diễn.

## Tổng quan dự án

Đây là site thi thử "外食業 特定技能2号 技能測定試験" (luyện thi kỹ năng đặc định số 2 - ngành ẩm thực/nhà hàng, Nhật Bản), chạy tĩnh trên GitHub Pages, không có backend riêng.

## Lệnh thường dùng

Không có build step, không có package.json, không có test suite. Đây là 1 file HTML tĩnh duy nhất.

- **Chạy thử local**: mở trực tiếp `index.html` bằng trình duyệt, hoặc serve qua bất kỳ static server nào (vd. `npx serve .`) để tránh giới hạn CORS/file:// nếu cần test fetch.
- **Deploy**: push lên nhánh mà GitHub Pages đang trỏ tới — không có CI/build pipeline.
- Không có linter/formatter/test runner được cấu hình trong repo.

## Kiến trúc

Toàn bộ ứng dụng nằm trong **một file duy nhất `index.html`** (~247KB, phần lớn dung lượng là do ngân hàng câu hỏi nhúng dạng JSON trên 1 dòng). Không có module, không có bundler — React 18 UMD + Babel standalone được load qua CDN (`unpkg`), code viết trực tiếp trong thẻ `<script type="text/babel">` ở cuối file và Babel compile ngay trên trình duyệt lúc runtime.

### Ngân hàng câu hỏi

Nhúng dưới dạng `<script type="application/json" id="question-bank">` (một dòng JSON dài), được đọc bằng `JSON.parse(document.getElementById("question-bank").textContent)` thành `QUESTION_BANK`. Mỗi câu hỏi có schema:

```
{ sect, part, q, options: [4 phần tử], answer (index đúng),
  explain, why_wrong: {"1":..., "2":..., "3":...}, img? }
```

- `sect` ∈ {`eisei`, `chori`, `sekkyaku`, `tenpo`} — 4 mảng kiến thức (vệ sinh, chế biến, tiếp khách, vận hành cửa hàng).
- `part` ∈ {`gakka`, `jitsugi`} — phần lý thuyết (gakka) và phần thực hành/phán đoán (jitsugi).
- Hiện có 327 câu, chỉ cho ngành ẩm thực (特定技能2号).

### Flow thi (component `App`, state machine qua `screen`)

`start` → `quiz` → `result`:

1. **start**: nhập tên (bắt buộc)/email/phone. `startExam()` gọi `buildExam()` để tạo đề ngẫu nhiên theo `BLUEPRINT` (số câu + điểm/câu mỗi sect×part), shuffle thứ tự đáp án từng câu.
2. **quiz**: đếm ngược `EXAM_MINUTES` phút, tự nộp khi hết giờ; lưu lựa chọn vào state `answers` theo `q.id`.
3. `finishExam()`: chấm điểm, tạo object `result`, chuyển sang **result**, đồng thời gọi `sendResult(res)`.
4. **result**: hiển thị điểm theo sect, đúng/sai từng câu kèm giải thích (`explain`) và lý do sai từng đáp án (`why_wrong`).

### Gửi kết quả

`sendResult()` POST kết quả (dạng `application/x-www-form-urlencoded` qua `URLSearchParams`, `fetch` với `mode:"no-cors"` — fire-and-forget, không đọc được response) tới `WEBHOOK_DEFAULT`, một URL webhook Make.com (Integromat) cứng trong code (~dòng 176). Make.com nhận payload rồi tự đẩy tiếp sang Google Sheets ở ngoài repo — không có API tự viết, không có backend trong repo này.
