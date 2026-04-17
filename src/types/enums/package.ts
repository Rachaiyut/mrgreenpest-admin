export enum PackageType {
  WITH_TERMITE = 'WITH_TERMITE',
  WITHOUT_TERMITE = 'WITHOUT_TERMITE',
}

export enum ContractDuration {
  ONE_TIME = 'ONE_TIME',
  THREE_MONTHS = 'THREE_MONTHS',
  SIX_MONTHS = 'SIX_MONTHS',
  ONE_YEAR = 'ONE_YEAR',
  TWO_YEARS = 'TWO_YEARS',
  THREE_YEARS = 'THREE_YEARS',
  FOUR_YEARS = 'FOUR_YEARS',
  FIVE_YEARS = 'FIVE_YEARS',
}

export const ContractDurationLabel: Record<ContractDuration, string> = {
  [ContractDuration.ONE_TIME]: 'ครั้งเดียว',
  [ContractDuration.THREE_MONTHS]: '3 เดือน',
  [ContractDuration.SIX_MONTHS]: '6 เดือน',
  [ContractDuration.ONE_YEAR]: '1 ปี',
  [ContractDuration.TWO_YEARS]: '2 ปี',
  [ContractDuration.THREE_YEARS]: '3 ปี',
  [ContractDuration.FOUR_YEARS]: '4 ปี',
  [ContractDuration.FIVE_YEARS]: '5 ปี',
};

export const ContractDurationMonths: Record<ContractDuration, number> = {
  [ContractDuration.ONE_TIME]: 0,
  [ContractDuration.THREE_MONTHS]: 3,
  [ContractDuration.SIX_MONTHS]: 6,
  [ContractDuration.ONE_YEAR]: 12,
  [ContractDuration.TWO_YEARS]: 24,
  [ContractDuration.THREE_YEARS]: 36,
  [ContractDuration.FOUR_YEARS]: 48,
  [ContractDuration.FIVE_YEARS]: 60,
};

export const calcContractEndDate = (
  startDate: string | Date,
  duration: ContractDuration,
): Date => {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
  const months = ContractDurationMonths[duration] ?? 0;
  if (months === 0) return start;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
};
