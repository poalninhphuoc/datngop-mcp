## Mục đích

Cho công cụ AI (Claude, GPT) **tìm tài sản so sánh (TSSS), kiểm tra và đưa vào hàng chờ duyệt** của DatNgop thay cho việc điền tay file `mau-import-bai-dang.xlsx`. AI chỉ **đọc hiểu tin đăng và chọn đúng danh mục**; mọi phép tính và lọc do backend thực hiện (đã có test đối chiếu sheet "Kiểm tra tính toán"). Tin nhập vào là **nháp chờ nhân viên duyệt**, chưa lên bản đồ công khai.

## Các thành phần

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| **Backend** | `https://api.datngop.com/api` (`datngop-be`) | Khoá API hạn chế quyền; route tra cứu/kiểm tra TSSS; nhập tin vào hàng chờ duyệt; ghi nhật ký |
| **Trang quản lý khoá** | Web → Hệ thống → *Khoá API cho AI/MCP* (`/he-thong/khoa-api`) | Admin tạo / thu hồi khoá, xem nhật ký từng khoá |
| **MCP server** | `datngop-mcp` (stdio) — phát hành dạng file đơn `datngop-mcp.mjs`, gói npm hoặc mã nguồn | Cho Claude Desktop / Claude Code gọi 7 công cụ |
| **GPT Action** | `openapi-ai-tsss.yaml` | Cho Custom GPT gọi cùng API |
| **Bộ mẫu test** | `datngop-mcp/mau-test` | Dữ liệu có đáp án, 3 bài test, script kiểm tra nhanh |

```
 Claude (Desktop/Code) ──MCP stdio──► datngop-mcp ──┐
                                                    ├── x-khoa-api (https) ──► api.datngop.com ──► PostgreSQL
 GPT (Custom GPT Actions) ──────────────────────────┘          │
                                                               ├─ nhật ký hệ thống (mọi lần dùng, từng tin nhập)
 Admin ──► Web /he-thong/khoa-api ── tạo / thu hồi / xem nhật ký ┘
```

## Luồng làm việc

1. Người dùng giao việc cho AI: vị trí tài sản thẩm định, loại đất, loại đường.
2. AI tìm tin trên web, lấy toạ độ, gọi **tra địa chỉ** và **tra giá Nhà nước**.
3. AI trích dữ liệu từng tin (giá, diện tích, số tầng, loại đường…) và gọi **kiểm tra TSSS**: backend tính đơn giá đất gốc, lọc khoảng giá, so trung vị ±20%, trả danh sách GIỮ/LOẠI.
4. AI lập các dòng nhập, gọi **chạy thử** (không ghi) → nhận lỗi theo dòng và mã `dauVan`; báo cáo cho người dùng.
5. **Người dùng đồng ý** → AI nhập thật (kèm `dauVan`) → tin vào **hàng chờ duyệt**.
6. Nhân viên duyệt/từ chối trên web (Bất động sản → Bài đăng → lọc "Chờ duyệt"); Admin xem nhật ký của khoá bất cứ lúc nào.

## Cam kết an toàn

| Yêu cầu | Cách đáp ứng |
|---|---|
| Hạn chế quyền | Khoá chỉ vào được đúng route tra cứu và route nhập; **mọi route sửa/xoá/duyệt trả 403**. Khoá gắn với một tài khoản nhân viên **không phải Admin** và chỉ làm được trong quyền tài khoản đó |
| Không gây mất dữ liệu | Khoá **không có thao tác sửa/xoá**. Nhập chỉ **thêm**, vào hàng chờ duyệt; bắt buộc chạy thử + `dauVan`; tối đa 50 dòng/lần; nhập lại cùng lô chỉ báo trùng |
| Ghi nhật ký đầy đủ | Mỗi lần dùng khoá (kể cả bị từ chối), tạo/thu hồi khoá, nhập lô và **từng tin được nhập** (nội dung dữ liệu, link gốc, không lưu SĐT) đều vào Nhật ký hệ thống |
| Khoá an toàn | Chỉ lưu băm; hiện đúng một lần lúc tạo; có hạn (mặc định 90 ngày); thu hồi có hiệu lực tức thì; giới hạn tốc độ; chỉ gửi qua https |

## Các bước đưa vào sử dụng (go-live)

| # | Việc | Ai làm |
|---|---|---|
| 1 | **Duyệt và chạy SQL tạo bảng `khoa_api`** trên DB thật (chỉ thêm một bảng mới, không đổi bảng cũ) — SQL ở phần "Backend", mục 2.1 | Người vận hành DB |
| 2 | **Deploy backend** lên `api.datngop.com` (bản có tính năng khoá API) | Người vận hành |
| 3 | **Build + deploy web** (sau backend — rewrite `/api/*` cố định lúc build) | Người vận hành |
| 4 | Tạo tài khoản nhân viên riêng cho AI (vai trò User, chỉ quyền bài đăng xem + thêm) | Admin |
| 5 | Vào trang **Khoá API cho AI/MCP** → *Tạo khoá* → chép khoá (chỉ hiện một lần) | Admin |
| 6 | Cài MCP trên máy người dùng: nhận **file đơn `datngop-mcp.mjs`** (chỉ cần Node ≥ 20), cấu hình Claude/GPT theo hướng dẫn hoặc đưa file cấu hình tải từ trang quản lý khoá cho AI tự cài | Người dùng AI |
| 7 | Chạy `python3 kiem_tra_nhanh.py`, rồi bài test 1 → 3 → 2 | Người dùng AI |
| 8 | Xong đợt test: **thu hồi khoá thử**, tạo khoá dùng thật hiệu lực phù hợp | Admin |

## Trang quản lý khoá (web)

**Đường dẫn:** Hệ thống → *Khoá API cho AI/MCP*. **Chỉ Admin** thấy nội dung; người khác chỉ thấy thông báo không đủ quyền (máy chủ cũng chặn).

**Danh sách khoá.** Mỗi khoá hiển thị: tên gợi nhớ, vài ký tự đầu (nhận diện), trạng thái (*Đang hoạt động* / *Hết hạn* / *Đã thu hồi*), phạm vi (*Tra cứu*, *Nhập bài đăng*), tài khoản gắn khoá, ngày tạo, ngày hết hạn, số lần dùng và lần dùng cuối. Khoá thật và băm **không bao giờ** hiển thị lại sau khi tạo.

**Tạo khoá.** Nút *Tạo khoá* mở form: tên gợi nhớ; tài khoản nhân viên gắn khoá (danh sách đã loại Admin và tài khoản bị khoá); phạm vi (ít nhất một); hiệu lực (1–365 ngày, mặc định 90). Tạo xong hiện hộp thoại **một lần** với `DATNGOP_API_KEY` và `DATNGOP_API_URL` kèm nút chép. Ngay tại hộp thoại có mục **Đưa cho AI tự cấu hình**: nút *Tải file hướng dẫn cho AI (.md)* (khoá, địa chỉ API, lệnh cấu hình cho Claude Code / Claude Desktop / GPT, cách tự kiểm tra, quy tắc an toàn), *Cấu hình Claude Desktop (.json)* và *Chép nội dung*. Các file được tạo ngay trong trình duyệt từ khoá vừa tạo, **chứa khoá thật** nên chỉ đưa cho AI tin cậy và xoá sau khi dùng. Đóng hộp thoại là không xem lại được — mất khoá thì thu hồi và tạo khoá mới.

**Nhật ký.** Nút *Nhật ký* mở danh sách theo thời gian (mới nhất trước, tối đa 200 dòng): lần gọi API, lần **bị từ chối** (nhãn đỏ), tạo/thu hồi khoá, nhập lô, và từng tin đã tạo (mở rộng để xem địa chỉ, giá, diện tích, link nguồn, mã tin).

**Thu hồi.** Nút *Thu hồi* (có hộp xác nhận) làm khoá ngừng hoạt động **ngay lập tức**; không khôi phục được. Các tin khoá đã nhập vẫn nằm trong hàng chờ duyệt; lịch sử vẫn giữ trong nhật ký.

**Rà soát tin do AI nhập.** Bất động sản → Bài đăng → lọc *Chờ duyệt*. Duyệt hoặc từ chối như thường ngày; tin chưa duyệt không hiện trên bản đồ công khai.
