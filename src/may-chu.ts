import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LoiApi, type DatNgopApi } from './api-client.js';
import { QUY_TRINH } from './quy-trinh.generated.js';

/** Tối đa số dòng mỗi lần nhập bằng khoá API — khớp giới hạn ở datngop-be (`SO_DONG_TOI_DA_KHOA_API`). */
export const SO_DONG_TOI_DA = 50;

const so = z.number().finite();
/** AI hay gửi `null` cho trường không có — chấp nhận cả `null` lẫn bỏ trống. */
const soTuyChon = so.nullable().optional();

const tstdSchema = z.object({
  loaiDat: z.string().min(1).describe('Loại đất của TSTD, đúng tên trong danh mục (tool tham_chieu_danh_muc)'),
  loaiDuong: z.string().min(1).describe('Loại đường của TSTD, đúng tên trong danh mục'),
  giaNhaNuoc: so.nonnegative().optional().describe('Giá đất ở Nhà nước đ/m² của đoạn đường TSTD. Bỏ trống mà có lat+lng → hệ thống tự tìm mốc gần nhất ≤300m'),
  lat: so.min(-90).max(90).optional(),
  lng: so.min(-180).max(180).optional(),
});

const tsssSchema = z.object({
  ma: z.string().min(1).max(60).describe('Mã nhận diện tin trong lô này (A, B, C… hoặc mã tin gốc)'),
  gia: soTuyChon.describe('Giá bán tổng (đ). Thiếu thì phải có donGiaDat'),
  donGiaDat: soTuyChon.describe('Đơn giá đất/m² (đ) nếu tin chỉ ghi đơn giá'),
  dienTichDat: so.positive().describe('Diện tích ĐẤT m² (không phải diện tích sàn)'),
  soTang: soTuyChon,
  dienTichSuDung: soTuyChon.describe('Tổng diện tích sàn nếu tin ghi rõ; thiếu thì hệ thống lấy diện tích đất × số tầng'),
  giaTriCongTrinh: soTuyChon.describe('Chỉ điền nếu có căn cứ; thiếu thì hệ thống ước lượng DTSD × 5 triệu hoặc theo loại công trình'),
  loaiCongTrinh: z.string().nullable().optional().describe('Tên loại công trình trong danh mục (tra Bảng 4)'),
  dienTichDatO: soTuyChon.describe('Đất hỗn hợp: phần diện tích đã là đất ở (m²); phần còn lại tính như đất lúa'),
  loaiDat: z.string().min(1).describe('Loại đất THẬT của tin (theo tin gốc), đúng tên danh mục'),
  loaiDuong: z.string().min(1).describe('Loại đường THẬT của tin (đã trừ 0,5m — dùng phan_loai_duong), đúng tên danh mục'),
  giaNhaNuocTuyenTin: soTuyChon.describe('Giá đất ở Nhà nước của tuyến đường CỦA TIN nếu khác tuyến TSTD'),
  ngayDang: z.string().nullable().optional().describe('Ngày đăng gốc, ISO (YYYY-MM-DD)'),
});

const dongNhapSchema = z
  .array(z.record(z.string(), z.unknown()))
  .min(1)
  .max(SO_DONG_TOI_DA)
  .describe(
    `Các dòng theo ĐÚNG tiêu đề cột của file mẫu (VD "Địa chỉ *", "Vĩ độ *", "Loại đất *"…). Tối đa ${SO_DONG_TOI_DA} dòng`,
  );

const ketQua = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const loiKetQua = (loi: unknown) => ({
  isError: true,
  content: [
    {
      type: 'text' as const,
      text: loi instanceof LoiApi ? loi.thongBao : 'Có lỗi không xác định khi gọi DatNgop',
    },
  ],
});

/** Gói một lời gọi API thành kết quả tool: lỗi → `isError` + câu tiếng Việt, KHÔNG lộ stack/khoá. */
async function chay(viec: () => Promise<unknown>) {
  try {
    return ketQua(await viec());
  } catch (loi) {
    return loiKetQua(loi);
  }
}

/** Quy trình cho AI — nhúng sẵn lúc build (`scripts/nhung-quy-trinh.mjs`), không đọc tệp ngoài khi chạy. */
export function docQuyTrinh(): string {
  return QUY_TRINH;
}

/**
 * MCP server DatNgop. Toàn bộ chạy bằng KHOÁ API hạn chế quyền (xem `datngop-be/docs/ket-noi-ai-api.md`):
 * tra cứu chỉ đọc + kiểm tra tính toán + nhập tin vào HÀNG CHỜ DUYỆT. Không có tool nào sửa/xoá dữ liệu.
 */
export function taoMayChu(api: DatNgopApi): McpServer {
  const server = new McpServer({ name: 'datngop', version: '0.1.0' });
  const chiDoc = { readOnlyHint: true, openWorldHint: false } as const;
  /** Dấu vân các lô ĐÃ kiểm tra trong phiên này — chặn sớm việc nhập lô chưa kiểm (server vẫn là chốt chặn thật). */
  const dauVanDaKiem = new Set<string>();

  server.registerTool(
    'tham_chieu_danh_muc',
    {
      title: 'Danh mục điền file mẫu',
      description:
        'Danh mục hợp lệ để điền bài đăng: loại tin, loại đất (kèm hệ số), loại đường (kèm hệ số), pháp lý, loại BĐS, loại công trình. Truyền q để tìm phường/xã mới theo tên (trả đúng chuỗi điền cột "Phường/Xã mới"). Chỉ dùng đúng tên trong danh mục — không tự đặt.',
      inputSchema: { q: z.string().max(100).optional().describe('Tên phường/xã mới cần tìm (không dấu cũng được)') },
      annotations: chiDoc,
    },
    ({ q }) => chay(() => api.goi('GET', '/bat-dong-san/ai-tsss/tham-chieu', { query: { q } })),
  );

  server.registerTool(
    'tra_dia_chi',
    {
      title: 'Toạ độ → phường/xã',
      description: 'Từ toạ độ trả phường/xã MỚI (sau 01/07/2025) và xã/phường/quận/tỉnh CŨ tương ứng.',
      inputSchema: { lat: so.min(-90).max(90), lng: so.min(-180).max(180) },
      annotations: chiDoc,
    },
    ({ lat, lng }) => chay(() => api.goi('GET', '/bat-dong-san/ai-tsss/dia-chi', { query: { lat, lng } })),
  );

  server.registerTool(
    'tra_gia_nha_nuoc',
    {
      title: 'Giá đất Nhà nước (BOT2)',
      description:
        'Mốc giá đất Nhà nước quanh một toạ độ (lat+lng, banKinhM mặc định 500) hoặc theo tên đường. giaDatO là giá đất ở đ/m², mặc định cho đường 6–8m. Mốc gần nhất chưa chắc cùng tuyến — đối chiếu tên đường/đoạn trước khi dùng.',
      inputSchema: {
        lat: so.min(-90).max(90).optional(),
        lng: so.min(-180).max(180).optional(),
        banKinhM: so.min(50).max(2000).optional(),
        tenDuong: z.string().max(100).optional(),
        phuongXa: z.string().max(100).optional(),
        gioiHan: so.int().min(1).max(30).optional(),
      },
      annotations: chiDoc,
    },
    (a) => chay(() => api.goi('GET', '/bat-dong-san/ai-tsss/gia-nha-nuoc', { query: a })),
  );

  server.registerTool(
    'phan_loai_duong',
    {
      title: 'Độ rộng đường → loại đường',
      description:
        'Từ độ rộng đường GHI TRONG TIN (m) trả loại đường trong danh mục. Hệ thống tự trừ 0,5m trước khi phân loại (môi giới thường nói đường rộng hơn thực tế). Dùng khi tin ghi số mét cụ thể.',
      inputSchema: { doRongGhiTrongTin: so.positive().max(200) },
      annotations: chiDoc,
    },
    ({ doRongGhiTrongTin }) =>
      chay(() => api.goi('GET', '/bat-dong-san/ai-tsss/loai-duong', { query: { doRong: doRongGhiTrongTin } })),
  );

  server.registerTool(
    'kiem_tra_tsss',
    {
      title: 'Kiểm tra lô TSSS',
      description:
        'Tính toán thay cho AI (KHÔNG tự tính): đơn giá đất/m² gốc (trừ công trình, đất hỗn hợp, quy đổi tuyến), giá chuẩn, lọc khoảng giá 1,2–5,5× giá Nhà nước, trung vị và lọc lệch >20%. Trả từng tin GIU/LOAI kèm lý do (lý do chỉ để nội bộ, KHÔNG đưa vào cột Mô tả) và thứ tự hiển thị. Điền cột "Đơn giá đất/m²" bằng donGiaDat trả về (đơn giá GỐC). Không ghi dữ liệu.',
      inputSchema: {
        tstd: tstdSchema,
        tsss: z.array(tsssSchema).min(1).max(100),
        ngayThamChieu: z.string().optional().describe('Mốc tính "12 tháng gần nhất" (ISO), mặc định hôm nay'),
      },
      annotations: chiDoc,
    },
    (a) => chay(() => api.goi('POST', '/bat-dong-san/ai-tsss/kiem-tra-tsss', { body: a })),
  );

  server.registerTool(
    'kiem_tra_nhap_bai_dang',
    {
      title: 'Chạy thử nhập bài đăng (không ghi)',
      description:
        'BƯỚC 1 của nhập tin: gửi các dòng để hệ thống kiểm tra như nhập thật nhưng KHÔNG ghi gì. Trả danh sách lỗi theo dòng (sửa rồi chạy lại), số dòng hợp lệ và `dauVan` — mã bắt buộc để nhập thật đúng lô này. Chạy cho tới khi hết lỗi.',
      inputSchema: { rows: dongNhapSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ rows }) =>
      chay(async () => {
        const kq = await api.goi<{ dauVan?: string }>('POST', '/bat-dong-san/bai-dang/import', {
          body: { rows, kiemTra: true },
        });
        if (kq.dauVan) dauVanDaKiem.add(kq.dauVan);
        return kq;
      }),
  );

  server.registerTool(
    'nhap_bai_dang',
    {
      title: 'Nhập bài đăng vào hàng chờ duyệt',
      description:
        `BƯỚC 2 của nhập tin — CÓ GHI DỮ LIỆU. Chỉ gọi sau khi (1) kiem_tra_nhap_bai_dang không còn lỗi và (2) người dùng đã xem kết quả và ĐỒNG Ý RÕ RÀNG. Phải gửi đúng \`dauVan\` của chính lô đã kiểm và đúng các dòng đó (đổi dữ liệu là bị từ chối). Tin vào HÀNG CHỜ DUYỆT (nháp) — chưa lên bản đồ công khai tới khi nhân viên duyệt. Tối đa ${SO_DONG_TOI_DA} dòng. Gọi lại cùng lô chỉ báo trùng, không ghi hai lần. KHÔNG tự thử lại khi lỗi mạng — hãy kiểm tra lại bằng kiem_tra_nhap_bai_dang.`,
      inputSchema: {
        rows: dongNhapSchema,
        dauVan: z.string().min(1).describe('dauVan do kiem_tra_nhap_bai_dang trả về cho CHÍNH lô này'),
        nguoiDungDaDongY: z
          .literal(true)
          .describe('Chỉ đặt true khi người dùng đã xem kết quả kiểm tra và đồng ý rõ ràng việc ghi'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ rows, dauVan }) => {
      if (!dauVanDaKiem.has(dauVan))
        return loiKetQua(
          new LoiApi(
            'Chưa kiểm tra lô này trong phiên làm việc hiện tại — hãy chạy kiem_tra_nhap_bai_dang với đúng các dòng này và dùng dauVan nó trả về',
          ),
        );
      return chay(() =>
        api.goi('POST', '/bat-dong-san/bai-dang/import', { body: { rows, dauVan } }),
      );
    },
  );

  server.registerPrompt(
    'quy_trinh_tim_tsss',
    {
      title: 'Quy trình tìm & điền TSSS',
      description: 'Quy trình đầy đủ tìm tài sản so sánh và nhập vào DatNgop bằng các tool của server này.',
    },
    () => ({
      messages: [{ role: 'user', content: { type: 'text', text: docQuyTrinh() } }],
    }),
  );

  return server;
}
