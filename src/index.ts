#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DatNgopApi } from './api-client.js';
import { taoMayChu } from './may-chu.js';

/** stdio: stdout là kênh giao thức MCP → mọi log ra stderr, tuyệt đối không in khoá API. */
async function main(): Promise<void> {
  let api: DatNgopApi;
  try {
    api = new DatNgopApi({
      baseUrl: process.env.DATNGOP_API_URL ?? 'https://api.datngop.com/api',
      khoa: process.env.DATNGOP_API_KEY ?? '',
    });
  } catch (loi) {
    console.error(`[datngop-mcp] Lỗi cấu hình: ${loi instanceof Error ? loi.message : String(loi)}`);
    process.exit(1);
  }
  await taoMayChu(api).connect(new StdioServerTransport());
  console.error('[datngop-mcp] Đã sẵn sàng (stdio)');
}

main().catch((loi) => {
  console.error(`[datngop-mcp] Dừng do lỗi: ${loi instanceof Error ? loi.message : String(loi)}`);
  process.exit(1);
});
