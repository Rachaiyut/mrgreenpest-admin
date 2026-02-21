export const formatPhoneNumber = (
  phoneNumber: string | undefined | null
): string => {
  if (!phoneNumber) return '-';

  // Remove non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    // Mobile: 0XX-XXX-XXXX
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 9) {
    // Landline: 02-XXX-XXXX
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }

  // Return original if not matching standard lengths
  return phoneNumber;
};
