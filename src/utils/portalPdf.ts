import { portalApi, type PortalDocType } from '../api/customer-portal';

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
  if (isInsideLineBrowser()) {
    // LINE webview: ขอ short-lived token → ใช้ URL ตรงๆ (ฝัง token ใน query)
    //   - liff.openWindow({ external: true }) → ผ่าน access.line.me proxy → 400 Bad Request
    //   - blob: URL → ใน iOS LINE webview มัก render ไม่ได้
    //   - window.location.href = httpsUrl → LINE webview fetch ตรง → built-in PDF viewer
    //     เปิดให้เลย (รองรับ inline content-disposition)
    const { token } = await portalApi.getPdfToken(type, id);
    const url = portalApi.buildPdfUrl(type, id, token);
    window.location.href = url;
    return;
  }

  // Standard browser: fetch blob ผ่าน Authorization header + trigger download
  const blob = await portalApi.downloadPdf(type, id);
  const objectUrl = window.URL.createObjectURL(blob);
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
