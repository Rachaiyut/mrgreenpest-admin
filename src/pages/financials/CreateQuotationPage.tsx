import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FormField,
  Input,
  Select,
  Button,
} from '../../components/common/FormControls';
import {
  Customer,
  Quotation,
  Assessment,
  Status,
  InstallmentPlan,
  Product,
} from '@/src/types/entity/app.interface';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { LeftArrowIcon, PlusIcon, TrashIcon } from '../../assets/icons/Icons';

interface CreateQuotationPageProps {
  onCreateQuotation: (
    quotationData: Omit<Quotation, 'id'>,
    assessmentId?: string
  ) => void;
  customers: Customer[];
  assessments: Assessment[];
  products: Product[];
}

export const CreateQuotationPage: React.FC<CreateQuotationPageProps> = ({
  onCreateQuotation,
  customers,
  assessments,
  products,
}) => {
  const navigate = useNavigate();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [total, setTotal] = useState<number | string>('');
  const [createdAt, setCreatedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [googleMapLink, setGoogleMapLink] = useState('');

  // Payment Terms State
  const [paymentMode, setPaymentMode] = useState<'full' | 'installments'>(
    'full'
  );
  const [installments, setInstallments] = useState<
    Omit<InstallmentPlan, 'id' | 'status'>[]
  >([
    {
      term: 1,
      percentage: 50,
      amount: 0,
      description: 'มัดจำงวดแรก',
      due_date: '',
    },
    {
      term: 2,
      percentage: 50,
      amount: 0,
      description: 'ชำระส่วนที่เหลือเมื่อเสร็จงาน',
      due_date: '',
    },
  ]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const customerName = useMemo(() => {
    const c = customers.find((c) => c.id === selectedCustomerId);
    return c ? `${c.first_name} ${c.last_name}` : '';
  }, [selectedCustomerId, customers]);

  const availableAssessmentsForCustomer = useMemo(() => {
    if (!selectedCustomerId) return [];
    return assessments.filter(
      (a) =>
        a.customer_id === selectedCustomerId &&
        a.status === AsessmentStatus.Completed
    );
  }, [assessments, selectedCustomerId]);

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.id === selectedAssessmentId),
    [assessments, selectedAssessmentId]
  );

  useEffect(() => {
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 30);

    setCreatedAt(today.toISOString().substring(0, 10));
    setExpiresAt(expiry.toISOString().substring(0, 10));
  }, []);

  useEffect(() => {
    if (selectedAssessment) {
      setTotal(selectedAssessment.total_estimated_cost);
      setGoogleMapLink(selectedAssessment.google_map_link || '');
    } else {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      setTotal('');
      setGoogleMapLink(customer?.google_map_link || '');
    }
  }, [selectedAssessment, selectedCustomerId, customers]);

  // Recalculate installment amounts when Total changes
  useEffect(() => {
    if (total && paymentMode === 'installments') {
      const numericTotal = Number(total);
      setInstallments((prev) =>
        prev.map((inst) => ({
          ...inst,
          amount: (numericTotal * inst.percentage) / 100,
        }))
      );
    }
  }, [total, paymentMode]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedAssessmentId('');
  };

  const handleInstallmentChange = (
    index: number,
    field: keyof Omit<InstallmentPlan, 'id' | 'status'>,
    value: any
  ) => {
    const newInstallments = [...installments];
    const numericTotal = Number(total) || 0;

    if (field === 'percentage') {
      const pct = Number(value);
      newInstallments[index].percentage = pct;
      newInstallments[index].amount = (numericTotal * pct) / 100;
    } else if (field === 'amount') {
      const amt = Number(value);
      newInstallments[index].amount = amt;
      // Avoid division by zero
      newInstallments[index].percentage =
        numericTotal > 0 ? (amt / numericTotal) * 100 : 0;
    } else {
      (newInstallments[index] as any)[field] = value;
    }
    setInstallments(newInstallments);
  };

  const addInstallment = () => {
    setInstallments([
      ...installments,
      {
        term: installments.length + 1,
        percentage: 0,
        amount: 0,
        description: '',
        due_date: '',
      },
    ]);
  };

  const removeInstallment = (index: number) => {
    if (installments.length <= 1) return;
    setInstallments(
      installments
        .filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, term: i + 1 }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !customerName || total === '') {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // Validate Installments
    if (paymentMode === 'installments') {
      const totalPct = installments.reduce((sum, i) => sum + i.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        // Floating point tolerance
        alert(
          `ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100% (ปัจจุบัน: ${totalPct.toFixed(2)}%)`
        );
        return;
      }
    }

    const newQuotation: Omit<Quotation, 'id'> = {
      customer_id: selectedCustomerId,
      customer_name: customerName,
      created_at: createdAt,
      expires_at: expiresAt,
      status: Status.Draft,
      total: Number(total),
      google_map_link: googleMapLink,
      revision: 1,
      payment_terms:
        paymentMode === 'full' ? 'ชำระเต็มจำนวน' : 'แบ่งชำระเป็นงวด',
      installments:
        paymentMode === 'installments'
          ? installments.map((inst, i) => ({
              id: `inst-${Date.now()}-${i}`,
              ...inst,
              status: Status.Pending,
            }))
          : undefined,
    };

    onCreateQuotation(newQuotation, selectedAssessmentId || undefined);
    navigate('/quotations');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/quotations')}>
          <LeftArrowIcon className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">
          สร้างใบเสนอราคาใหม่
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm w-full max-w-4xl mx-auto p-6 border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Job Info */}
            <div className="space-y-6">
              <FormField label="เลือกลูกค้า" htmlFor="customer-select">
                <Select
                  id="customer-select"
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                >
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </Select>
              </FormField>

              {selectedCustomerId && (
                <FormField
                  label="อ้างอิงใบประเมิน (ไม่บังคับ)"
                  htmlFor="assessment-select"
                >
                  <Select
                    id="assessment-select"
                    value={selectedAssessmentId}
                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  >
                    <option value="">-- ไม่อ้างอิงใบประเมิน --</option>
                    {availableAssessmentsForCustomer.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} - ยอดรวม: ฿
                        {a.total_estimated_cost.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="Link Google Map" htmlFor="google-map-link">
                <Input
                  id="google-map-link"
                  type="url"
                  value={googleMapLink}
                  onChange={(e) => setGoogleMapLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="วันที่สร้าง" htmlFor="created-at">
                  <Input
                    id="created-at"
                    type="date"
                    value={createdAt}
                    onChange={(e) => setCreatedAt(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="หมดอายุวันที่" htmlFor="expires-at">
                  <Input
                    id="expires-at"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    required
                  />
                </FormField>
              </div>
            </div>

            {/* Right Column: Payment & Total */}
            <div className="space-y-6">
              <FormField label="ยอดรวมทั้งหมด (บาท)" htmlFor="total">
                <Input
                  id="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  required
                  placeholder="0.00"
                  step="0.01"
                  className="text-right font-bold text-lg text-primary"
                />
              </FormField>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  เงื่อนไขการชำระเงิน
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={paymentMode === 'full'}
                      onChange={() => setPaymentMode('full')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700">
                      ชำระเต็มจำนวน
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={paymentMode === 'installments'}
                      onChange={() => setPaymentMode('installments')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700">
                      แบ่งชำระ (งวด)
                    </span>
                  </label>
                </div>

                {paymentMode === 'installments' && (
                  <div className="space-y-3">
                    {installments.map((inst, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200 shadow-sm relative group"
                      >
                        <div className="w-8 pt-2 text-center text-xs font-bold text-slate-500">
                          {inst.term}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="รายละเอียดงวด (e.g. มัดจำ)"
                            className="w-full text-xs px-2 py-1 border rounded focus:border-primary outline-none"
                            value={inst.description}
                            onChange={(e) =>
                              handleInstallmentChange(
                                idx,
                                'description',
                                e.target.value
                              )
                            }
                          />
                          <div className="flex gap-2">
                            <div className="relative w-20">
                              <input
                                type="number"
                                className="w-full text-xs px-2 py-1 border rounded focus:border-primary outline-none text-right pr-6"
                                value={inst.percentage}
                                onChange={(e) =>
                                  handleInstallmentChange(
                                    idx,
                                    'percentage',
                                    e.target.value
                                  )
                                }
                              />
                              <span className="absolute right-2 top-1 text-xs text-slate-400">
                                %
                              </span>
                            </div>
                            <div className="relative flex-1">
                              <input
                                type="number"
                                className="w-full text-xs px-2 py-1 border rounded focus:border-primary outline-none text-right pr-8 font-medium"
                                value={inst.amount}
                                onChange={(e) =>
                                  handleInstallmentChange(
                                    idx,
                                    'amount',
                                    e.target.value
                                  )
                                }
                              />
                              <span className="absolute right-2 top-1 text-xs text-slate-400">
                                THB
                              </span>
                            </div>
                          </div>
                        </div>
                        {installments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInstallment(idx)}
                            className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={addInstallment}
                      className="w-full text-xs py-2 border border-dashed border-slate-300 text-slate-500 hover:text-primary hover:border-primary"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" /> เพิ่มงวดการชำระ
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assessment Details (Read-only) */}
          {selectedAssessment && (
            <div className="mt-6 p-4 bg-slate-50 border rounded-lg space-y-4 text-sm max-h-60 overflow-y-auto">
              <h4 className="text-base font-semibold text-slate-800">
                รายละเอียดใบประเมิน: {selectedAssessment.id}
              </h4>
              <div className="space-y-3">
                {selectedAssessment.work_areas.map((area, index) => (
                  <div key={area.id} className="p-3 border bg-white rounded-md">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-primary">
                        พื้นที่ #{index + 1}: {area.name}
                      </p>
                      <p className="font-bold text-slate-700">
                        ฿
                        {area.estimated_cost.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      บริการ: {area.service_type.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              onClick={() => navigate('/quotations')}
              className="py-2 px-6"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button type="submit" className="py-2 px-6" variant="primary">
              สร้างใบเสนอราคา
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuotationPage;

