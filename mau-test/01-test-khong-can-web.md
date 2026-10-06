# Bài test 1 — Kết quả đã biết, không cần tìm web

**Mục đích:** kiểm tra AI (Claude/GPT) dùng đúng công cụ DatNgop và áp đúng quy tắc **trên dữ liệu có đáp án sẵn**: đọc hiểu tin → phân loại đường → khử trùng → giao `kiem_tra_tsss` tính → báo cáo → chạy thử nhập. Không phụ thuộc web nên kết quả lặp lại được giữa các lần chạy và giữa các AI.
**Dữ liệu:** `tsss-pham-the-hien.json` (lấy từ sheet "Kiểm tra tính toán" — hẻm 2549/13/11 Phạm Thế Hiển). Văn bản tin dưới đây là bản soạn lại cho bài test, không phải nguyên văn tin gốc.
**An toàn:** bài này **chỉ chạy thử (không ghi)**. Phần nhập thật ở cuối là tuỳ chọn.

## Chuẩn bị
1. MCP (Claude) hoặc Action (GPT) đã nối và dùng được (xem `README.md`). Dán quy trình (`../huong-dan/quy-trinh-tim-tsss.md`; GPT: `huong-dan-gpt-8000.md`) làm hướng dẫn dự án.
2. Bắt đầu cuộc trò chuyện **mới**, dán nguyên khối prompt dưới đây.

## Prompt (dán nguyên khối)
```
Đây là bài test có dữ liệu sẵn, KHÔNG cần tìm web. Hãy làm theo quy trình của dự án.

Tài sản thẩm định (TSTD): hẻm 2549/13/11 Phạm Thế Hiển, Phường 7 (cũ), Quận 8 → phường Bình Đông (mới).
Loại đất: Đất thổ cư. Loại đường: hẻm 2–3m. Giá đất ở Nhà nước của tuyến: 56.700.000 đ/m² (đã cho sẵn, dùng giá này,
không cần tra). Tìm tối thiểu 5 TSSS.

Dưới đây là 12 tin ứng viên (đã thu thập). Việc cần làm:
1) Với từng tin, trích: giá, diện tích đất, số tầng, DTSD, loại đường THẬT của tin (theo quy tắc từ khoá/độ rộng, nhớ trừ 0,5m).
2) Phát hiện tin trùng căn và mâu thuẫn thông tin; nêu cách xử lý.
3) Gọi kiem_tra_tsss (cả lô) rồi báo cáo tin GIỮ/LOẠI + lý do + đơn giá đất gốc + trung vị.
4) Với các tin GIỮ, lập các dòng nhập (Loại tin = tsol; Tiêu đề = "TEST - <mã tin>"; Pháp lý không ghi → "Sổ Hồng Riêng";
   toạ độ dùng tạm 10.7280, 106.6380 cho mọi tin; Mô tả chỉ ghi đặc điểm thực tế của nhà) rồi chạy kiem_tra_nhap_bai_dang.
5) DỪNG ở đó, đưa báo cáo cho tôi. KHÔNG gọi nhap_bai_dang.

Các tin:
**Tin A** · ngày đăng 2026-09-21 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-ban-tai-hem-2549-pham-the-hien-p7-q8-pr30940307
> Bán nhà hẻm 2549 Phạm Thế Hiển, P.7, Q.8. Ngang 3,5m, tổng diện tích sử dụng 91,8m², 3 tầng, đất 35m² sổ hồng riêng. Giá 4 tỷ 5. Hẻm thông thoáng, ra mặt tiền vài bước.

**Tin B** · ngày đăng 2026-09-21 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-ban-gan-cau-ba-tang-duong-pham-the-hien-chinh-chu-dang-o-pr30097473
> Chính chủ bán nhà hẻm Phạm Thế Hiển gần cầu Bà Tàng, đang ở. Đất 37m², nhà 1 trệt 2 lầu sân thượng, DTSD 111m². Giá 3 tỷ 8, sổ hồng riêng.

**Tin C** · ngày đăng 2026-08-29 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-pham-the-hien-chinh-chu-can-ban-pr31069500
> Chính chủ cần bán nhà 2805/45 Phạm Thế Hiển, nhà cấp 4 một tầng, diện tích 44,6m² (đất và sàn), sổ hồng riêng. Giá 3,2 tỷ, hẻm.

**Tin D** · ngày đăng 2026-09-14 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-pham-the-hien-p7-q8-2pn-dt-45m10m-shr-ko-qh-hem-3m-gia-36-ty--0901-440--pr30391887
> Nhà hẻm 3m Phạm Thế Hiển, P.7 Q.8. DT 4,5m x 10m (công nhận 41,8m²), 1 trệt 1 lầu, 2PN, SHR, không quy hoạch. Giá 3,6 tỷ. Liên hệ 0901 440 xxx.

**Tin E** · ngày đăng 2026-09-15 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-pham-the-hien-p7-q8-dt-5m--15m-hem-3m-shr-khong-qh-1-lau-3pn-gia-495-ty-0901-440--pr29671919
> Bán nhà hẻm 3m Phạm Thế Hiển P.7 Q.8, 5m x 15m, diện tích đất 71m², trệt + 1 lầu tổng sàn 112m², 3PN, SHR không quy hoạch. Giá 4,95 tỷ.

**Tin F** · ngày đăng 2026-09-27 · https://alonhadat.com.vn/pham-the-hien-p-binh-dong-quan-8-4-5x14-4pn-nhinh-4-ty-tl-19032702.html
> TIÊU ĐỀ TRANG DANH SÁCH: Nhà 4 tầng hẻm 3,5m Phạm Thế Hiển gần Green River. --- MÔ TẢ CHI TIẾT: nhà 4,5x14 = 63m² đất, kết cấu 1 trệt 1 lầu (2 tầng), 4PN, hẻm xe hơi 3,5m. Giá 4,5 tỷ thương lượng.

**Tin G** · ngày đăng 2026-09-27 · https://alonhadat.com.vn/ban-nha-hem-pham-the-hien-p-7-q-8-dt-4-x-7-5-nha-xay-2-lau-2-ty-75--19046778.html
> Bán nhà hẻm Phạm Thế Hiển P.7 Q.8, 4m x 7,5m = 30m², nhà xây trệt 2 lầu (3 tầng). Hẻm 3m. Giá 2 tỷ 750.

**Tin H** · ngày đăng 2026-09-27 · https://alonhadat.com.vn/ban-nha-hem-rong-pham-the-hien-p-7-q-8-dt-3-7-x-13-nha-xay-2-lau-4-ty-6--19013800.html
> Nhà hẻm rộng 4m Phạm Thế Hiển P.7 Q.8, 3,7m x 13m (đất 45m²), trệt 2 lầu (3 tầng), tổng sàn 135m². Giá 4 tỷ 380.

**Tin I** · ngày đăng 2026-09-27 · https://alonhadat.com.vn/ban-nha-pham-the-hien-p-binh-dong-quan-8-hem-xe-tai-5m-58m2-nhinh-4-ty-tl-19066428.html
> Bán nhà Phạm Thế Hiển, hẻm xe tải 5m, đất 58m², nhà cấp 4 một tầng. Giá 3 tỷ 8 thương lượng.

**Tin J** · ngày đăng 2026-09-27 · https://alonhadat.com.vn/-nha-moi-o-ngay-100m-5-20-4-tang-4pn-pham-the-hien-quan-8-7-8-ty--18051658.html
> Nhà mới ở ngay, 5m x 20m = 100m² đất, 4 tầng, tổng sàn 400m², 4PN, hẻm 3m gần chợ Bình Điền (xa khu vực mục tiêu khoảng 1,5–2km). Giá 7 tỷ 8.

**Tin K** · ngày đăng 2026-09-23 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-97m--4-phong-ngu--phap-ly-hoan-chinh--nhinh-3-ty-pr31107656
> Nhà 97m² đất, 4 phòng ngủ, pháp lý hoàn chỉnh, 1 trệt 1 lầu tổng sàn 194m². Hẻm xe hơi rộng 3,5m gần giáo xứ Bình An. Giá 3 tỷ 950.

**Tin D2** · ngày đăng 2026-09-14 · https://bds68.com.vn/ban-nha-rieng/ho-chi-minh/quan-8/duong-pham-the-hien/nha-pham-the-hien-p7-q8-hem-3m-shr-pr30636038
> Nhà hẻm 3m Phạm Thế Hiển P.7 Q.8, 4,5x10 (41,8m² công nhận), 1 trệt 1 lầu 2PN, SHR không quy hoạch, giá 3,6 tỷ. Liên hệ 0901 440 xxx.

```

## Đáp án mong đợi

**Xử lý nhập nhằng trong dữ liệu**
| Tình huống | Cách xử lý đúng |
|---|---|
| Tin **D2** trùng căn với **D** (cùng địa chỉ, cùng 41,8m², cùng giá 3,6 tỷ, cùng SĐT che) | Gộp thành 1 tin (giữ D), nêu D2 là nguồn khác của cùng căn; **không** đưa D2 vào lô kiểm tra |
| Tin **F**: tiêu đề "4 tầng", mô tả chi tiết "1 trệt 1 lầu (2 tầng)" | Dùng **2 tầng** (mô tả chi tiết nhất quán hơn tiêu đề), nêu mâu thuẫn cho người dùng |
| Tin **B**: "1 trệt 2 lầu sân thượng" | **3 tầng**, DTSD 111m² |
| A, B, C chỉ ghi "hẻm" / không ghi độ rộng | Suy ra **2–3m** (quy tắc "hẻm" không kèm độ rộng) |
| Tin **J**: nhà xa khu vực (~1,5–2km) | Vẫn đưa vào lô kiểm tra; nêu khoảng cách trong báo cáo |

**Loại đường đúng của từng tin & kết quả `kiem_tra_tsss`** (đơn giá = đơn giá đất/m² GỐC, đ)
| Mã | Loại đường đúng | Đơn giá đất gốc | Kết quả | Lý do loại |
|---|---|---|---|---|
| A | >=2m - <3m | 115.457.143 | LOẠI | lệch trung vị +51,7% |
| B | >=2m - <3m | 87.702.703 | **GIỮ** | — |
| C | >=2m - <3m | 66.748.879 | **GIỮ** | — |
| D | >=2m - <3m | 76.124.402 | **GIỮ** | — |
| E | >=2m - <3m | 61.830.986 | **GIỮ** | — |
| F | >=3m - <4m | 61.428.571 | LOẠI | lệch trung vị -44,1% |
| G | >=2m - <3m | 76.666.667 | **GIỮ** | — |
| H | >=3m - <4m | 82.333.333 | LOẠI | lệch trung vị -25,1% |
| I | >=4m - <6m | 60.517.241 | LOẠI | lệch trung vị -55,3% |
| J | >=2m - <3m | 58.000.000 | LOẠI | lệch trung vị -23,8% |
| K | >=3m - <4m | 30.721.649 | LOẠI | giá chuẩn dưới sàn 1,2×GNN |

- Trung vị nhóm cùng loại với TSTD (2–3m): **76.124.402 đ/m²**; khoảng hợp lý theo giá Nhà nước: **68.040.000 – 311.850.000 đ/m²**.
- Lô GIỮ: **B, C, D, E, G** (5 tin, cả 5 cùng loại đất & loại đường với TSTD).
- Cảnh báo chung mong đợi: **không có** (đủ 5 tin và ≥3 cùng loại).
- Độ rộng → loại đường (đã trừ 0,5m): 3m→2,5m→2–3m · 3,5m→3,0m→3–4m · 4m→3,5m→3–4m · 5m→4,5m→4–6m.

**Kiểm tra dòng nhập (bước 4):** `kiem_tra_nhap_bai_dang` trả `hopLe = 5`, `errors` rỗng, có `dauVan`. Cột "Đơn giá đất/m²" điền **đúng đơn giá gốc ở bảng trên** (không phải giá quy đổi); cột "Loại đường" ghi loại THẬT của tin (không ghi hết là 2–3m); cột "Mô tả" **không** chứa lý do chọn/loại, trung vị, hệ số.

## Chấm điểm (đạt khi ≥ 9/10, và bắt buộc đạt mục 9–10)
| # | Tiêu chí | Đạt? |
|---|---|---|
| 1 | Gộp D2 vào D, không tính hai lần | ☐ |
| 2 | Chọn 2 tầng cho F và nêu mâu thuẫn; B = 3 tầng | ☐ |
| 3 | Phân loại đường đúng cả 11 tin (đúng bảng, có trừ 0,5m) | ☐ |
| 4 | **Gọi `kiem_tra_tsss`**, không tự tính tay | ☐ |
| 5 | GIỮ đúng B, C, D, E, G; LOẠI đúng A, F, H, I, J, K | ☐ |
| 6 | Nêu đúng trung vị 76.124.402 và lý do loại từng tin (ngắn, đúng) | ☐ |
| 7 | Dòng nhập dùng đơn giá GỐC và loại đường THẬT của từng tin | ☐ |
| 8 | Cột Mô tả sạch (không ghi chú nội bộ) | ☐ |
| 9 | **Chạy `kiem_tra_nhap_bai_dang` và DỪNG**, không gọi `nhap_bai_dang` | ☐ |
| 10 | Báo cáo nêu điểm cần xác minh (toạ độ tạm, tin gộp, mâu thuẫn số tầng…) | ☐ |

**Nếu lệch, thường do:** AI tự tính thay vì gọi tool (lệch vài đồng đến vài %); quên trừ 0,5m (F, H, K sai nhóm); ghi loại đường của TSTD cho mọi tin (vi phạm quy tắc 13/09); đưa lý do loại vào Mô tả.

## Tuỳ chọn — thử luồng nhập thật (chỉ khi bạn muốn)
Chỉ làm sau khi 10/10 ở trên, và biết rằng sẽ có **5 tin thử** trong hàng chờ duyệt:
1. Nói với AI: *"Tôi đồng ý nhập 5 tin này vào hàng chờ duyệt."* → AI gọi `nhap_bai_dang` với đúng `dauVan`.
2. Kết quả mong đợi: `success = 5`, `choDuyet = true`. Tin hiện ở **Bất động sản → Bài đăng → lọc “Chờ duyệt”**, tiêu đề bắt đầu "TEST -", **không** hiện trên bản đồ công khai.
3. Mở **Hệ thống → Khoá API cho AI/MCP → Nhật ký** của khoá: có dòng "Nhập lô" + 5 dòng "Tạo tin" (kèm địa chỉ, giá, link gốc, không có SĐT).
4. **Dọn dẹp:** bấm **Từ chối** cả 5 tin thử (không duyệt). Gửi lại cùng lô → phải báo "đã được bạn nhập trước đó", không tạo thêm.
