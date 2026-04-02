export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  RENEWED = 'RENEWED',
}

export const ContractStatusLabel: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'ร่างสัญญา',
  [ContractStatus.PENDING]: 'รอดำเนินการ',
  [ContractStatus.ACTIVE]: 'อยู่ในสัญญา',
  [ContractStatus.CANCELLED]: 'ยกเลิกสัญญา',
  [ContractStatus.EXPIRED]: 'หมดอายุ',
  [ContractStatus.RENEWED]: 'ต่อสัญญา',
};

export const ContractStatusColor: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'bg-slate-100 text-slate-600',
  [ContractStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
  [ContractStatus.ACTIVE]: 'bg-green-100 text-green-700',
  [ContractStatus.CANCELLED]: 'bg-red-100 text-red-700',
  [ContractStatus.EXPIRED]: 'bg-zinc-100 text-zinc-600',
  [ContractStatus.RENEWED]: 'bg-indigo-100 text-indigo-700',
};
