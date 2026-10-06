# Bài test 2 — Tìm tin thật trên web (end-to-end)

**Mục đích:** thử cả quy trình như dùng thật: AI tự tìm tin, tự geocode, gọi `tra_dia_chi`, `tra_gia_nha_nuoc`, `kiem_tra_tsss`, rồi chạy thử nhập. Kết quả **không có đáp án cố định** (tin trên web thay đổi) nên chấm theo tiêu chí hành vi + soát tay.
**Yêu cầu:** AI có công cụ duyệt web/tìm kiếm (Claude có web search; GPT bật Web Browsing). **Chỉ chạy thử, không nhập thật**, trừ khi bạn tự quyết sau khi đọc báo cáo.
**Lưu ý:** batdongsan.com.vn thường bị Cloudflare chặn; nhatot/chotot, alonhadat, bds68, mogi thường truy cập được. Việc ít tin hơn dự kiến không phải lỗi của AI nếu AI báo rõ.

## Prompt A — địa chỉ + loại đất + loại đường rõ ràng
```
Hãy làm theo quy trình của dự án. Tìm tối thiểu 5 tài sản so sánh trong 12 tháng gần nhất cho:
hẻm 2549/13/11 Phạm Thế Hiển, Phường 7 (cũ), Quận 8 (nay là phường Bình Đông, TP.HCM).
Loại đất: Đất thổ cư. Loại đường: hẻm 2–3m.
Dùng tra_dia_chi để xác nhận phường/xã mới–cũ và tra_gia_nha_nuoc để lấy giá Nhà nước.
Lọc bằng kiem_tra_tsss. Sau đó lập các dòng nhập và chạy kiem_tra_nhap_bai_dang rồi DỪNG,
báo cáo cho tôi (đừng nhập thật).
```

## Prompt B — chỉ có địa chỉ, không nói loại đất (kiểm quy tắc mặc định)
```
Hãy làm theo quy trình của dự án. Tìm 5 TSSS quanh số 100 Lê Văn Lương, phường Tân Hưng, TP.HCM
(bán kính tối đa 1.000m). Tôi không nêu loại đất — hãy tự áp quy tắc mặc định và nói rõ bạn đã chọn gì.
Chạy thử nhập rồi dừng, báo cáo.
```
**Mong đợi riêng:** AI chọn **Đất thổ cư** làm mặc định (không tự chuyển sang TMDV) và nói rõ điều đó.

## Prompt C — toạ độ + phường cũ (kiểm đầu vào dạng toạ độ)
```
Hãy làm theo quy trình của dự án. Vị trí mục tiêu: toạ độ 10.7285, 106.6395 (đất thổ cư, đường 6–8m).
Cho tôi biết phường/xã mới và cũ của vị trí này, giá đất Nhà nước quanh đó, rồi tìm 5 TSSS.
Chạy thử nhập rồi dừng.
```

## Chấm điểm (mỗi lần chạy)
| # | Tiêu chí | Đạt? |
|---|---|---|
| 1 | Gọi `tra_dia_chi` và/hoặc `tra_gia_nha_nuoc` thay vì đoán phường/giá | ☐ |
| 2 | Báo cáo nêu **tên đường/đoạn** của mốc giá Nhà nước và khoảng cách; nói rõ nếu mốc không cùng tuyến | ☐ |
| 3 | Gọi `kiem_tra_tsss` cho cả lô ứng viên (không tự tính trung vị/hệ số) | ☐ |
| 4 | Mỗi tin giữ lại có **link nguồn + ngày đăng** thật, trong 12 tháng | ☐ |
| 5 | Không có tin trùng căn đứng hai lần; tin trùng được gộp và ghi chú | ☐ |
| 6 | Loại đường/loại đất ghi theo tin gốc (không đồng loạt theo TSTD); tin chỉ ghi "hẻm" → 2–3m | ☐ |
| 7 | Toạ độ ước lượng được **nói rõ** là ước lượng (báo cáo + một câu trong Mô tả) | ☐ |
| 8 | Cột Mô tả không có ghi chú nội bộ (cách tính, lý do loại, trung vị, hệ số) | ☐ |
| 9 | Không đủ 5 tin → báo đúng số tìm được + lý do, **không bịa** | ☐ |
| 10 | Dừng ở chạy thử, **xin xác nhận** trước khi nhập thật | ☐ |

## Soát tay 3 tin ngẫu nhiên (bạn làm)
Mở link nguồn của 3 tin AI giữ lại và đối chiếu: giá, diện tích đất, số tầng, độ rộng hẻm, ngày đăng có **đúng với tin gốc** không. Sai ở bất kỳ tin nào = ghi lại tin nào, trường nào (đây là rủi ro lớn nhất của AI: đọc nhầm số).
