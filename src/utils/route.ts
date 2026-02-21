import { Page } from '../types/page';

export const PATH_PREFIX_MAP: Record<string, Page> = {
  '/quotations': 'ใบเสนอราคา',
  '/billing': 'ใบแจ้งหนี้',
  '/reports/monthly-sales': 'ยอดขาย(รายเดือน)',
  '/reports/sales-summary': 'สรุปยอดขาย(รายเดือน)',
  '/reports/tax-invoice-income': 'รายได้ออกใบกำกับ(รายเดือน)',
  '/reports/indirect-expenses': 'ค่าใช้จ่ายทางอ้อม',
  '/reports/daily-cash': 'บัญชีเงินสดรายวัน',
  '/reports/direct-expenses': 'ค่าใช้จ่ายทางตรง',
  '/receipts': 'ใบกำกับภาษี/ใบเสร็จรับเงิน',
  '/customers': 'ลูกค้า',
};

export const getCurrentPageFromPath = (
  pathname: string,
  pathPageMap: Record<string, Page>
): Page => {
  // 1. Exact match
  if (pathPageMap[pathname]) {
    return pathPageMap[pathname];
  }

  // 2. Dynamic Prefix match from pathPageMap
  // Sort keys by length descending to catch most specific prefix first
  const prefixes = Object.keys(pathPageMap).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (
      pathname === prefix ||
      (pathname.startsWith(prefix) &&
        (pathname[prefix.length] === '/' || pathname[prefix.length] === '?'))
    ) {
      return pathPageMap[prefix];
    }
  }

  // 3. Fallback to hardcoded map (legacy)
  for (const [prefix, page] of Object.entries(PATH_PREFIX_MAP)) {
    if (pathname.startsWith(prefix)) {
      return page;
    }
  }

  return 'Dashboard';
};
