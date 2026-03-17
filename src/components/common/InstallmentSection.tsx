import { FC, useMemo } from 'react';
import { FormField, Input, Select } from './FormControls';
import { PlusIcon, TrashIcon, CreditCardIcon } from '../../assets/icons/Icons';

// ─── Types ───────────────────────────────────────────────────────────
export interface InstallmentItem {
  id: string;
  no: number;           // installment_no / term
  description: string;  // notes / description
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

  // Optional: payment method toggle (QuotationForm uses this)
  showPaymentMethodToggle?: boolean;
  paymentMethod?: 'TRANSFER' | 'INSTALLMENT';
  onPaymentMethodChange?: (method: 'TRANSFER' | 'INSTALLMENT') => void;

  // Optional: extra columns for Contract
  showDueDate?: boolean;
  showStatus?: boolean;

  // Optional: VAT display
  includeVat?: boolean;
  onIncludeVatChange?: (checked: boolean) => void;
  vatAmount?: number;

  // Optional: summary display
  showTotalAmountInput?: boolean;
  onTotalAmountChange?: (amount: number) => void;

  // Optional: contract duration summary
  contractInfo?: {
    duration: string;
    startDate: string;
    endDate: string;
  };
}

// ─── Section Header (internal) ───────────────────────────────────────
const SectionHeader: FC<{ icon: any; title: string }> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-5">
    <div className="p-2 bg-green-100 rounded-lg">
      <Icon className="w-5 h-5 text-green-600" />
    </div>
    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
  </div>
);

// ─── Component ───────────────────────────────────────────────────────
const InstallmentSection: FC<InstallmentSectionProps> = ({
  installments,
  onChange,
  totalAmount,
  isReadOnly = false,
  showPaymentMethodToggle = false,
  paymentMethod = 'INSTALLMENT',
  onPaymentMethodChange,
  showDueDate = false,
  showStatus = false,
  includeVat,
  onIncludeVatChange,
  vatAmount = 0,
  showTotalAmountInput = false,
  onTotalAmountChange,
  contractInfo,
}) => {
  // Derived values
  const totalPercentage = useMemo(
    () => installments.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0),
    [installments]
  );
  const totalInstallmentAmount = useMemo(
    () => installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [installments]
  );

  // ─── Handlers ───────────────────────────────────────────────────
  const handleChange = (index: number, field: string, value: any) => {
    const updated = [...installments];
    const current = { ...updated[index] };

    if (field === 'percentage') {
      const pct = Math.min(100, Math.max(0, value === '' ? 0 : Math.round(Number(value))));
      current.percentage = pct;
      current.amount = totalAmount > 0 ? Number(((pct / 100) * totalAmount).toFixed(2)) : 0;
    } else if (field === 'amount') {
      const amt = Math.max(0, value === '' ? 0 : Number(value));
      current.amount = amt;
      current.percentage = totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0;
    } else {
      (current as any)[field] = value;
      updated[index] = current;
      onChange(updated);
      return;
    }

    updated[index] = current;

    // Auto-distribute remaining to other installments
    if (updated.length > 1) {
      const remainingPct = Math.max(0, 100 - current.percentage);
      const otherCount = updated.length - 1;
      const splitPct = Math.floor(remainingPct / otherCount);

      let accPct = current.percentage;
      let accAmt = current.amount;
      const lastIdx = index === updated.length - 1 ? updated.length - 2 : updated.length - 1;

      for (let i = 0; i < updated.length; i++) {
        if (i === index) continue;
        if (i === lastIdx) {
          updated[i] = { ...updated[i], percentage: Math.max(0, 100 - accPct), amount: Number(Math.max(0, totalAmount - accAmt).toFixed(2)) };
        } else {
          const p = splitPct;
          const a = Number(((p / 100) * totalAmount).toFixed(2));
          updated[i] = { ...updated[i], percentage: p, amount: a };
          accPct += p;
          accAmt += a;
        }
      }
    }

    onChange(updated);
  };

  const handleAdd = () => {
    const newNo = installments.length + 1;
    let nextDueDate = '';
    if (showDueDate && installments.length > 0) {
      const last = installments[installments.length - 1];
      if (last.due_date) {
        const d = new Date(last.due_date);
        d.setMonth(d.getMonth() + 1);
        nextDueDate = d.toISOString().split('T')[0];
      }
    }
    onChange([
      ...installments,
      {
        id: crypto.randomUUID(),
        no: newNo,
        description: `งวดที่ ${newNo}`,
        percentage: 0,
        amount: 0,
        due_date: nextDueDate,
        status: 'PENDING',
      },
    ]);
  };

  const handleRemove = (index: number) => {
    if (installments.length <= 1) return;
    const filtered = installments.filter((_, i) => i !== index);
    const remapped = filtered.map((inst, i) => ({
      ...inst,
      no: i + 1,
      description: inst.description?.startsWith('งวดที่') ? `งวดที่ ${i + 1}` : inst.description,
    }));

    // Recalculate last installment to balance
    if (remapped.length > 0 && totalAmount > 0) {
      let sumPct = 0, sumAmt = 0;
      for (let i = 0; i < remapped.length - 1; i++) {
        sumPct += Number(remapped[i].percentage) || 0;
        sumAmt += Number(remapped[i].amount) || 0;
      }
      const last = remapped.length - 1;
      remapped[last].percentage = Math.round(Math.max(0, 100 - sumPct));
      remapped[last].amount = Number(Math.max(0, totalAmount - sumAmt).toFixed(2));
    }
    onChange(remapped);
  };

  const handleDistribute = () => {
    if (installments.length === 0) return;
    const count = installments.length;
    const basePct = Math.floor((100 / count) * 100) / 100;
    let accPct = 0;

    const distributed = installments.map((inst, i) => {
      let pct = basePct;
      if (i === count - 1) {
        pct = Number((100 - accPct).toFixed(2));
      } else {
        accPct += pct;
      }
      return { ...inst, percentage: pct, amount: Math.round(totalAmount * (pct / 100)) };
    });
    onChange(distributed);
  };

  const isPaymentInstallment = paymentMethod === 'INSTALLMENT';
  const percentOk = Math.abs(totalPercentage - 100) < 0.5;
  const amountOk = Math.abs(totalInstallmentAmount - totalAmount) < 1;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1 lg:col-span-2">
      <SectionHeader icon={CreditCardIcon} title="เงื่อนไขการชำระเงิน" />
      <div className="space-y-6">

        {/* Payment Method Toggle */}
        {showPaymentMethodToggle && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${!isPaymentInstallment ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <input type="radio" name="paymentCondition" checked={!isPaymentInstallment} onChange={() => onPaymentMethodChange?.('TRANSFER')} className="w-5 h-5 text-green-600 border-slate-300 focus:ring-green-500" disabled={isReadOnly} />
              <div className="ml-3">
                <span className="block text-base font-bold text-slate-800">ชำระเต็มจำนวน</span>
                <span className="block text-xs text-slate-500">เงินสด / โอนเงิน / เครดิต</span>
              </div>
            </label>
            <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${isPaymentInstallment ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <input type="radio" name="paymentCondition" checked={isPaymentInstallment} onChange={() => onPaymentMethodChange?.('INSTALLMENT')} className="w-5 h-5 text-green-600 border-slate-300 focus:ring-green-500" disabled={isReadOnly} />
              <div className="ml-3">
                <span className="block text-base font-bold text-slate-800">แบ่งชำระ (งวดงาน)</span>
                <span className="block text-xs text-slate-500">แบ่งจ่ายตามงวดงานที่กำหนด</span>
              </div>
            </label>
          </div>
        )}

        {/* Amount Summary */}
        {(showTotalAmountInput || includeVat !== undefined) && isPaymentInstallment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showTotalAmountInput && (
              <FormField label="มูลค่ารวมสุทธิ (บาท)" htmlFor="instTotalAmount">
                <Input
                  id="instTotalAmount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => onTotalAmountChange?.(Number(e.target.value))}
                  className="text-right font-bold text-lg text-primary"
                  disabled={isReadOnly}
                />
              </FormField>
            )}
            {includeVat !== undefined && onIncludeVatChange && (
              <div className="flex items-end">
                <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-base text-slate-700">
                    <input type="checkbox" checked={includeVat} onChange={(e) => onIncludeVatChange(e.target.checked)} className="rounded border-slate-300 text-green-600 focus:ring-green-500 h-4 w-4" disabled={isReadOnly} />
                    รวม VAT 7%
                  </label>
                  {includeVat && <span className="text-base font-medium text-slate-800">VAT: {vatAmount.toLocaleString()} บาท</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contract Duration Summary */}
        {contractInfo && isPaymentInstallment && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-base">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">ระยะเวลาสัญญา:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">{contractInfo.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-700">ช่วงเวลา:</span>
              <span>
                {contractInfo.startDate ? new Date(contractInfo.startDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}
                <span className="mx-2 text-slate-400">ถึง</span>
                {contractInfo.endDate ? new Date(contractInfo.endDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}
              </span>
            </div>
          </div>
        )}

        {/* Installment Table */}
        {isPaymentInstallment && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h4 className="text-base font-semibold text-slate-800">รายละเอียดงวดงาน</h4>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${percentOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  รวม {totalPercentage.toFixed(0)}%
                </div>
                {!isReadOnly && (
                  <button type="button" onClick={handleDistribute} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all" title="เฉลี่ยยอดเท่ากันทุกงวด">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                    </svg>
                    เฉลี่ยยอด
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-bold text-slate-600 uppercase w-16">งวดที่</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-slate-600 uppercase">รายละเอียด</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-slate-600 uppercase w-28">สัดส่วน (%)</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-slate-600 uppercase w-36">จำนวนเงิน</th>
                    {showDueDate && <th className="px-4 py-3 text-center text-sm font-bold text-slate-600 uppercase w-36">วันครบกำหนด</th>}
                    {showStatus && <th className="px-4 py-3 text-center text-sm font-bold text-slate-600 uppercase w-32">สถานะ</th>}
                    {!isReadOnly && <th className="px-2 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {installments.map((inst, idx) => (
                    <tr key={inst.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-base font-semibold text-slate-700 bg-slate-50/50">{inst.no}</td>
                      <td className="px-4 py-3">
                        <Input value={inst.description || ''} onChange={(e) => handleChange(idx, 'description', e.target.value)} placeholder="รายละเอียด..." className="h-10 text-base" disabled={isReadOnly} />
                      </td>
                      <td className="px-4 py-3">
                        <Input type="number" value={inst.percentage !== undefined && inst.percentage !== null ? inst.percentage : ''} onChange={(e) => handleChange(idx, 'percentage', e.target.value)} className="h-10 text-right text-base font-mono" disabled={isReadOnly} min={0} max={100} step="1" />
                      </td>
                      <td className="px-4 py-3">
                        <Input type="number" value={inst.amount || ''} onChange={(e) => handleChange(idx, 'amount', e.target.value)} className="h-10 text-right text-base font-mono" disabled={isReadOnly} />
                      </td>
                      {showDueDate && (
                        <td className="px-4 py-3">
                          <Input type="date" value={inst.due_date ? new Date(inst.due_date).toISOString().substring(0, 10) : ''} onChange={(e) => handleChange(idx, 'due_date', e.target.value)} className="h-10 text-base text-center" disabled={isReadOnly} />
                        </td>
                      )}
                      {showStatus && (
                        <td className="px-4 py-3">
                          <Select value={inst.status || 'PENDING'} onChange={(e) => handleChange(idx, 'status', e.target.value)} className="h-10 text-base" disabled={isReadOnly}>
                            <option value="PENDING">รอชำระ</option>
                            <option value="PAID">ชำระแล้ว</option>
                            <option value="OVERDUE">เกินกำหนด</option>
                          </Select>
                        </td>
                      )}
                      {!isReadOnly && (
                        <td className="px-2 py-3 text-center">
                          <button type="button" onClick={() => handleRemove(idx)} className="text-slate-400 hover:text-red-500 transition-colors" disabled={installments.length <= 1}>
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total badge - right aligned like WorkAreaForm */}
            <div className="flex justify-end mt-2">
              <div className={`px-4 py-2 rounded-lg border text-sm font-semibold ${amountOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                ยอดรวมงวดชำระ: ฿{totalInstallmentAmount.toLocaleString()}
              </div>
            </div>

            {/* Add button */}
            {!isReadOnly && (
              <button type="button" onClick={handleAdd} className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium">
                <PlusIcon className="w-5 h-5" />
                เพิ่มงวดชำระ
              </button>
            )}

            {/* Warning */}
            {!amountOk && (
              <p className="text-sm text-red-500 text-right">* ยอดรวมงวดงาน ({totalInstallmentAmount.toLocaleString()}) ไม่ตรงกับยอดรวมสุทธิ ({totalAmount.toLocaleString()} บาท)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallmentSection;
