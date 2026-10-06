#!/usr/bin/env node
/**
 * Nhúng `huong-dan/quy-trinh-tim-tsss.md` vào `src/quy-trinh.generated.ts` để server MCP KHÔNG phải đọc tệp ngoài lúc chạy
 * (cần cho bản đóng gói một tệp và bản cài từ npm). Chạy tự động trước build/test/bundle; `--kiem-tra` chỉ so sánh, không ghi
 * (dùng trong test để bắt trường hợp sửa .md mà quên sinh lại).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..');
const NGUON = join(GOC, 'huong-dan', 'quy-trinh-tim-tsss.md');
const DICH = join(GOC, 'src', 'quy-trinh.generated.ts');

export function sinhNoiDung() {
    const md = readFileSync(NGUON, 'utf8');
    return `// TỆP SINH TỰ ĐỘNG từ huong-dan/quy-trinh-tim-tsss.md bởi scripts/nhung-quy-trinh.mjs — KHÔNG sửa tay (sửa .md rồi chạy \`npm run nhung\`).\nexport const QUY_TRINH: string = ${JSON.stringify(md)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const moi = sinhNoiDung();
    if (process.argv.includes('--kiem-tra')) {
        const cu = existsSync(DICH) ? readFileSync(DICH, 'utf8') : '';
        if (cu !== moi) {
            console.error('quy-trinh.generated.ts đã cũ so với quy-trinh-tim-tsss.md — chạy `npm run nhung`');
            process.exit(1);
        }
    } else if (!existsSync(DICH) || readFileSync(DICH, 'utf8') !== moi) {
        writeFileSync(DICH, moi);
        console.log('Đã sinh src/quy-trinh.generated.ts');
    }
}
