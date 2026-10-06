# Bộ mẫu test — thử với Claude và GPT

Tất cả dựa trên dữ liệu có **đáp án sẵn** (sheet "Kiểm tra tính toán": hẻm 2549/13/11 Phạm Thế Hiển) để so sánh công bằng giữa các AI và giữa các lần chạy.

## Thứ tự làm

| # | Việc | Tài liệu | Cần AI? | Ghi dữ liệu? |
|---|---|---|---|---|
| 0 | **Kiểm tra kết nối khoá ↔ BE** (11 bước, ~5 giây) | `python3 kiem_tra_nhanh.py` | Không | Không (chỉ chạy thử) |
| 1 | Nối AI: Claude → `../README.md` · GPT → `huong-dan-gpt.md` | | | |
| 2 | **Bài 1** — dữ liệu có sẵn, kết quả đã biết | `01-test-khong-can-web.md` | Có | Không |
| 3 | **Bài 3** — rào chắn an toàn (thử bắt AI làm điều cấm) | `03-test-an-toan.md` | Có | Không (ca ghi chỉ vào hàng chờ duyệt) |
| 4 | **Bài 2** — tìm tin thật trên web | `02-test-tim-tin-that.md` | Có + web | Không (chỉ chạy thử) |
| 5 | (Tuỳ chọn) nhập thật 5 tin thử, kiểm hàng chờ duyệt + nhật ký, rồi **Từ chối** để dọn | cuối bài 1 | Có | **Có** — 5 tin "TEST -" chờ duyệt |

## Tệp
| Tệp | Dùng cho |
|---|---|
| `kiem_tra_nhanh.py` | Bước 0 — script Python thuần (không cài thư viện). `DATNGOP_API_KEY=dnk_… python3 kiem_tra_nhanh.py` (mặc định `https://api.datngop.com/api`) |
| `tsss-pham-the-hien.json` | Dữ liệu chuẩn: TSTD + 11 tin + 12 văn bản tin + đáp án (`ketQuaMongDoi`). Được BE kiểm tự động (`mau-test-tsss.spec.ts`) để không lệch logic |
| `01-…`, `02-…`, `03-…` | Ba bài test: prompt dán sẵn, đáp án, bảng chấm điểm |
| `gpt-instructions.txt` | Dán vào ô Instructions của Custom GPT (5.086/8.000 ký tự) |
| `openapi-ai-tsss.yaml` | Schema cho Custom GPT Actions (server `https://api.datngop.com`, header `x-khoa-api`) |
| `huong-dan-gpt.md` | Cách nối GPT (Actions hoặc Agents SDK) + bảng so sánh Claude ↔ GPT |

## Khoá dùng để test
Tạo ở **Hệ thống → Khoá API cho AI/MCP** (`/he-thong/khoa-api`): tài khoản nhân viên riêng (quyền bài đăng: xem + thêm), phạm vi *Tra cứu* + *Nhập bài đăng*, hiệu lực ngắn (vd 7 ngày) cho đợt test. **Xong đợt test → Thu hồi khoá.** Sau mỗi bài, mở **Nhật ký** của khoá để đối chiếu AI đã gọi gì.

## Điều kiện để test chạy được
- BE `api.datngop.com` đã deploy **bản có tính năng này** và đã tạo bảng `khoa_api` (SQL ở `../../datngop-be/docs/ket-noi-ai-api.md` mục 2.1). Chưa có bảng → `kiem_tra_nhanh.py` báo lỗi ngay ở bước 1 (HTTP 500, "Lỗi cơ sở dữ liệu").
- Bước 4 của `kiem_tra_nhanh.py` (giá Nhà nước) và các bài có dùng giá Nhà nước cần dữ liệu `GiaDatNhaNuoc` có sẵn trong DB (BOT2).
