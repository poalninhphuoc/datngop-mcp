# datngop-mcp — kết nối AI vào DatNgop

MCP server (stdio) để Claude (Desktop, Code, hoặc client MCP bất kỳ) **tra cứu giá Nhà nước, kiểm tra tài sản so sánh (TSSS) và nhập tin vào hàng chờ duyệt** của DatNgop, thay cho việc điền tay file `mau-import-bai-dang.xlsx`.

- Phần BE (API, khoá, bảo mật, vận hành): [`../datngop-be/docs/ket-noi-ai-api.md`](../datngop-be/docs/ket-noi-ai-api.md)
- **Bộ mẫu test với Claude và GPT** (dữ liệu có đáp án, 3 bài test, script kiểm tra nhanh, schema Custom GPT): [`mau-test/README.md`](mau-test/README.md)
- Tổng quan tích hợp (kiến trúc, luồng làm việc, các bước đưa vào sử dụng, trang quản lý khoá): [`huong-dan/tong-quan-tich-hop.md`](huong-dan/tong-quan-tich-hop.md)
- Quy trình cho AI (dán làm hướng dẫn dự án): [`huong-dan/quy-trinh-tim-tsss.md`](huong-dan/quy-trinh-tim-tsss.md) — cũng có sẵn dạng prompt `quy_trinh_tim_tsss` của server này.

## Cách hoạt động

```
Claude ── tìm tin trên web (công cụ của Claude)
   │
   └── MCP datngop ──(khoá API, https)──► datngop-be
         ├─ tham_chieu_danh_muc   danh mục + hệ số + tìm phường/xã
         ├─ tra_dia_chi           toạ độ → phường/xã mới & cũ
         ├─ tra_gia_nha_nuoc      giá đất Nhà nước (BOT2) quanh toạ độ / theo tên đường
         ├─ phan_loai_duong       độ rộng đường ghi trong tin → loại đường (tự trừ 0,5m)
         ├─ kiem_tra_tsss         TÍNH TOÁN + LỌC thay cho AI (đơn giá, quy đổi, ±20%…)
         ├─ kiem_tra_nhap_bai_dang  chạy thử nhập (không ghi) → lỗi theo dòng + dauVan
         └─ nhap_bai_dang         nhập thật → HÀNG CHỜ DUYỆT (cần người dùng đồng ý)
```
AI chỉ **đọc hiểu tin và chọn đúng danh mục**; mọi phép tính do BE làm (đã có test đối chiếu sheet "Kiểm tra tính toán"). MCP **không** tìm tin/geocode — đó là việc của công cụ web của Claude.

## An toàn — đọc trước khi dùng

- Chạy bằng **khoá API hạn chế quyền** gắn với một tài khoản nhân viên riêng (không Admin). Khoá chỉ vào được các route tra cứu và route nhập; **không thể sửa/xoá/duyệt** bất cứ thứ gì.
- Tin nhập vào **hàng chờ duyệt** — nhân viên duyệt mới lên bản đồ công khai. Nhập thật bắt buộc qua chạy thử + `dauVan`; tối đa 50 dòng/lần; nhập lại cùng lô chỉ báo trùng.
- Mọi lần gọi (kể cả bị từ chối) được ghi **Nhật ký hệ thống**; khoá có hạn (90 ngày) và thu hồi tức thì.
- MCP từ chối chạy nếu `DATNGOP_API_URL` là `http://` tới máy khác `localhost` (khoá không được đi qua đường không mã hoá).
- Khoá là bí mật: chỉ để trong biến môi trường/cấu hình cục bộ của client MCP, **không** dán vào chat, không commit.

## Cài đặt

### A. Phía máy chủ (người vận hành BE làm một lần)
**Tạo bảng + tài khoản + khoá** theo `datngop-be/docs/ket-noi-ai-api.md` mục 2 (bảng `khoa_api` là thay đổi DB cần duyệt; tài khoản bot chỉ cấp quyền `batDongSanBaiDang` xem + thêm). Khoá tạo ở trang web **Hệ thống → Khoá API cho AI/MCP**; trang này có nút **tải file hướng dẫn cho AI** để đưa cho AI tự cấu hình.

### B. Cài MCP trên máy người dùng (máy khác cũng được)
Repo công khai: **https://github.com/poalninhphuoc/datngop-mcp**. Máy chỉ cần **Node ≥ 20** (`node -v`; chưa có thì cài từ nodejs.org). Chọn một cách:

| Cách | Dành cho | Các bước |
|---|---|---|
| **1. `npx` từ GitHub** (khuyến nghị) | Mọi người — không tải gì, không cần biết đường dẫn | Chỉ cần cấu hình client chạy `npx -y github:poalninhphuoc/datngop-mcp` (mục C). Lần đầu mất ~10–15 giây để tải và build, các lần sau dùng bản đã lưu đệm. **Đã thử cài và chạy thật từ GitHub.** |
| **2. File đơn `datngop-mcp.mjs`** (764 KB) | Máy không có npx / không tới được GitHub | Nhận file → lưu vào thư mục cố định → cấu hình `node /đường/dẫn/datngop-mcp.mjs` |
| **3. Từ mã nguồn** | Lập trình viên | `git clone https://github.com/poalninhphuoc/datngop-mcp` → `cd datngop-mcp && npm install` (tự build nhờ `prepare`) → `node dist/index.js` |

**Cố định phiên bản (nên làm khi dùng thật).** `npx github:…` lấy mã mới nhất của nhánh `main`; ai có quyền ghi vào repo là kiểm soát được đoạn mã chạy cùng khoá API của người dùng. Để chắc chắn, tạo tag (VD `git tag v0.1.0 && git push --tags`) rồi cấu hình `github:poalninhphuoc/datngop-mcp#v0.1.0` (hoặc `#<mã commit>`), và chỉ nâng tag khi đã xem lại thay đổi.

**Tạo bản phát hành (người xây dựng, ở máy có repo):**
```bash
cd datngop-mcp && npm install
npm test            # 26 test, không cần BE chạy
npm run bundle      # → dist-bundle/datngop-mcp.mjs  (cách 2: gồm cả SDK + quy trình, đã thử chạy ở thư mục trống)
npm pack            # → datngop-mcp-0.1.0.tgz        (gói npm ~15 KB, đã thử cài ở thư mục khác)
```
Có thể đính `datngop-mcp.mjs` vào **GitHub Releases** của repo để cách 2 có nơi tải. Mã nguồn **không chứa khoá hay bí mật** — khoá do từng người nhận riêng từ Admin (trang *Hệ thống → Khoá API cho AI/MCP*); mỗi người/máy nên dùng **một khoá riêng** để thu hồi và đối soát nhật ký độc lập.

## C. Cấu hình client

`DATNGOP_API_URL` là gốc API **có `/api`** — production là **`https://api.datngop.com/api`** (cũng là mặc định nếu bỏ trống); thử cục bộ thì đặt `http://localhost:4000/api`. Ví dụ dưới dùng cách 1 (`npx`). Cách 2: thay lệnh bằng `node /đường/dẫn/tuyệt/đối/datngop-mcp.mjs`; cách 3: `node …/datngop-mcp/dist/index.js`.

**Claude Desktop** — sửa `~/Library/Application Support/Claude/claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`), rồi khởi động lại Claude:
```json
{
  "mcpServers": {
    "datngop": {
      "command": "npx",
      "args": ["-y", "github:poalninhphuoc/datngop-mcp"],
      "env": {
        "DATNGOP_API_URL": "https://api.datngop.com/api",
        "DATNGOP_API_KEY": "dnk_…"
      }
    }
  }
}
```
Báo lỗi `spawn npx ENOENT` (Claude Desktop không thấy Node trong PATH) → đổi `"command"` thành đường dẫn tuyệt đối của `npx` (`which npx`) hoặc dùng cách 2.

**Claude Code** (terminal):
```bash
claude mcp add datngop --scope user \
  --env DATNGOP_API_URL=https://api.datngop.com/api \
  --env DATNGOP_API_KEY=dnk_… \
  -- npx -y github:poalninhphuoc/datngop-mcp
claude mcp list        # kiểm tra datngop ở trạng thái connected
```
(`--scope user` lưu vào cấu hình cá nhân của bạn, **không** vào repo. Đừng dùng `--scope project` với khoá thật vì sẽ ghi vào `.mcp.json` dễ bị commit.)

> Claude trên web/di động (claude.ai) chỉ nối được MCP **từ xa** (HTTP) — server này là stdio cục bộ nên chưa dùng được ở đó. Cần thì làm thêm cổng HTTP + xác thực riêng.

## Câu hỏi mẫu sau khi tích hợp thành công
Hộp thoại hiện ra sau khi **tạo khoá** (trang *Hệ thống → Khoá API cho AI/MCP*) có mục *Câu hỏi mẫu* (nút Chép) và cùng nội dung nằm trong file `.md` tải về: kiểm tra kết nối, quy tắc phân loại đường, tra địa chỉ/giá Nhà nước, **kiểm tra TSSS có đáp án sẵn** (B = 87.702.703 · C = 66.748.879 · D = 76.124.402 đ/m², trung vị 76.124.402), tìm tin thật (chỉ chạy thử) và thử bắt AI làm điều không được phép. Không câu nào ghi dữ liệu. Bộ test đầy đủ hơn nằm ở `mau-test/`.

## Dùng

1. Mở Claude Project (hoặc cuộc trò chuyện mới) có công cụ duyệt web. Dán nội dung [`huong-dan/quy-trinh-tim-tsss.md`](huong-dan/quy-trinh-tim-tsss.md) làm hướng dẫn dự án, hoặc chọn prompt **quy_trinh_tim_tsss** của MCP datngop.
2. Nhập yêu cầu, ví dụ: *"Tìm tối thiểu 5 TSSS cho hẻm 2549/13/11 Phạm Thế Hiển, P.7 cũ Q.8, đất thổ cư, hẻm 2–3m."*
3. Claude tìm tin → gọi `tra_dia_chi`, `tra_gia_nha_nuoc`, `kiem_tra_tsss` → trình bày bảng giữ/loại + điểm cần xác minh → **hỏi bạn có đồng ý nhập không**.
4. Bạn đồng ý → `kiem_tra_nhap_bai_dang` (chạy thử) → `nhap_bai_dang`. Tin vào **hàng chờ duyệt**: vào màn bài đăng, lọc "Chờ duyệt", duyệt hoặc từ chối.

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Server không lên, log `Lỗi cấu hình: …` | Thiếu/sai `DATNGOP_API_KEY` (phải bắt đầu `dnk_`) hoặc `DATNGOP_API_URL` là `http://` không phải localhost. Log nằm ở stderr (Claude Desktop: `~/Library/Logs/Claude/mcp-server-datngop.log`) |
| `Khoá API không hợp lệ hoặc đã bị thu hồi` | Khoá sai, hết hạn (90 ngày), bị thu hồi, hoặc tài khoản gắn khoá bị khoá/đã thành Admin → tạo khoá mới |
| `Khoá API không có phạm vi cho thao tác này` | Khoá thiếu phạm vi (VD chỉ `tra_cuu` mà gọi nhập tin) → tạo khoá có `nhap_bai_dang` |
| `Bạn không có quyền thực hiện thao tác này` | Tài khoản bot thiếu quyền `batDongSanBaiDang` xem/thêm |
| `Lỗi cơ sở dữ liệu (P2021)` | Chưa tạo bảng `khoa_api` (mục 2.1 của tài liệu BE) |
| `Chưa kiểm tra lô này trong phiên…` | Nhập thật phải theo sau `kiem_tra_nhap_bai_dang` của đúng các dòng đó trong cùng phiên MCP; sửa dòng nào thì chạy thử lại |
| `Quá nhiều yêu cầu… (chờ N giây)` | Vượt 120 lần/phút/khoá — chờ rồi gọi tiếp |
| `Không kết nối được tới máy chủ DatNgop` | BE chưa chạy / sai `DATNGOP_API_URL` / mạng |

## Phát triển

```bash
npm run dev          # chạy bằng tsx (stdio; chỉ để thử với client MCP)
npm run typecheck && npm test && npm run build
npm run nhung        # sinh lại src/quy-trinh.generated.ts sau khi sửa huong-dan/quy-trinh-tim-tsss.md (test bắt nếu quên)
```
- `src/api-client.ts` — gọi BE (chặn http không mã hoá, không tự thử lại, không lộ khoá trong lỗi).
- `src/may-chu.ts` — khai báo tool/prompt (quy trình nhúng sẵn qua `quy-trinh.generated.ts`, không đọc tệp ngoài lúc chạy). **Không thêm tool sửa/xoá**; thêm tool ghi phải qua phạm vi khoá mới ở BE.
- Test `may-chu.test.ts` chạy server thật qua transport trong bộ nhớ, khoá cứng danh sách đúng 7 tool và rào chắn hai bước của `nhap_bai_dang`.
