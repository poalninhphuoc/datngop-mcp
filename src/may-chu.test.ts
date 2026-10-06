import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { DatNgopApi } from './api-client.js';
import { SO_DONG_TOI_DA, taoMayChu } from './may-chu.js';

const KHOA = 'dnk_' + 'k'.repeat(43);

interface Goi {
  method: string;
  url: URL;
  body: unknown;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function dung(tra: (g: Goi) => Response = () => json({ data: { ok: true } })) {
  const goi: Goi[] = [];
  const fetchImpl = (async (url: URL, init: RequestInit) => {
    const g: Goi = { method: String(init.method), url, body: init.body ? JSON.parse(String(init.body)) : undefined };
    goi.push(g);
    return tra(g);
  }) as unknown as typeof fetch;
  const api = new DatNgopApi({ baseUrl: 'http://localhost:4000/api', khoa: KHOA, fetchImpl });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await taoMayChu(api).connect(a);
  const client = new Client({ name: 'kiem-thu', version: '0' });
  await client.connect(b);
  const chay = async (name: string, args: Record<string, unknown>) => {
    const r = await client.callTool({ name, arguments: args });
    const text = (r.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    return { isError: Boolean(r.isError), text };
  };
  return { client, goi, chay };
}

const dong = { 'Địa chỉ *': '12 Lê Lợi', 'Vĩ độ *': 10.77 };

describe('danh sách tool — chỉ đúng 7 tool, không có tool sửa/xoá', () => {
  it('liệt kê đúng tên; tool ghi duy nhất là nhap_bai_dang', async () => {
    const { client } = await dung();
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      'kiem_tra_nhap_bai_dang',
      'kiem_tra_tsss',
      'nhap_bai_dang',
      'phan_loai_duong',
      'tham_chieu_danh_muc',
      'tra_dia_chi',
      'tra_gia_nha_nuoc',
    ]);
    const ghi = tools.filter((t) => t.annotations?.readOnlyHint === false).map((t) => t.name);
    assert.deepEqual(ghi, ['nhap_bai_dang']);
    assert.equal(tools.find((t) => t.name === 'nhap_bai_dang')?.annotations?.destructiveHint, false);
  });

  it('prompt quy_trinh_tim_tsss có sẵn và trả văn bản quy trình', async () => {
    const { client } = await dung();
    const p = await client.getPrompt({ name: 'quy_trinh_tim_tsss' });
    const m = p.messages[0]?.content;
    assert.ok(m && m.type === 'text' && m.text.length > 500);
  });
});

describe('tool tra cứu — gọi đúng route và tham số', () => {
  it('tham_chieu_danh_muc → GET tham-chieu?q=', async () => {
    const { chay, goi } = await dung();
    await chay('tham_chieu_danh_muc', { q: 'bình đông' });
    assert.equal(goi[0]!.method, 'GET');
    assert.equal(goi[0]!.url.pathname, '/api/bat-dong-san/ai-tsss/tham-chieu');
    assert.equal(goi[0]!.url.searchParams.get('q'), 'bình đông');
  });

  it('tra_gia_nha_nuoc → GET gia-nha-nuoc đủ tham số; toạ độ ngoài khoảng bị chặn TRƯỚC khi gọi API', async () => {
    const { chay, goi } = await dung();
    await chay('tra_gia_nha_nuoc', { lat: 10.71, lng: 106.64, banKinhM: 300 });
    assert.equal(goi[0]!.url.pathname, '/api/bat-dong-san/ai-tsss/gia-nha-nuoc');
    assert.equal(goi[0]!.url.searchParams.get('banKinhM'), '300');
    const sai = await chay('tra_gia_nha_nuoc', { lat: 120, lng: 106 });
    assert.equal(sai.isError, true);
    assert.equal(goi.length, 1);
  });

  it('phan_loai_duong đổi tên tham số sang doRong của API', async () => {
    const { chay, goi } = await dung();
    await chay('phan_loai_duong', { doRongGhiTrongTin: 3 });
    assert.equal(goi[0]!.url.pathname, '/api/bat-dong-san/ai-tsss/loai-duong');
    assert.equal(goi[0]!.url.searchParams.get('doRong'), '3');
  });

  it('kiem_tra_tsss → POST body nguyên vẹn; chấp nhận null ở trường tuỳ chọn; thiếu diện tích → chặn', async () => {
    const { chay, goi } = await dung();
    const tstd = { loaiDat: 'Đất thổ cư', loaiDuong: 'Đường rộng >=2m - <3m (đường hẻm xe ba gác, hẻm)', giaNhaNuoc: 56_700_000 };
    const tin = { ma: 'A', gia: 4_500_000_000, dienTichDat: 35, soTang: 3, dienTichSuDung: null, loaiDat: 'Đất thổ cư', loaiDuong: tstd.loaiDuong };
    const ok = await chay('kiem_tra_tsss', { tstd, tsss: [tin] });
    assert.equal(ok.isError, false);
    assert.equal(goi[0]!.method, 'POST');
    assert.equal(goi[0]!.url.pathname, '/api/bat-dong-san/ai-tsss/kiem-tra-tsss');
    assert.equal((goi[0]!.body as { tsss: unknown[] }).tsss.length, 1);
    const sai = await chay('kiem_tra_tsss', { tstd, tsss: [{ ...tin, dienTichDat: undefined }] });
    assert.equal(sai.isError, true);
    assert.equal(goi.length, 1);
  });
});

describe('nhập tin — rào chắn hai bước', () => {
  const kiemTraOk = () => json({ data: { success: 0, errors: [], total: 1, kiemTra: true, hopLe: 1, dauVan: 'DV1' } });

  it('kiem_tra_nhap_bai_dang gửi kiemTra:true, trả dauVan; KHÔNG ghi', async () => {
    const { chay, goi } = await dung(kiemTraOk);
    const r = await chay('kiem_tra_nhap_bai_dang', { rows: [dong] });
    assert.equal(r.isError, false);
    assert.match(r.text, /DV1/);
    assert.deepEqual(goi[0]!.body, { rows: [dong], kiemTra: true });
    assert.equal(goi[0]!.url.pathname, '/api/bat-dong-san/bai-dang/import');
  });

  it('nhap_bai_dang khi CHƯA kiểm tra lô trong phiên → từ chối, KHÔNG gọi API', async () => {
    const { chay, goi } = await dung(kiemTraOk);
    const r = await chay('nhap_bai_dang', { rows: [dong], dauVan: 'DV1', nguoiDungDaDongY: true });
    assert.equal(r.isError, true);
    assert.match(r.text, /Chưa kiểm tra lô này/);
    assert.equal(goi.length, 0);
  });

  it('nhap_bai_dang thiếu nguoiDungDaDongY hoặc đặt false → bị schema chặn, KHÔNG gọi API', async () => {
    const { chay, goi } = await dung(kiemTraOk);
    await chay('kiem_tra_nhap_bai_dang', { rows: [dong] });
    for (const args of [{ rows: [dong], dauVan: 'DV1' }, { rows: [dong], dauVan: 'DV1', nguoiDungDaDongY: false }]) {
      const r = await chay('nhap_bai_dang', args);
      assert.equal(r.isError, true);
    }
    assert.equal(goi.length, 1); // chỉ lần kiểm tra
  });

  it('đủ điều kiện → POST import với dauVan (không có kiemTra), trả kết quả', async () => {
    const { chay, goi } = await dung((g) =>
      (g.body as { kiemTra?: boolean }).kiemTra
        ? kiemTraOk()
        : json({ data: { success: 1, errors: [], total: 1, choDuyet: true } }),
    );
    await chay('kiem_tra_nhap_bai_dang', { rows: [dong] });
    const r = await chay('nhap_bai_dang', { rows: [dong], dauVan: 'DV1', nguoiDungDaDongY: true });
    assert.equal(r.isError, false);
    assert.match(r.text, /choDuyet/);
    assert.deepEqual(goi[1]!.body, { rows: [dong], dauVan: 'DV1' });
  });

  it(`quá ${SO_DONG_TOI_DA} dòng → bị chặn ngay ở MCP (cả hai tool), không gọi API`, async () => {
    const { chay, goi } = await dung(kiemTraOk);
    const nhieu = Array.from({ length: SO_DONG_TOI_DA + 1 }, () => dong);
    assert.equal((await chay('kiem_tra_nhap_bai_dang', { rows: nhieu })).isError, true);
    assert.equal((await chay('nhap_bai_dang', { rows: nhieu, dauVan: 'x', nguoiDungDaDongY: true })).isError, true);
    assert.equal((await chay('kiem_tra_nhap_bai_dang', { rows: [] })).isError, true);
    assert.equal(goi.length, 0);
  });

  it('server từ chối (dấu vân sai) → isError kèm đúng câu của server; không giả vờ thành công', async () => {
    const { chay } = await dung((g) =>
      (g.body as { kiemTra?: boolean }).kiemTra
        ? kiemTraOk()
        : json({ error: 'Phải kiểm tra lô dữ liệu trước (kiemTra: true) rồi gửi đúng dấu vân (dauVan) của chính lô đó mới được nhập' }, 400),
    );
    await chay('kiem_tra_nhap_bai_dang', { rows: [dong] });
    const r = await chay('nhap_bai_dang', { rows: [dong], dauVan: 'DV1', nguoiDungDaDongY: true });
    assert.equal(r.isError, true);
    assert.match(r.text, /Phải kiểm tra lô dữ liệu trước/);
  });
});

describe('xử lý lỗi chung', () => {
  it('lỗi từ API → isError + câu tiếng Việt; không lộ khoá API', async () => {
    const { chay } = await dung(() => json({ error: 'Khoá API không hợp lệ hoặc đã bị thu hồi' }, 401));
    const r = await chay('tham_chieu_danh_muc', {});
    assert.equal(r.isError, true);
    assert.equal(r.text, 'Khoá API không hợp lệ hoặc đã bị thu hồi');
    assert.ok(!r.text.includes(KHOA));
  });

  it('lỗi mạng → câu chung, không lộ chi tiết nội bộ', async () => {
    const { chay } = await dung(() => {
      throw new TypeError(`ECONNREFUSED ${KHOA}`);
    });
    const r = await chay('tra_dia_chi', { lat: 10, lng: 106 });
    assert.equal(r.isError, true);
    assert.ok(!r.text.includes(KHOA) && !r.text.includes('ECONNREFUSED'));
  });
});

describe('quy trình nhúng sẵn', () => {
  it('quy-trinh.generated.ts khớp huong-dan/quy-trinh-tim-tsss.md (sửa .md mà quên `npm run nhung` là đỏ)', async () => {
    const { execFileSync } = await import('node:child_process');
    const kq = execFileSync('node', ['scripts/nhung-quy-trinh.mjs', '--kiem-tra'], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(kq, '');
  });
});
