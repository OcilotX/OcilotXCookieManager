# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

Chrome Extension (Manifest V3) quản lý cookie đăng nhập Facebook / Instagram / Meta. Không có bước build, bundler, package manager, lint hay test — đây là extension tĩnh, load trực tiếp vào Chrome.

## Chạy & test

- **Load extension**: `chrome://extensions` → bật Developer mode → "Load unpacked" → chọn thư mục repo.
- **Sửa code**: sửa file → bấm reload trên card extension ở `chrome://extensions` → mở lại popup.
- **Debug popup**: chuột phải icon extension → "Inspect popup" (mở DevTools cho `popup.html`).
- **Debug service worker**: link "service worker" trên card extension.
- Không có test runner. Kiểm thử thủ công qua popup trên trang FB/IG/Meta thật.

## Kiến trúc

ES modules native (`<script type="module" src="src/popup.js">`), không bundler/build step. `background.js` vẫn là script thường (không import).

- **`background.js`** — service worker tối giản. Chỉ set uninstall URL và mở `welcome.html` lần cài đầu. Không xử lý cookie.
- **`popup.html` + `popup-styles.css`** — UI 4 tab: `facebook`, `instagram`, `meta`, `manager`. Tab/panel khớp qua `data-tab="X"` ↔ `id="panel-X"`.
- **`src/`** — logic tách theo mối quan tâm:
  - `platforms.js` — **nguồn config duy nhất**. `PLATFORMS[name]` chứa `cookieNames`, `storageKey`, `idField` (key lưu trong storage), `idCookie` (cookie trích ID), `getAll` (query cho `chrome.cookies.getAll` — FB/Meta dùng `{domain}`, IG dùng `{url}`), `domain` (domain để set/clear khi login), `clearDomains` (nhiều domain cần xoá), `redirect`, `idLabel`. Thêm platform = thêm 1 entry. Cũng chứa `FOUR_LINE_KEYS`, `THEME_KEY`, `MAX_SAVED` (=50).
  - `cookies.js` — pure, không chrome/DOM: `parseCookieString`, `getCookieValue`, `pickCookieKeys`, `buildCookieString`. Có self-check chạy bằng `node src/cookies.js`.
  - `browser.js` — wrap `chrome.cookies`/`chrome.tabs` thành Promise: `getAll`, `queryActiveTab`, `clearCookies`, `clearAndSetCookies`, `login`, `clearPlatform` (xoá tất cả `clearDomains` rồi redirect).
  - `storage.js` — wrap `chrome.storage.local`, gộp CRUD chung: `saveCookie` (dedup `[n]`, cap `MAX_SAVED`), `getSaved`, `deleteSaved`, `renameSaved`, `findSaved`, `exportAll` / `importAll` (backup JSON, xem dưới).
  - `theme.js` — light/dark/system.
  - `ui.js` — DOM: tab, toast, clipboard, modal (Promise), `renderSavedCookies`.
  - `popup.js` — entry: `DOMContentLoaded`, load cookie vào textarea, wire event, bảng `ACTIONS` cho delegation.

**Không** dùng React/Vite/TS/Tailwind của FoxyCrownTool (đó là SPA, không phải extension). Chỉ mượn convention: `lib/` pure logic named-export + config dạng `Record` map + data-access tập trung.

### Luồng cookie (cốt lõi cần hiểu)

- **Đọc**: khi mở popup, `chrome.cookies.getAll` lấy cookie theo domain, lọc theo danh sách tên cố định per platform, ghép thành chuỗi `name=value; ...` rồi đổ vào textarea. Danh sách tên:
  - FB: `c_user, datr, fr, sb, xs, wd`
  - IG: `mid, ig_did, datr, ig_nrcb, csrftoken, ds_user_id, sessionid, rur`
  - Meta: `fs, datr, locale, ps_l, ps_n` (chỉ đọc khi tab active là `meta.com`)
- **Login**: `clearAndSetCookies(domain, ...)` — **xóa sạch** cookie domain đó trước, rồi set từng cặp từ chuỗi textarea (expiry +10 năm), rồi `chrome.tabs.update` reload trang. Đây là cơ chế "đổi tài khoản".
- **Login 4D** (tính năng đặc trưng): `pickCookieKeys(raw, ["datr","fr","sb","wd"])` — chỉ giữ 4 cookie này, **cố tình bỏ `c_user` và `xs`** để không đăng nhập full session (an toàn khi làm via). Đừng thêm `c_user`/`xs` vào set 4D.

### Lưu trữ (`chrome.storage.local`)

Ba key mảng riêng: `savedFacebookCookies`, `savedInstagramCookies`, `savedMetaCookies`. Mỗi item: `{ id, cookie, timestamp, savedAt, name?, <idKey> }`.

- ID định danh (`idField`) khác nhau theo platform: FB dùng `uid`, IG dùng `ds_user_id`, Meta dùng `meta_id`. **Giá trị ID luôn trích từ `idCookie`** (không phải từ `idField`): FB/Meta cùng đọc cookie `c_user`, IG đọc `ds_user_id`. Vì trang Meta hiếm khi có `c_user`, Meta ID thường là `"Unknown"` — đây là hành vi cố ý, không phải bug. Khi thêm platform / sửa dedup, phải nhất quán cặp `idField`+`idCookie` ở cả save / render / dedup.
- **Dedup**: trùng ID → modal cho Overwrite / Tạo mới `[n]` / Cancel. Hậu tố `[n]` được append vào ID và parse lại bằng regex `/\[(\d+)\]$/` khắp nơi — giữ format này khi đụng logic đếm.
- Giới hạn `MAX_SAVED` (=50) item mỗi platform (`slice(0, MAX_SAVED)`), thêm mới đẩy lên đầu (`unshift`).
- Render dùng event delegation trên `#saved-cookies-list` với `data-action` + `data-id`; không gắn listener trực tiếp lên nút động.
- **Export/Import**: `exportAll()` xuất JSON `{ app, version, exportedAt, data: { <storageKey>: [...] } }` (nút "Export"); `importAll(parsed)` merge theo `id` nội bộ (bỏ item trùng `id` hoặc thiếu `cookie`/`id`), trả `{ added, skipped }`. Import **không** chạy dedup theo account-ID — chỉ theo `id` timestamp — nên có thể tạo bản trùng account.

## Lưu ý quan trọng

- **Hai manifest, một cái hỏng**: `manifest.json` (version 1.7) là bản active, trỏ `popup.html`. `manifest-new.json` (version 1.6) là bản cũ/tài liệu, trỏ `popup-new.html` **không tồn tại** — đừng copy đè nó thành `manifest.json`. `UPGRADE_GUIDE.md` mô tả migration đã xong; nội dung của nó nói về file không còn tồn tại.
- **Tăng version**: sửa `"version"` trong `manifest.json` (đang 1.7) khi phát hành.
- `manifest.json` chứa `key` + `update_url` (self-hosted CRX qua `clients2.google.com`) — không phải bản Web Store thường. Giữ nguyên `key` để extension ID ổn định.
- Cookie set với `domain` bắt đầu bằng `.` (vd `.facebook.com`); URL suy ra bằng `"https://" + domain.substring(1)`. Giữ đúng convention leading-dot khi thêm domain.
- Có `business.facebook.com` trong host_permissions nhưng chỉ được clear (không có tab UI riêng).
