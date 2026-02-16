
export const validateCitizenId = (id: string): string | null => {
  if (!id) return 'กรุณากรอกเลขบัตรประชาชน';
  if (!/^\d{13}$/.test(id)) {
    return 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'กรุณากรอกรหัสผ่าน';
  if (password.length < 8) {
    return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLetter || !hasNumber || !hasSpecialChar) {
    return 'รหัสผ่านต้องประกอบด้วยตัวอักษร, ตัวเลข และอักขระพิเศษ';
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) return 'กรุณากรอกอีเมล';
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return 'รูปแบบอีเมลไม่ถูกต้อง';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return 'กรุณากรอกเบอร์โทรศัพท์';
  if (!/^0\d{9}$/.test(phone)) {
    return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วย 0';
  }
  return null;
};
