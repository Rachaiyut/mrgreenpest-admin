// Application Constants
export const APP_CONFIG = {
  name: 'MRGREEPEST',
  version: '1.0.0',
  description: '',
} as const;

export const BUILDING_TYPE_LABELS: Record<string, string> = {
  OFFICE: 'สำนักงาน',
  HOUSE: 'บ้านพักอาศัย',
  FACTORY: 'โรงงาน',
  CONDO: 'คอนโดมิเนียม',
  TOWNHOUSE: 'ทาวน์เฮ้าส์',
  SHOPHOUSE: 'อาคารพาณิชย์',
  RESTAURANT: 'ร้านอาหาร',
  OTHER: 'อื่นๆ',
};
