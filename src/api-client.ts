/** Lỗi trả về từ datngop-be (`{ error }`) hoặc lỗi mạng — `thongBao` là câu tiếng Việt hiển thị thẳng cho người dùng/AI. */
export class LoiApi extends Error {
  constructor(
    public thongBao: string,
    readonly status: number | null = null,
  ) {
    super(thongBao);
  }

  /** Nối thêm ghi chú vào thông báo (VD thời gian chờ khi 429) và trả lại chính lỗi này. */
  thongBaoThem(them: string): this {
    this.thongBao += them;
    this.message = this.thongBao;
    return this;
  }
}

export interface TuyChonApi {
  /** Gốc API, có hậu tố `/api` (VD `http://localhost:4000/api`). */
  baseUrl: string;
  /** Khoá API (`dnk_…`). */
  khoa: string;
  fetchImpl?: typeof fetch;
  /** Mặc định 30 giây. */
  timeoutMs?: number;
}

const MAY_CUC_BO = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Chuẩn hoá + kiểm địa chỉ API. Khoá API là bí mật: TỪ CHỐI gửi qua HTTP không mã hoá tới máy khác máy này.
 * Ném `Error` (lỗi cấu hình, dừng ngay khi khởi động) thay vì lặng lẽ chạy.
 */
export function chuanHoaBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`DATNGOP_API_URL không hợp lệ: "${raw}"`);
  }
  if (url.protocol !== 'https:' && !MAY_CUC_BO.has(url.hostname))
    throw new Error(
      'DATNGOP_API_URL phải dùng https (chỉ localhost mới được dùng http) — khoá API không được gửi qua đường không mã hoá',
    );
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

export function kiemTraKhoa(khoa: string | undefined): string {
  const k = (khoa ?? '').trim();
  if (!k) throw new Error('Thiếu DATNGOP_API_KEY (khoá API do Admin tạo)');
  if (!k.startsWith('dnk_'))
    throw new Error('DATNGOP_API_KEY không đúng định dạng (phải bắt đầu bằng dnk_)');
  return k;
}

/** Máy khách HTTP tối giản tới datngop-be. Không tự thử lại (đặc biệt POST nhập tin: thử lại có thể ghi hai lần). */
export class DatNgopApi {
  private readonly baseUrl: string;
  private readonly khoa: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(tuyChon: TuyChonApi) {
    this.baseUrl = chuanHoaBaseUrl(tuyChon.baseUrl);
    this.khoa = kiemTraKhoa(tuyChon.khoa);
    this.fetchImpl = tuyChon.fetchImpl ?? fetch;
    this.timeoutMs = tuyChon.timeoutMs ?? 30_000;
  }

  /** Trả phần `data` của `{ data }`. */
  async goi<T = unknown>(
    method: 'GET' | 'POST',
    duongDan: string,
    tuyChon: { query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${duongDan}`);
    for (const [k, v] of Object.entries(tuyChon.query ?? {}))
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: {
          'x-khoa-api': this.khoa,
          accept: 'application/json',
          ...(tuyChon.body !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        body: tuyChon.body !== undefined ? JSON.stringify(tuyChon.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (loi) {
      const het = loi instanceof Error && (loi.name === 'TimeoutError' || loi.name === 'AbortError');
      throw new LoiApi(
        het
          ? `Máy chủ DatNgop không phản hồi sau ${this.timeoutMs / 1000} giây`
          : 'Không kết nối được tới máy chủ DatNgop (kiểm tra DATNGOP_API_URL và mạng)',
      );
    }

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* không phải JSON */
    }
    if (!res.ok) {
      const msg = (json as { error?: unknown } | null)?.error;
      const chuoi = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join('; ') : null;
      const cho = res.headers.get('retry-after');
      throw new LoiApi(
        chuoi ?? `Máy chủ trả lỗi ${res.status}`,
        res.status,
      ).thongBaoThem(res.status === 429 && cho ? ` (chờ ${cho} giây rồi thử lại)` : '');
    }
    return ((json as { data?: T } | null)?.data ?? (json as T));
  }
}
