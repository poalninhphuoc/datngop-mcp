import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chuanHoaBaseUrl, DatNgopApi, kiemTraKhoa, LoiApi } from './api-client.js';

const KHOA = 'dnk_' + 'k'.repeat(43);

type Goi = { url: URL; init: RequestInit };
function giaFetch(tra: (g: Goi) => Response | Promise<Response>) {
  const goi: Goi[] = [];
  const fetchImpl = (async (url: URL, init: RequestInit) => {
    const g = { url, init };
    goi.push(g);
    return tra(g);
  }) as unknown as typeof fetch;
  return { goi, fetchImpl };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('chuanHoaBaseUrl', () => {
  it('https và localhost http hợp lệ; bỏ "/" cuối, query, hash', () => {
    assert.equal(chuanHoaBaseUrl('https://api.datngop.vn/api/'), 'https://api.datngop.vn/api');
    assert.equal(chuanHoaBaseUrl('http://localhost:4000/api'), 'http://localhost:4000/api');
    assert.equal(chuanHoaBaseUrl('http://127.0.0.1:4000/api?x=1#y'), 'http://127.0.0.1:4000/api');
  });
  it('TỪ CHỐI http tới máy khác (khoá không được đi qua đường không mã hoá)', () => {
    assert.throws(() => chuanHoaBaseUrl('http://api.datngop.vn/api'), /phải dùng https/);
    assert.throws(() => chuanHoaBaseUrl('http://192.168.1.10:4000/api'), /phải dùng https/);
    assert.throws(() => chuanHoaBaseUrl('http://localhost.evil.com/api'), /phải dùng https/);
  });
  it('địa chỉ rác → lỗi', () => {
    assert.throws(() => chuanHoaBaseUrl('khong-phai-url'), /không hợp lệ/);
  });
});

describe('kiemTraKhoa', () => {
  it('thiếu / rỗng / sai tiền tố → lỗi, không in giá trị khoá', () => {
    assert.throws(() => kiemTraKhoa(undefined), /Thiếu DATNGOP_API_KEY/);
    assert.throws(() => kiemTraKhoa('   '), /Thiếu DATNGOP_API_KEY/);
    assert.throws(
      () => kiemTraKhoa('eyJhbGciOi-token-nhan-vien'),
      (e: Error) => /dnk_/.test(e.message) && !e.message.includes('eyJhbGciOi'),
    );
    assert.equal(kiemTraKhoa(` ${KHOA} `), KHOA);
  });
});

describe('DatNgopApi.goi', () => {
  const dung = (tra: Parameters<typeof giaFetch>[0], extra: { timeoutMs?: number } = {}) => {
    const f = giaFetch(tra);
    return { ...f, api: new DatNgopApi({ baseUrl: 'http://localhost:4000/api', khoa: KHOA, fetchImpl: f.fetchImpl, ...extra }) };
  };

  it('GET: gửi header x-khoa-api (KHÔNG Authorization), bỏ query rỗng/undefined, trả phần data', async () => {
    const { api, goi } = dung(() => json({ data: { ok: 1 } }));
    const kq = await api.goi('GET', '/x', { query: { lat: 10.5, q: '', b: undefined, c: null, d: 0 } });
    assert.deepEqual(kq, { ok: 1 });
    const g = goi[0]!;
    assert.equal(g.url.toString(), 'http://localhost:4000/api/x?lat=10.5&d=0');
    const h = g.init.headers as Record<string, string>;
    assert.equal(h['x-khoa-api'], KHOA);
    assert.equal(h['authorization'], undefined);
    assert.equal(g.init.body, undefined);
  });

  it('POST: gửi JSON, content-type', async () => {
    const { api, goi } = dung(() => json({ data: { n: 1 } }));
    await api.goi('POST', '/y', { body: { rows: [1] } });
    const g = goi[0]!;
    assert.equal(g.init.method, 'POST');
    assert.equal(g.init.body, JSON.stringify({ rows: [1] }));
    assert.equal((g.init.headers as Record<string, string>)['content-type'], 'application/json');
  });

  it('lỗi từ API → LoiApi mang đúng câu tiếng Việt và status; lỗi validation dạng mảng được nối', async () => {
    const a = dung(() => json({ error: 'Khoá API không hợp lệ hoặc đã bị thu hồi' }, 401));
    await assert.rejects(a.api.goi('GET', '/x'), (e: unknown) => e instanceof LoiApi && e.status === 401 && e.thongBao === 'Khoá API không hợp lệ hoặc đã bị thu hồi');
    const b = dung(() => json({ error: ['kiemTra phải là true/false', 'dauVan không hợp lệ'] }, 400));
    await assert.rejects(b.api.goi('POST', '/x', { body: {} }), (e: unknown) => e instanceof LoiApi && e.thongBao === 'kiemTra phải là true/false; dauVan không hợp lệ');
  });

  it('429: kèm thời gian chờ từ Retry-After', async () => {
    const { api } = dung(() => json({ error: 'Quá nhiều yêu cầu.' }, 429, { 'retry-after': '30' }));
    await assert.rejects(api.goi('GET', '/x'), (e: unknown) => e instanceof LoiApi && e.status === 429 && /chờ 30 giây/.test(e.thongBao));
  });

  it('phản hồi lỗi không phải JSON → câu chung với mã trạng thái', async () => {
    const { api } = dung(() => new Response('<html>Bad gateway</html>', { status: 502 }));
    await assert.rejects(api.goi('GET', '/x'), (e: unknown) => e instanceof LoiApi && e.thongBao === 'Máy chủ trả lỗi 502');
  });

  it('lỗi mạng → câu chung KHÔNG chứa khoá/URL chi tiết; không tự thử lại', async () => {
    let lan = 0;
    const { api } = dung(() => {
      lan++;
      throw new TypeError(`fetch failed ${KHOA} http://localhost:4000`);
    });
    await assert.rejects(api.goi('POST', '/x', { body: {} }), (e: unknown) => e instanceof LoiApi && !e.thongBao.includes(KHOA) && /Không kết nối được/.test(e.thongBao));
    assert.equal(lan, 1);
  });

  it('quá thời gian → thông báo timeout', async () => {
    // AbortSignal.timeout dùng timer không giữ tiến trình sống; thật ra socket mạng giữ — ở đây giả fetch nên giữ tay
    const giuSong = setTimeout(() => undefined, 2_000);
    const { api } = dung(
      ({ init }) =>
        new Promise<Response>((_, reject) => {
          (init.signal as AbortSignal).addEventListener('abort', () => reject(Object.assign(new Error('x'), { name: 'TimeoutError' })));
        }),
      { timeoutMs: 20 },
    );
    try {
      await assert.rejects(api.goi('GET', '/x'), (e: unknown) => e instanceof LoiApi && /không phản hồi/.test(e.thongBao));
    } finally {
      clearTimeout(giuSong);
    }
  });
});
