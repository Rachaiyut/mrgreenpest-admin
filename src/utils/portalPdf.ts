import { portalApi } from '../api/customer-portal';

type PortalDocType = 'quotations' | 'contracts' | 'receipts' | 'service-reports';

/**
 * Open / download portal PDF — รองรับทั้ง LINE in-app webview และ browser ปกติ
 *
 * LINE webview (LIFF):
 *   - `<a download>` ไม่ trigger save dialog
 *   - `liff.openWindow({ external: true })` route ผ่าน access.line.me → 400 Bad Request
 *     (เป็น known issue iOS — JWT/long URL ทำ proxy พัง)
 *   → ใช้ blob URL + navigate same window: LINE มี PDF viewer built-in, user แตะ
 *     ปุ่ม "..." เพื่อ save/share/forward
 *
 * Browser ปกติ: fetch blob + anchor download
 */
export async function openPortalPdf(
  type: PortalDocType,
  id: string,
  filename: string,
): Promise<void> {
  const blob = await portalApi.downloadPdf(type, id);
  const objectUrl = window.URL.createObjectURL(blob);

  if (isInsideLineBrowser()) {
    // LINE webview: navigate ในหน้าเดิม → PDF viewer เปิดให้เลย
    // ไม่ revoke ทันที — รอ webview โหลด PDF เสร็จก่อน
    window.location.href = objectUrl;
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30_000);
    return;
  }

  // Standard browser: trigger download
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(objectUrl);
}

function isInsideLineBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Line/i.test(navigator.userAgent);
}
