import { FC, useMemo } from 'react';
import { FormField, Input } from './FormControls';
import { formatThaiDate } from '../../utils/date';
import { PlusIcon, TrashIcon, CreditCardIcon } from '../../assets/icons/Icons';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

export interface InstallmentItem {
  id: string;
  no: number;
  description: string;
  percentage: number;
  amount: number;
  due_date?: string;
  status?: string;
}

export interface InstallmentSectionProps {
  installments: InstallmentItem[];
  onChange: (installments: InstallmentItem[]) => void;
  totalAmount: number;
  isReadOnly?: boolean;
  showPaymentMethodToggle?: boolean;
  paymentMethod?: 'TRANSFER' | 'INSTALLMENT';
  onPaymentMethodChange?: (method: 'TRANSFER' | 'INSTALLMENT') => void;
  showDueDate?: boolean;
  showStatus?: boolean;
  includeVat?: boolean;
  onIncludeVatChange?: (checked: boolean) => void;
  vatAmount?: number;
  showTotalAmountInput?: boolean;
  onTotalAmountChange?: (amount: number) => void;
  contractInfo?: { duration: string; startDate: string; endDate: string };
  disableInstallmentOption?: boolean;
  disabledReason?: string;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'รอชำระ', cls: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'ชำระแล้ว', cls: 'bg-green-50 text-green-700' },
  OVERDUE: { label: 'เกินกำหนด', cls: 'bg-red-50 text-red-700' },
};

const InstallmentSection: FC<InstallmentSectionProps> = ({
  installments, onChange, totalAmount, isReadOnly = false,
  showPaymentMethodToggle = false, paymentMethod = 'INSTALLMENT', onPaymentMethodChange,
  showDueDate = false, showStatus = false,
  includeVat, onIncludeVatChange, vatAmount = 0,
  showTotalAmountInput = false, onTotalAmountChange, contractInfo,
  disableInstallmentOption = false, disabledReason,
}) => {
  const totalPct = useMemo(() => installments.reduce((s, i) => s + (Number(i.percentage) || 0), 0), [installments]);
  const totalAmt = useMemo(() => installments.reduce((s, i) => s + (Number(i.amount) || 0), 0), [installments]);
  const isLast = (i: number) => i === installments.length - 1 && installments.length > 1;
  const pctOk = Math.abs(totalPct - 100) < 0.5;
  const amtOk = Math.abs(totalAmt - totalAmount) < 1;
  const isPay = paymentMethod === 'INSTALLMENT';

  const recalc = (items: InstallmentItem[]) => {
    if (items.length <= 1) return items;
    const li = items.length - 1;
    let sp = 0, sa = 0;
    for (let i = 0; i < li; i++) { sp += Number(items[i].percentage) || 0; sa += Number(items[i].amount) || 0; }
    items[li] = { ...items[li], percentage: Math.round(Math.max(0, 100 - sp)), amount: Number(Math.max(0, totalAmount - sa).toFixed(2)) };
    return items;
  };

  const handleChange = (idx: number, field: string, value: any) => {
    const u = [...installments]; const c = { ...u[idx] };
    if (isLast(idx) && (field === 'percentage' || field === 'amount')) return;
    if (field === 'percentage') {
      c.percentage = Math.min(100, Math.max(0, value === '' ? 0 : Math.round(Number(value))));
      c.amount = totalAmount > 0 ? Number(((c.percentage / 100) * totalAmount).toFixed(2)) : 0;
    } else if (field === 'amount') {
      c.amount = Math.max(0, value === '' ? 0 : Number(value));
      c.percentage = totalAmount > 0 ? Math.round((c.amount / totalAmount) * 100) : 0;
    } else { (c as any)[field] = value; u[idx] = c; onChange(u); return; }
    u[idx] = c; onChange(recalc(u));
  };

  const handleAdd = () => {
    const n = installments.length + 1;
    let dd = '';
    if (showDueDate && installments.length > 0 && installments[installments.length - 1].due_date) {
      const d = new Date(installments[installments.length - 1].due_date!); d.setMonth(d.getMonth() + 1); dd = d.toISOString().split('T')[0];
    }
    onChange(recalc([...installments, { id: crypto.randomUUID(), no: n, description: `งวดที่ ${n}`, percentage: 0, amount: 0, due_date: dd, status: 'PENDING' }]));
  };

  const handleRemove = (idx: number) => {
    if (installments.length <= 1) return;
    const r = installments.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, no: i + 1, description: inst.description?.startsWith('งวดที่') ? `งวดที่ ${i + 1}` : inst.description }));
    if (r.length > 0 && totalAmount > 0) {
      let sp = 0, sa = 0;
      for (let i = 0; i < r.length - 1; i++) { sp += Number(r[i].percentage) || 0; sa += Number(r[i].amount) || 0; }
      r[r.length - 1].percentage = Math.round(Math.max(0, 100 - sp));
      r[r.length - 1].amount = Number(Math.max(0, totalAmount - sa).toFixed(2));
    }
    onChange(r);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1 lg:col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 rounded-lg text-green-600"><CreditCardIcon className="w-5 h-5" /></div>
          <h3 className="font-semibold text-slate-800 text-lg">เงื่อนไขการชำระเงิน</h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Payment Toggle */}
        {showPaymentMethodToggle && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'TRANSFER' as const, title: 'ชำระเต็มจำนวน', desc: 'เงินสด / โอนเงิน / เครดิต', active: !isPay },
              { key: 'INSTALLMENT' as const, title: 'แบ่งชำระ (งวดงาน)', desc: 'แบ่งจ่ายตามงวดงานที่กำหนด', active: isPay },
            ].map((opt) => {
              const isOptDisabled = isReadOnly || (opt.key === 'INSTALLMENT' && disableInstallmentOption);
              return (
                <label
                  key={opt.key}
                  title={opt.key === 'INSTALLMENT' && disableInstallmentOption ? (disabledReason || 'ไม่สามารถเลือกแบ่งชำระได้') : ''}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${isOptDisabled ? (opt.active ? 'cursor-not-allowed opacity-60 border-primary bg-primary/5' : 'cursor-not-allowed opacity-50 border-slate-200 bg-slate-50') : opt.active ? 'cursor-pointer border-green-500 bg-green-50' : 'cursor-pointer border-slate-200 hover:border-slate-300 bg-white'}`}
                >
                  <input type="radio" name="paymentCondition" checked={opt.active} onChange={() => onPaymentMethodChange?.(opt.key)} className={`w-4 h-4 ${isOptDisabled ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-green-600 border-slate-300 focus:ring-green-500'}`} disabled={isOptDisabled} />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">{opt.title}</span>
                    <span className="block text-xs text-slate-500">{opt.key === 'INSTALLMENT' && disableInstallmentOption ? (disabledReason || 'ไม่รองรับ') : opt.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Amount & VAT */}
        {(showTotalAmountInput || includeVat !== undefined) && isPay && (
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showTotalAmountInput && (
                <FormField label="มูลค่ารวมสุทธิ (บาท)">
                  <Input type="number" value={totalAmount} onChange={(e) => onTotalAmountChange?.(Number(e.target.value))} className={`text-right font-bold text-lg ${isReadOnly ? '' : 'text-green-700 bg-white'}`} disabled={isReadOnly} />
                </FormField>
              )}
              {includeVat !== undefined && onIncludeVatChange && (
                <div className="flex items-end">
                  <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                    <label className={`flex items-center gap-2 text-sm ${isReadOnly ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-700'}`}>
                      <input type="checkbox" checked={includeVat} onChange={(e) => onIncludeVatChange(e.target.checked)} className={`rounded h-4 w-4 ${isReadOnly ? 'border-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'border-slate-300 text-green-600 focus:ring-green-500'}`} disabled={isReadOnly} />
                      รวม VAT 7%
                    </label>
                    {includeVat && <span className="font-semibold text-slate-800 text-sm">{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contract Info */}
        {contractInfo && isPay && (
          <div className="p-3 rounded-lg border border-blue-100 bg-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <span>ระยะเวลา:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">{contractInfo.duration}</span>
            </div>
            <div className="text-slate-600">
              {contractInfo.startDate ? new Date(contractInfo.startDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}
              <span className="mx-2 text-slate-400">-</span>
              {contractInfo.endDate ? new Date(contractInfo.endDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}
            </div>
          </div>
        )}

        {/* Installment rows */}
        {isPay && (
          <div className="space-y-4">
            {installments.map((inst, idx) => {
              const last = isLast(idx);
              const st = statusMap[inst.status || 'PENDING'] || statusMap.PENDING;
              return (
                <div key={inst.id || idx} className={`rounded-xl border overflow-hidden ${last ? 'border-amber-200' : 'border-slate-200'}`}>
                  {/* Header bar */}
                  <div className={`flex items-center justify-between px-5 py-3 ${last ? 'bg-amber-50' : 'bg-slate-50'} border-b ${last ? 'border-amber-100' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">{inst.no}</span>
                      <span className="text-sm font-semibold text-slate-600">งวดที่ {inst.no}</span>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => handleRemove(idx)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" disabled={installments.length <= 1}>
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Fields */}
                  <div className="bg-white px-5 py-4">
                    <div className={`grid gap-4 ${showDueDate ? 'grid-cols-12' : 'grid-cols-12'}`}>
                      <div className={showDueDate ? 'col-span-12 sm:col-span-6' : 'col-span-12 sm:col-span-7'}>
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">รายละเอียด</label>
                        <Input value={inst.description || ''} onChange={(e) => handleChange(idx, 'description', e.target.value)} placeholder="รายละเอียด..." className="h-10" disabled={isReadOnly} />
                      </div>
                      <div className={showDueDate ? 'col-span-12 sm:col-span-1' : 'col-span-12 sm:col-span-2'}>
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">% สัดส่วน</label>
                        <Input type="number" value={inst.percentage !== undefined && inst.percentage !== null ? inst.percentage : ''} onChange={(e) => handleChange(idx, 'percentage', e.target.value)} className={`h-10 text-right font-mono ${!isReadOnly && last ? 'bg-slate-50 text-slate-400' : ''}`} disabled={isReadOnly || last} min={0} max={100} />
                      </div>
                      <div className={showDueDate ? 'col-span-12 sm:col-span-3' : 'col-span-12 sm:col-span-3'}>
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block sm:text-center">จำนวนเงิน (บาท)</label>
                        <Input type="number" step="0.01" value={inst.amount !== undefined && inst.amount !== null ? Number(inst.amount).toFixed(2) : '0.00'} onChange={(e) => handleChange(idx, 'amount', e.target.value)} className={`h-10 font-mono ${!isReadOnly && last ? 'bg-slate-50 text-slate-400' : ''}`} disabled={isReadOnly || last} style={{ textAlign: 'right' }} />
                      </div>
                      {showDueDate && (
                        <div className="col-span-12 sm:col-span-2">
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block text-center">วันครบกำหนด</label>
                          <DatePicker selected={inst.due_date ? new Date(inst.due_date) : null} onChange={(date: Date | null) => handleChange(idx, 'due_date', date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="วว/ดด/ปปปป" disabled={isReadOnly} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 text-center" wrapperClassName="w-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className={`rounded-xl overflow-hidden border ${amtOk && pctOk ? 'border-green-200' : 'border-red-200'}`}>
              <div className={`flex items-center justify-between px-5 py-4 ${amtOk && pctOk ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className={`text-sm font-semibold ${amtOk && pctOk ? 'text-green-800' : 'text-red-800'}`}>
                  ยอดรวม {installments.length} งวด <span className={`font-bold ${pctOk ? 'text-green-600' : 'text-red-600'}`}>({totalPct.toFixed(0)}%)</span>
                </span>
                <span className={`text-xl font-bold tracking-tight ${amtOk ? 'text-green-700' : 'text-red-700'}`}>
                  {totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
              {(!amtOk || !pctOk) && (
                <div className="px-5 py-2.5 bg-red-50 border-t border-red-100 text-xs text-red-600">
                  {!pctOk && <span>สัดส่วนรวม {totalPct.toFixed(0)}% (ต้องครบ 100%)</span>}
                  {!pctOk && !amtOk && <span className="mx-2">|</span>}
                  {!amtOk && <span>ยอดไม่ตรงกับยอดสุทธิ ({totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท)</span>}
                </div>
              )}
            </div>

            {/* Add */}
            {!isReadOnly && (
              <div className="flex justify-center mt-2">
                <button type="button" onClick={handleAdd} className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium">
                  <PlusIcon className="w-5 h-5" /> เพิ่มงวดชำระ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallmentSection;
