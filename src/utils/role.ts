export const roleNameMapping: Record<string, string> = {
  SUPERADMIN: 'ผู้ดูแลระบบสูงสุด',
  ADMIN: 'ผู้ดูแลระบบ',
  COO: 'ประธานเจ้าหน้าที่ฝ่ายปฏิบัติการ',
  CFO: 'ประธานเจ้าหน้าที่ฝ่ายการเงิน',
  CEO: 'ประธานเจ้าหน้าที่บริหาร',
  SALE: 'ฝ่ายขาย',
  CS: 'ฝ่ายบริการลูกค้า (CS)',
  TECH: 'ช่างเทคนิค',
  LEAD_TECH: 'หัวหน้าช่างเทคนิค',
  ACCOUNT: 'ฝ่ายบัญชี',
  MANAGER: 'ผู้จัดการ',
  USER: 'ผู้ใช้งานทั่วไป',
};

export const getRoleNameTh = (roleName: string): string => {
  return roleNameMapping[roleName] || roleName;
};
