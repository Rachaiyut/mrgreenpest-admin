export const formatThaiDate = (isoString: string | Date | undefined): string => {
  if (!isoString) return '-';

  const date = new Date(isoString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatThaiDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return (
    date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.'
  );
};

/**
 * Convert a Date to "YYYY-MM-DD" using LOCAL timezone (not UTC).
 *
 * `Date.toISOString()` always converts to UTC and can shift the day for users
 * east of UTC (e.g. Asia/Bangkok +07:00) — picking 9 May locally would yield
 * "2026-05-08" via toISOString. Use this helper when storing date-only values
 * from a date picker.
 */
export const toLocalISODate = (date: Date | null | undefined): string => {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Format as dd/mm/yy (Buddhist year, 2-digit) — e.g. 08/05/69
 */
export const formatDateShort = (isoString: string | Date | undefined): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String((date.getFullYear() + 543) % 100).padStart(2, '0');
  return `${dd}/${mm}/${yy}`;
};
