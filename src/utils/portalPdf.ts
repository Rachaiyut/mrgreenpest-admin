import { portalApi } from '../api/customer-portal';

type PortalDocType = 'quotations' | 'contracts' | 'receipts' | 'service-reports';

/**
 * Download / open PDF จาก portal โดยรองรับทั้ง LIFF (LINE webview) และ browser ปกติ
 *
 * LIFF: anchor download + blob URL มักไม่ trigger save dialog ใน in-app webview
 *   → ขอ short-lived token จาก backend, build URL พร้อม `?token=...`,
 *     แล้วใช้ `liff.openWindow({ external: true })` เปิดใน Safari/Chrome
 *     → browser ภายนอกจะ handle download/preview เอง
 *
 * Browser ปกติ: fetch blob ผ่าน Authorization header → trigger anchor download
 *
 * @param type doc type (matches backend portal endpoint)
 * @param id document id
 * @param filename ชื่อไฟล์ที่อยากให้ download (browser path เท่านั้น)
 */
export async function openPortalPdf(
  type: PortalDocType,
  id: string,
  filename: string,
): Promise<void> {
  const inLine = isInsideLineBrowser();

  if (inLine) {
    // LINE in-app webview:
    //   - liff.openWindow({ external: true }) ผ่าน LINE proxy → บางทีจบที่
    //     access.line.me 400 Bad Request (known issue iOS)
    //   - blob + <a download> ก็ไม่ trigger download dialog
    //   → ใช้ blob URL + navigate same window: LINE webview มี PDF preview
    //     built-in, user แตะ "..." menu เพื่อ save/share ผ่าน LINE ได้
    const blob = await portalApi.downloadPdf(type, id);
    const objectUrl = window.URL.createObjectURL(blob);
    window.location.href = objectUrl;
    // ไม่ revoke ทันที — ปล่อยให้ webview โหลด PDF เสร็จก่อน
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30_000);
    return;
  }

  // Standard browser path: fetch + anchor download
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

