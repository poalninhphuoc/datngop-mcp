#!/usr/bin/env node
/**
 * Đồng bộ nội dung hướng dẫn AI sang WEB (repo `datngop`, cạnh repo này): trang Khoá API tạo tệp .md "tự đủ" cho AI nên cần
 * nhúng sẵn quy trình, hướng dẫn GPT và schema OpenAPI. Nguồn sự thật ở ĐÂY; web chỉ giữ bản sinh tự động.
 *   npm run dong-bo-web              → ghi đè datngop/src/app/(dashboard)/he-thong/khoa-api/lib/noi-dung-ai.generated.ts
 *   npm run dong-bo-web -- --kiem-tra → chỉ so sánh (thoát mã 1 nếu web đã cũ)
 * Sửa quy-trinh-tim-tsss.md / gpt-instructions.txt / openapi-ai-tsss.yaml xong nhớ chạy lệnh này rồi commit CẢ HAI repo.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DICH = resolve(GOC, '..', 'datngop', 'src', 'app', '(dashboard)', 'he-thong', 'khoa-api', 'lib', 'noi-dung-ai.generated.ts');
const NGUON = {
    QUY_TRINH_AI: join(GOC, 'huong-dan', 'quy-trinh-tim-tsss.md'),
    GPT_INSTRUCTIONS: join(GOC, 'mau-test', 'gpt-instructions.txt'),
    OPENAPI_YAML: join(GOC, 'mau-test', 'openapi-ai-tsss.yaml'),
};

if (!existsSync(resolve(DICH, '..'))) {
    console.error(`Không thấy thư mục web: ${resolve(DICH, '..')} (repo datngop phải nằm cạnh datngop-mcp)`);
    process.exit(2);
}
let noiDung =
    '// TỆP SINH TỰ ĐỘNG từ repo datngop-mcp bởi scripts/dong-bo-sang-web.mjs — KHÔNG sửa tay (sửa nguồn ở datngop-mcp rồi chạy `npm run dong-bo-web`).\n';
for (const [ten, tep] of Object.entries(NGUON)) noiDung += `export const ${ten}: string = ${JSON.stringify(readFileSync(tep, 'utf8'))};\n`;

if (process.argv.includes('--kiem-tra')) {
    const cu = existsSync(DICH) ? readFileSync(DICH, 'utf8') : '';
    if (cu !== noiDung) {
        console.error('noi-dung-ai.generated.ts ở web đã cũ so với datngop-mcp — chạy `npm run dong-bo-web`');
        process.exit(1);
    }
    console.log('Web khớp datngop-mcp.');
} else {
    writeFileSync(DICH, noiDung);
    console.log(`Đã ghi ${DICH}`);
}
