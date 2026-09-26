# Quản lý bán hàng và nhập kho

Ứng dụng web gồm frontend HTML/CSS/JavaScript thuần và backend Node.js/Express/MongoDB/Mongoose.

## Chạy ứng dụng

Yêu cầu Node.js 20+ và MongoDB đang chạy (local hoặc MongoDB Atlas). Dùng MongoDB replica set để thao tác xác nhận đơn có transaction; Atlas hỗ trợ sẵn. Nếu dùng Docker, khởi động MongoDB như sau:

```bash
docker compose up -d
docker compose exec mongo mongosh --quiet --eval 'rs.initiate()'
```

Lệnh `rs.initiate()` chỉ cần chạy một lần. Nếu dùng MongoDB đã cài trên máy, bật replica set trước khi xác nhận đơn hoặc kiểm kê.

```bash
cp .env.example .env
npm install
npm start
```

Mở http://localhost:3000. Sửa `MONGODB_URI` trong `.env` nếu cần. Có thể chạy `npm run dev` để tự khởi động lại khi sửa backend.

## Ba trang bán set bánh kẹo

1. **Nhập bánh kẹo** — mở `/candies.html`, nhập tên, mã, giá mua cho 1 đơn vị và số lượng còn. Có thể sửa giá hoặc kiểm kê tồn sau này.
2. **Gói một set** — mở `/set.html`, bấm chọn từng loại, chỉnh số lượng, tiền bao bì và giá bán, rồi lưu công thức.
3. **Tất cả set** — mở `/sets.html`, dùng ô “Tự tạo set” ngay trên trang: đặt tên, chọn bánh kẹo và số lượng, thêm tiền bao bì, nhập giá bán; trang tự tính giá cost và lời một set. Có thể lưu hoặc “Lưu set & thêm giỏ”. Mọi thẻ set hiển thị giá cost, giá bán, ĐỦ HÀNG hoặc THIẾU HÀNG và số món thiếu.
4. **Giỏ hàng / Thanh toán** — mở `/checkout.html` hoặc bấm “Thêm giỏ” tại “Tất cả set”. Chỉnh số set, xem tổng tiền theo **giá bán**, tổng giá cost và lời dự kiến, chọn tiền mặt/chuyển khoản rồi xác nhận đã nhận tiền. Backend tính lại giá và tồn kho, cộng bánh kẹo dùng chung cho toàn giỏ, lưu đơn và trừ kho trong cùng một giao dịch.
5. **Lịch sử bán** — mở `/sales-history.html` để xem doanh thu và từng đơn; bấm đơn để xem chi tiết nội bộ và nút “Xem / In bill cho khách”. Bill mở ở `/receipt.html?id=...`, in hoặc lưu PDF bằng chức năng In của trình duyệt. Bill chỉ có tên khách, thời gian, set, số lượng, đơn giá, tổng tiền và hình thức thanh toán; không có giá cost, lời hoặc nguyên liệu. Dữ liệu của đơn được lưu tại lúc thanh toán, kể cả khi công thức set thay đổi sau này.

Giá cost được tính từ giá mua hiện tại của các loại bánh kẹo và tiền bao bì; giá bán do người dùng nhập và phải lớn hơn 0. Lời dự kiến = tổng giá bán − tổng giá cost, chưa tính chi phí vận chuyển, phí sàn hoặc chi phí khác. Trạng thái được tính để gói **một set** của mỗi công thức. Số set tối đa hiển thị trên mỗi thẻ là phép tính độc lập; trang thanh toán sẽ kiểm tra lại **toàn bộ giỏ** trước khi trừ kho. Lưu công thức chưa trừ tồn kho hoặc lập đơn bán. Giỏ hàng tạm lưu trong trình duyệt đang dùng; lịch sử bán lưu trong MongoDB. Bấm xác nhận thanh toán nghĩa là người bán đã nhận tiền; trang này chưa kết nối cổng thanh toán ngân hàng.

Trên điện thoại có thanh điều hướng cố định ở cuối màn hình: Kho bánh, Gói set, Các set, Giỏ hàng và Lịch sử. Trang nhập bánh kẹo hiển thị mỗi món thành một thẻ, còn trang gói set có thanh giá vốn và nút chuyển nhanh đến set đang tạo. Giao diện sử dụng trên trình duyệt điện thoại với cùng địa chỉ máy chủ (không có ứng dụng di động riêng).

## Chức năng

- Tổng quan doanh thu, số đơn, hàng sắp hết.
- Các trang riêng nhập bánh kẹo, chọn món gói set và xem tất cả set; tính giá vốn, lãi dự kiến và số món thiếu.
- Sản phẩm: SKU, giá vốn, giá bán, mức tồn tối thiểu; tìm kiếm, sửa, ẩn sản phẩm.
- Nhà cung cấp và khách hàng: thêm, sửa, tìm kiếm.
- Đơn nhập/đơn bán: tạo nháp nhiều dòng, xác nhận hoặc hủy; theo dõi thanh toán.
- Tồn kho: số lượng hiện tại, lịch sử biến động, điều chỉnh qua kiểm kê.
- Báo cáo doanh thu, lợi nhuận gộp ước tính, hàng bán chạy theo khoảng ngày.
- Socket.IO cập nhật các trang đang mở khi dữ liệu thay đổi.

Đơn nháp không ảnh hưởng kho. Xác nhận đơn nhập tăng kho và cập nhật giá nhập hiện tại theo đơn nhập vừa xác nhận; xác nhận đơn bán chỉ thành công nếu đủ kho. Giá vốn trong trang tính set dùng giá nhập hiện tại của từng sản phẩm. Lưu công thức không trừ kho và chưa tạo đơn bán. Các dòng đơn lưu giá và tên tại thời điểm tạo. Sau khi xác nhận, không sửa hàng hoặc xóa đơn; thao tác kiểm kê ghi lịch sử riêng. Giá trị tiền dùng đơn vị đồng nguyên (VND).

Ứng dụng mẫu chưa có đăng nhập và phân quyền: chỉ triển khai trong mạng tin cậy khi chưa bổ sung xác thực. Chưa tích hợp hóa đơn điện tử, vận chuyển, máy quét mã vạch hoặc trả hàng.

## API

`POST /api/candies`, `PATCH /api/candies/:id`; `GET/POST /api/products`, `PATCH/DELETE /api/products/:id`; `GET/POST /api/partners`, `PATCH /api/partners/:id`; `GET/POST /api/bundles`, `PATCH/DELETE /api/bundles/:id`; `GET/POST /api/bundle-sales`, `GET /api/bundle-sales/:id`; `GET /api/receipts/:id` (bill khách hàng, không có giá vốn/lời); `GET/POST /api/orders?type=purchase|sale`, `GET /api/orders/:id`, `POST /api/orders/:id/confirm`, `POST /api/orders/:id/cancel`, `PATCH /api/orders/:id/payment`; `GET /api/inventory`, `GET /api/movements`, `POST /api/inventory/adjust`; `GET /api/dashboard`, `GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`; `GET /api/health`.

## Cấu trúc

```
server.js                 Express, API và quy tắc nghiệp vụ
public/index.html         Giao diện quản trị
public/candies.html       Nhập giá mua và tồn từng loại bánh kẹo
public/set.html           Chọn món gói thành một set
public/sets.html          Tất cả set và trạng thái thiếu/đủ
public/checkout.html      Giỏ hàng và xác nhận thanh toán
public/sales-history.html Lịch sử và chi tiết đơn bán
public/receipt.html       Bill khách hàng để xem, in hoặc lưu PDF
receipt-view.js           Lọc trường thông tin trước khi gửi bill
public/style.css          Giao diện responsive
public/app.js             Tương tác và gọi API
public/set.js             Tính giá và lưu công thức set
public/stock-status.js    Tính tồn và món thiếu theo từng set
public/cart-availability.js Cộng nhu cầu bánh kẹo trong giỏ
```

### Theo dõi hàng sắp hết và món thêm theo yêu cầu

- Trang **Nhập bánh kẹo** hiện danh sách cần nhập ở đầu trang khi số lượng của bất kỳ món nào còn dưới 3 (0–2).
- Trong **Tất cả set**, chọn **+ Thêm món** ở một set để thêm một loại bánh kẹo, số lượng mỗi set và khoản tiền khách trả thêm. Giỏ hàng giữ set tùy chỉnh riêng với set gốc. Khi thanh toán, hệ thống tính tồn kho, giá vốn và tiền lời cho món thêm, trừ kho và lưu chi tiết vào lịch sử. Bill khách chỉ hiển thị tên set kèm món thêm và giá bán, không hiện giá vốn/lời.

### Ảnh riêng cho mỗi set

Khi tạo set trong **Tất cả set** hoặc chỉnh set ở **Gói một set**, chọn ảnh JPG, PNG hoặc WebP (tối đa 10 MB). Ảnh được thu nhỏ và lưu cùng set trong MongoDB; ảnh hiển thị ngay trên thẻ set. Set đã tạo trước đây có thể thêm ảnh bằng nút **Sửa set**.
