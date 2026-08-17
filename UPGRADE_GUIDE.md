# FoxyCookieManager - Hướng dẫn nâng cấp

## Tổng quan thay đổi

Extension đã được nâng cấp với giao diện hiện đại hơn, bảo mật tốt hơn và tuân thủ Manifest V3.

## Files mới được tạo

1. **popup-new.html** - HTML mới với box cảnh báo bảo mật
2. **popup-styles.css** - CSS hiện đại với dark mode và animations
3. **manifest-new.json** - Manifest V3 được tối ưu

## Các thay đổi chính

### 1. Giao diện (UI/UX)

#### Dark Mode hiện đại
- Màu nền gradient mượt mà với glow effects
- Palette màu tối ưu cho cả light và dark mode
- Contrast tốt hơn, dễ đọc hơn

#### Animations & Transitions
- **Fade in**: Popup xuất hiện mượt mà
- **Scale in**: Hiệu ứng zoom nhẹ khi mở
- **Hover effects**: Buttons và tabs có hiệu ứng hover mượt
- **Active state**: Tab active có gradient đẹp với shadow

#### Tabs
- Bo góc mềm mại (14px border-radius)
- Icon rõ ràng, scale lên khi active
- Gradient background khi active
- Hover effect mượt mà

#### Textarea
- Font monospace dễ đọc (SF Mono, Monaco, Consolas)
- Border sáng nhẹ khi focus
- Background thay đổi khi focus
- Placeholder opacity tối ưu

#### Buttons
- Shadow đồng nhất cho tất cả buttons
- Hover: translateY(-2px) + shadow tăng
- Active: translateY(0)
- Gradient overlay khi hover

### 2. Bảo mật

#### Box cảnh báo bảo mật
- Xuất hiện ở mỗi tab (Facebook, Instagram, Meta)
- Nền vàng/cam tối nhẹ, hợp dark mode
- Icon cảnh báo SVG
- Nội dung tiếng Việt rõ ràng:
  > "Cảnh báo bảo mật: Cookie đăng nhập có thể cho phép truy cập tài khoản của bạn. Không chia sẻ, sao chép hoặc gửi cookie cho bất kỳ cá nhân/tổ chức nào không đáng tin cậy. FoxyCookieManager không chịu trách nhiệm nếu bạn tự ý cung cấp cookie cho bên thứ ba."

#### Privacy Notice
- Xuất hiện ở tab Manager
- Nền xanh nhẹ với icon info
- Thông báo:
  > "Dữ liệu cookie chỉ được lưu cục bộ trên trình duyệt của bạn, không tự động gửi lên máy chủ."

### 3. Manifest V3 (manifest-new.json)

#### Tuân thủ Chrome Web Store
- ✅ Manifest version 3
- ✅ Service worker thay vì background scripts
- ✅ Permissions tối thiểu cần thiết
- ✅ Host permissions cụ thể (không dùng <all_urls>)
- ✅ Content Security Policy nghiêm ngặt
- ✅ Description rõ ràng về privacy

#### Permissions được tối ưu
```json
"permissions": [
  "cookies",      // Cần thiết để đọc/ghi cookies
  "storage",      // Lưu cookies cục bộ
  "activeTab"     // Chỉ truy cập tab đang active
]
```

#### Host permissions cụ thể
```json
"host_permissions": [
  "*://*.facebook.com/*",
  "*://*.instagram.com/*",
  "*://*.meta.com/*"
]
```

#### Content Security Policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```
- Chỉ cho phép script từ extension
- Không cho phép eval(), new Function()
- Không cho phép remote code execution

### 4. Code an toàn

#### background.js
- ✅ Không có eval()
- ✅ Không có new Function()
- ✅ Không tải script từ remote
- ✅ Chỉ set uninstall URL

#### popup.js
- ✅ Không có remote code execution
- ✅ Chỉ sử dụng chrome.storage.local
- ✅ Không gửi dữ liệu lên server
- ✅ Tất cả xử lý đều local

## Cách áp dụng

### Option 1: Thay thế hoàn toàn (Khuyến nghị)
```bash
# Backup file cũ
mv popup.html popup-old.html
mv manifest.json manifest-old.json

# Sử dụng file mới
mv popup-new.html popup.html
mv manifest-new.json manifest.json
```

### Option 2: Giữ cả hai để test
- Giữ nguyên file cũ
- Test với popup-new.html và manifest-new.json
- Sau khi test OK, thay thế

## Checklist trước khi upload lên Chrome Web Store

- [ ] Đã test extension trên Chrome
- [ ] Tất cả chức năng hoạt động bình thường
- [ ] Không có console errors
- [ ] Box cảnh báo bảo mật hiển thị đúng
- [ ] Privacy notice hiển thị ở tab Manager
- [ ] Animations mượt mà
- [ ] Dark/Light mode hoạt động
- [ ] Manifest version 3
- [ ] Không có code bị minify/obfuscate
- [ ] Description rõ ràng về privacy
- [ ] Icons đầy đủ (16, 48, 128)

## Lưu ý quan trọng

### Để tránh bị Google cảnh báo:

1. **Không minify code** khi upload lên Chrome Web Store
2. **Giữ nguyên format** của popup.js (đã có sẵn, không cần chỉnh)
3. **Manifest V3** bắt buộc cho extension mới
4. **Description** phải nói rõ về privacy
5. **Permissions** chỉ xin những gì thật sự cần
6. **Host permissions** cụ thể, không dùng <all_urls>
7. **CSP** nghiêm ngặt để tránh XSS

### Privacy Policy (nên có)
Nếu Chrome Web Store yêu cầu, tạo trang privacy policy đơn giản:
- Extension chỉ lưu cookie cục bộ
- Không thu thập dữ liệu người dùng
- Không gửi dữ liệu lên server
- Người dùng tự chịu trách nhiệm khi chia sẻ cookie

## Kết quả

✅ Giao diện hiện đại, đẹp hơn, mượt hơn
✅ Dark mode chuyên nghiệp
✅ Animations và transitions mượt mà
✅ Cảnh báo bảo mật rõ ràng
✅ Privacy notice minh bạch
✅ Tuân thủ Manifest V3
✅ Giảm nguy cơ bị Google cảnh báo/vô hiệu hóa
✅ Code sạch, không có security issues

## Hỗ trợ

Nếu có vấn đề, kiểm tra:
1. Console errors trong DevTools
2. Manifest format đúng JSON
3. Tất cả icon files tồn tại
4. popup.js không bị lỗi syntax
