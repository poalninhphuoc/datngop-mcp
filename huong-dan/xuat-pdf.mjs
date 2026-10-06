#!/usr/bin/env node
/**
 * Xuất tài liệu tích hợp AI/MCP ra PDF: gộp các tệp Markdown → HTML (font hệ thống, đủ dấu tiếng Việt) → in bằng Chrome headless.
 *   npm run pdf                       → huong-dan/huong-dan-tich-hop-ai-mcp.pdf
 *   CHROME="/đường/dẫn/chrome" npm run pdf   (nếu Chrome không ở vị trí macOS mặc định)
 * Không đưa khoá/bí mật vào PDF: nguồn chỉ có ví dụ giữ chỗ (`dnk_…`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP = resolve(HERE, '..');
const BE_DOCS = resolve(MCP, '..', 'datngop-be', 'docs');
const RA = join(HERE, 'huong-dan-tich-hop-ai-mcp.pdf');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const NGAY = '06/10/2026';

/** Các phần theo thứ tự. `bo` = số dòng đầu cần bỏ (tiêu đề # gốc, thay bằng tiêu đề phần). */
const PHAN = [
    { tieuDe: '1. Tổng quan', tep: join(HERE, 'tong-quan-tich-hop.md') },
    { tieuDe: '2. Backend: khoá API, API, bảo mật, vận hành', tep: join(BE_DOCS, 'ket-noi-ai-api.md'), bo: 1 },
    { tieuDe: '3. MCP server: cài đặt và sử dụng (Claude)', tep: join(MCP, 'README.md'), bo: 1 },
    { tieuDe: '4. Kết nối GPT (OpenAI)', tep: join(MCP, 'mau-test', 'huong-dan-gpt.md'), bo: 1 },
    { tieuDe: '5. Bộ mẫu test', tep: join(MCP, 'mau-test', 'README.md'), bo: 1 },
    { tieuDe: 'Phụ lục A. Quy trình cho AI (hướng dẫn dự án)', tep: join(MCP, 'huong-dan', 'quy-trinh-tim-tsss.md'), bo: 1 },
];

for (const p of PHAN) if (!existsSync(p.tep)) throw new Error(`Thiếu tệp nguồn: ${p.tep}`);
if (!existsSync(CHROME)) throw new Error(`Không thấy Chrome tại "${CHROME}" — đặt biến CHROME`);

/** Hạ cấp tiêu đề (# → ###…) để nằm dưới tiêu đề phần; bỏ liên kết tương đối (vô nghĩa trong PDF), giữ chữ. */
function chuanBi(md, bo = 0) {
    let dong = md.split('\n').slice(bo);
    let trongKhoiMa = false;
    dong = dong.map((d) => {
        if (d.startsWith('```')) trongKhoiMa = !trongKhoiMa;
        if (trongKhoiMa) return d;
        const m = /^(#{1,5})\s+(.*)$/.exec(d);
        return m ? `${'#'.repeat(Math.min(m[1].length + 1, 6))} ${m[2]}` : d;
    });
    return dong
        .join('\n')
        .replace(/\[([^\]]+)\]\((?!https?:|#|mailto:)[^)]+\)/g, '$1')
        .replace(/^>\s*Dán nội dung này.*$/gm, (x) => x);
}

const duocDung = new Set();
const tocMuc = [];
const slug = (s) => {
    const cs = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'muc';
    let k = cs, i = 2;
    while (duocDung.has(k)) k = `${cs}-${i++}`;
    duocDung.add(k);
    return k;
};
const rd = new marked.Renderer();
rd.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const plain = tokens.map((t) => t.raw ?? t.text ?? '').join('').replace(/[*_`]/g, '');
    const id = slug(plain);
    // Tiêu đề trong tệp nguồn đã hạ cấp 1 bậc: `##` gốc → h3 (mục chính của phần), `###` gốc → h4
    if (depth === 3) tocMuc.push({ id, text: plain, cap: 1 });
    if (depth === 4) tocMuc.push({ id, text: plain, cap: 2 });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};
marked.use({ renderer: rd, gfm: true, breaks: false });

let thanVan = '';
PHAN.forEach((p, i) => {
    const id = slug(p.tieuDe);
    tocMuc.push({ id, text: p.tieuDe, cap: 0 });
    thanVan += `<section class="phan"><h1 id="${id}">${p.tieuDe}</h1>\n${marked.parse(chuanBi(readFileSync(p.tep, 'utf8'), p.bo))}</section>\n`;
});
// TOC: phần (cấp 0) và mục chính (cấp 1)
const toc = tocMuc
    .filter((m) => m.cap <= 1)
    .map((m) => `<li class="c${m.cap}"><a href="#${m.id}">${m.text}</a></li>`)
    .join('\n');

const css = `
@page { size: A4; margin: 18mm 15mm 18mm 15mm; @bottom-center { content: counter(page) " / " counter(pages); font: 9px Helvetica, Arial, sans-serif; color: #666; } }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5px; line-height: 1.5; color: #1a1a1a; }
h1 { font-size: 20px; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2px solid #143f22; color: #143f22; }
h2 { font-size: 14.5px; margin: 18px 0 6px; color: #143f22; }
h3 { font-size: 12px; margin: 14px 0 4px; }
h4, h5, h6 { font-size: 11px; margin: 10px 0 3px; }
h1, h2, h3, h4 { break-after: avoid; }
.phan { break-before: page; }
p, li { orphans: 3; widows: 3; }
code { font-family: Menlo, "Courier New", monospace; font-size: 9.2px; background: #f1f3f4; padding: 1px 3px; border-radius: 3px; word-break: break-word; }
pre { background: #f6f8fa; border: 1px solid #dde1e4; border-radius: 4px; padding: 8px; white-space: pre-wrap; word-break: break-word; break-inside: avoid-page; }
pre code { background: none; padding: 0; font-size: 8.8px; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9.4px; }
th, td { border: 1px solid #cfd4d8; padding: 4px 6px; vertical-align: top; text-align: left; overflow-wrap: break-word; }
th:first-child, td:first-child { min-width: 72px; }
th { background: #eaf1ec; }
tr { break-inside: avoid; }
blockquote { margin: 8px 0; padding: 4px 10px; border-left: 3px solid #b8c4bb; color: #444; background: #fafbfa; }
ul, ol { padding-left: 18px; margin: 4px 0; }
a { color: #0b5cad; text-decoration: none; }
.bia { height: 250mm; display: flex; flex-direction: column; justify-content: center; }
.bia .nhan { color: #666; letter-spacing: .08em; font-size: 11px; text-transform: uppercase; }
.bia h1 { font-size: 30px; border: 0; margin: 8px 0; }
.bia .phu { font-size: 14px; color: #333; margin-bottom: 24px; }
.bia table { width: auto; font-size: 11px; }
.toc { break-before: page; }
.toc h1 { margin-bottom: 8px; }
.toc ul { list-style: none; padding: 0; }
.toc li.c0 { font-weight: 700; margin-top: 8px; font-size: 11.5px; }
.toc li.c1 { margin-left: 14px; font-size: 10px; }
`;
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hướng dẫn tích hợp AI/MCP — DatNgop</title><style>${css}</style></head><body>
<section class="bia">
  <div class="nhan">DatNgop · Tài liệu tích hợp</div>
  <h1>Kết nối AI (Claude, GPT) vào DatNgop</h1>
  <div class="phu">Tìm tài sản so sánh, kiểm tra và nhập vào hàng chờ duyệt — qua khoá API hạn chế quyền, có nhật ký đầy đủ</div>
  <table>
    <tr><th>Phiên bản</th><td>1.0 — ${NGAY}</td></tr>
    <tr><th>Địa chỉ API</th><td><code>https://api.datngop.com/api</code></td></tr>
    <tr><th>Trang quản lý khoá</th><td>Web → Hệ thống → Khoá API cho AI/MCP (<code>/he-thong/khoa-api</code>, chỉ Admin)</td></tr>
    <tr><th>Nguồn</th><td><code>datngop-be/docs/ket-noi-ai-api.md</code> · <code>datngop-mcp/README.md</code> · <code>datngop-mcp/mau-test/</code></td></tr>
  </table>
  <p style="margin-top:28px;color:#666">Tài liệu không chứa khoá hay bí mật; mọi giá trị <code>dnk_…</code> chỉ là ví dụ giữ chỗ.</p>
</section>
<section class="toc"><h1>Mục lục</h1><ul>${toc}</ul></section>
${thanVan}
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'datngop-pdf-'));
const f = join(tmp, 'tai-lieu.html');
writeFileSync(f, html);
try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${RA}`, pathToFileURL(f).href], { stdio: 'pipe', timeout: 120000 });
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
console.log(`Đã xuất: ${RA}`);
