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
  if (await isInsideLiff()) {
    // LIFF path: external browser + signed URL
    const { token } = await portalApi.getPdfToken(type, id);
    const url = portalApi.buildPdfUrl(type, id, token);
    const liff = (await import('@line/liff')).default;
    liff.openWindow({ url, external: true });
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

/**
 * เช็คว่ารันใน LINE in-app browser (LIFF) อยู่ไหม
 * ถ้าใช่ — ensure LIFF SDK ถูก init แล้ว (เพื่อให้ openWindow ใช้ได้)
 */
async function isInsideLiff(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !/Line/i.test(navigator.userAgent)) {
    return false;
  }
  try {
    const liff = (await import('@line/liff')).default;
    const LIFF_ID = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_LINE_LIFF_ID;
    // liff.init เรียกซ้ำได้ — ถ้า init แล้วจะ resolve ทันที
    if (LIFF_ID) {
      await liff.init({ liffId: LIFF_ID });
    }
    return liff.isInClient();
  } catch {
    return false;
  }
}
