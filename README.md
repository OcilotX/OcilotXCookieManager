# FoxyCookieManager

Chrome Extension (Manifest V3) quản lý cookie đăng nhập **Facebook**, **Instagram** và **Meta** — lấy, sao chép, lưu trữ và đổi nhanh giữa nhiều tài khoản ngay trong trình duyệt.

> Extension tĩnh, không cần build. Toàn bộ dữ liệu lưu cục bộ trong máy bạn.

---

## Tính năng

| Nhóm | Chi tiết |
|------|----------|
| **Đăng nhập** | `Login` (cookie đầy đủ) và `Login 4D` (chỉ 4 dòng an toàn — xem bên dưới) |
| **Cookie** | Tự lấy cookie theo tên cố định cho từng nền tảng, `Copy` 1 chạm, `Clear` sạch cookie domain |
| **Quản lý (tab Manager)** | Lưu tối đa 50 cookie/nền tảng, đổi tên, xóa, phát hiện & xử lý trùng ID |
| **Sao lưu** | `Export` / `Import` toàn bộ cookie đã lưu ra file JSON |
| **Định danh** | Tự hiển thị UID (Facebook) và `ds_user_id` (Instagram) |
| **Giao diện** | Theme Sáng / Tối / Theo hệ thống |

### Login 4D

Phương pháp đăng nhập chỉ dùng **4 cookie**: `datr`, `fr`, `sb`, `wd`.

- **Cố tình bỏ `c_user` và `xs`** — hai cookie chứa phiên đăng nhập đầy đủ.
- An toàn hơn khi cần chia sẻ cookie hoặc dùng trên nhiều thiết bị, giảm rủi ro lộ session.

---

## Cài đặt

**Load unpacked (khuyên dùng khi phát triển):**

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. **Load unpacked** → chọn thư mục repo này
4. Ghim icon extension cho tiện

**Đóng gói phát hành:** chạy `sh pack.sh` để tạo `foxycookiemanager-v<version>.zip` chỉ gồm file runtime.

---

## Cách dùng

1. Mở popup → extension tự chọn tab theo trang đang mở (Facebook / Instagram / Meta).
2. Cookie của nền tảng hiện ra trong ô văn bản:
   - **Login** — đăng nhập bằng cookie đầy đủ trong ô.
   - **Login 4D** — đăng nhập an toàn với 4 dòng cookie.
   - **Copy** — sao chép chuỗi cookie.
   - **Clear** — xóa sạch cookie của nền tảng đó.
   - **Save** — lưu cookie vào tab **Manager**.
3. Tab **Manager**: xem/đăng nhập lại/đổi tên/xóa cookie đã lưu, và **Export/Import** để sao lưu.

> Trùng ID khi lưu sẽ hiện hộp thoại: **Ghi đè** / **Tạo mới** (`[n]`) / **Hủy**.

---

## Quyền riêng tư & Bảo mật

- Cookie chỉ lưu **cục bộ** qua `chrome.storage.local`, **không** gửi lên bất kỳ máy chủ nào.
- Quyền yêu cầu: `cookies`, `tabs`, `storage` (chỉ trên domain Facebook / Instagram / Meta).
- **Cookie đăng nhập rất nhạy cảm** — không chia sẻ, sao chép hay gửi cho bên không tin cậy.

---

## Kiến trúc (tóm tắt)

ES modules native, không bundler. Logic tách theo mối quan tâm trong `src/`:

- `platforms.js` — nguồn config duy nhất cho từng nền tảng
- `cookies.js` — hàm thuần xử lý chuỗi cookie (có self-check: `node src/cookies.js`)
- `browser.js` — wrap `chrome.cookies` / `chrome.tabs`
- `storage.js` — CRUD cookie đã lưu + export/import
- `ui.js`, `theme.js`, `popup.js` — giao diện & entry point

Chi tiết cho lập trình viên: xem [`CLAUDE.md`](CLAUDE.md).

---

## Miễn trừ trách nhiệm

Tiện ích phục vụ mục đích quản lý cookie cá nhân và học tập. Người dùng tự chịu trách nhiệm về cách sử dụng cookie của mình. Tác giả không chịu trách nhiệm nếu bạn tự nguyện cung cấp cookie cho bên thứ ba.

---

## Tác giả

Created by **OcilotX** — [ocilotx.com](https://ocilotx.com)

Cộng đồng Telegram: [tham gia tại đây](https://t.me/+0xmbWF_0L3QwMDA1)
