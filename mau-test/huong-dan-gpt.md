# Dùng với GPT (OpenAI)

> **Trạng thái:** các bước dưới đây dựa trên cách ChatGPT/OpenAI hoạt động tại thời điểm viết (10/2026); tên menu có thể đổi. Phần BE/schema đã được kiểm thử; **chưa thử trực tiếp với tài khoản ChatGPT của bạn** — hãy chạy `kiem_tra_nhanh.py` trước, rồi bài test 1.

## Chọn đường nối

| Cách | Cần | Ưu / nhược |
|---|---|---|
| **A. Custom GPT + Actions** (khuyến nghị) | Tài khoản ChatGPT có tạo GPT; BE chạy ở **https công khai** (`https://api.datngop.com`) | Dễ nhất, dùng schema `openapi-ai-tsss.yaml`. Mỗi lần gọi Action ChatGPT hỏi bạn "Cho phép" → thêm một lớp xác nhận |
| **B. OpenAI Agents SDK + MCP stdio** | Python, `OPENAI_API_KEY`, server MCP đã build | Dùng đúng server MCP như Claude; chạy cục bộ; cần viết/chạy script (mẫu dưới) |
| ~~ChatGPT connector MCP~~ | MCP **từ xa (HTTP)** | Server MCP hiện là **stdio cục bộ** nên chưa nối được kiểu này; cần làm thêm cổng HTTP + xác thực riêng |

## A. Custom GPT + Actions

1. ChatGPT → **Explore GPTs → Create** → tab **Configure**.
2. **Name:** "DatNgop — Tìm TSSS". **Instructions:** dán toàn bộ `gpt-instructions.txt` (5.086 ký tự, giới hạn của ô là 8.000).
3. Bật **Web Browsing** (để tìm tin); tắt Code Interpreter nếu không cần.
4. **Actions → Create new action:**
   - **Schema:** dán nội dung `openapi-ai-tsss.yaml` (server `https://api.datngop.com`).
   - **Authentication:** *API Key* → *Custom* → tên header **`x-khoa-api`** → dán khoá `dnk_…`. (Khoá chỉ nằm trong cấu hình Action, không hiện trong chat.)
   - **Privacy policy:** URL chính sách của DatNgop nếu GPT để ở chế độ chia sẻ; khi dùng riêng thì chọn "Only me".
5. Kiểm tra bằng nút **Test** của từng Action (ví dụ `phanLoaiDuong` với `doRong=3` phải trả `2.5` và nhóm "2m - <3m").
6. **Chia sẻ: chỉ "Only me"** — khoá nằm trong GPT; ai dùng GPT là dùng khoá của bạn.

**Lưu ý riêng cho GPT**
- Mỗi lần GPT gọi Action ChatGPT hiện hộp "Allow / Always allow". **Đừng bấm "Always allow" cho `nhapBaiDang`** — để mỗi lần nhập thật bạn phải bấm duyệt.
- GPT dễ **tự tính tay** hoặc bỏ qua `kiemTraTsss` hơn Claude; bài test 1 (tiêu chí 4) bắt lỗi này.
- Nếu trả lời bị cắt hoặc Action báo response quá lớn: yêu cầu GPT dùng `gioiHan` nhỏ hơn ở `traGiaNhaNuoc`/`thamChieuDanhMuc`.

## B. Agents SDK + MCP stdio (mẫu — **chưa chạy thử**)

```python
# pip install openai-agents ; export OPENAI_API_KEY=... ; export DATNGOP_API_KEY=dnk_...
import asyncio, os
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

HUONG_DAN = open("../huong-dan/quy-trinh-tim-tsss.md", encoding="utf-8").read()
PROMPT = open("01-test-khong-can-web.md", encoding="utf-8").read().split("```")[1]  # khối prompt của bài test 1

async def main():
    async with MCPServerStdio(params={
        "command": "node",
        "args": ["/Users/ninhphuoc/Code/AnAV/app/datngop-mcp/dist/index.js"],
        "env": {"PATH": os.environ["PATH"],
                "DATNGOP_API_URL": "https://api.datngop.com/api",
                "DATNGOP_API_KEY": os.environ["DATNGOP_API_KEY"]},
    }) as server:
        agent = Agent(name="TSSS DatNgop", instructions=HUONG_DAN, mcp_servers=[server])  # đặt model theo tài khoản của bạn
        kq = await Runner.run(agent, PROMPT)
        print(kq.final_output)

asyncio.run(main())
```
Tên tool trong cách B giống Claude (`kiem_tra_tsss`, `nhap_bai_dang`…); trong cách A là operationId (`kiemTraTsss`, `nhapBaiDang`…).

## So sánh Claude ↔ GPT trên cùng bài test
Chạy **cùng bài test 1** ở cả hai, ghi điểm vào bảng:

| Tiêu chí (bài 1) | Claude | GPT |
|---|---|---|
| Điểm /10 | | |
| Gọi `kiem_tra_tsss` thay vì tự tính | | |
| Phân loại đường đúng /11 tin | | |
| Khử trùng D2, xử lý F = 2 tầng | | |
| Dừng ở chạy thử, không nhập thật | | |
| Số lần phải nhắc lại / sửa | | |
| Thời gian chạy | | |
