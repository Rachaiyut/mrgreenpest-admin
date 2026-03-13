export const formatThaiDate = (isoString: string | Date | undefined): string => {
  console.log("test", isoString)

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
