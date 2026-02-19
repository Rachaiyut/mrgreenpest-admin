
import { useState, useEffect, useMemo, FC, ChangeEvent } from 'react';
import { Modal } from '../../common/Modal';
import { AssessmentApi } from '@/src/api';
import {
  Assessment,
  Product,
  AssessmentWorkArea,
  Customer,
  Category,
  AssessmentInstallment,
} from '@/src/types/entity/app.interface';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { PaymentMethod } from '@/src/types/enums/financial';
import { PlusIcon, UserIcon, DocumentIcon, CreditCardIcon } from '../../../assets/icons/Icons';
import { WorkAreaForm } from './WorkAreaForm';

interface EditAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onUpdateAssessment: (assessmentData: Assessment) => void;
  products: Product[];
  packages: import('@/src/types/entity/package.interface').Package[];
  customers?: Customer[];
  categories: Category[];
}

export const EditAssessmentModal: FC<EditAssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onUpdateAssessment,
  products,
  packages = [],
  customers = [],
  categories = [],
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'areas' | 'payment'>('info');
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [originalWorkAreas, setOriginalWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [paymentCondition, setPaymentCondition] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  useEffect(() => {
    const loadData = async () => {
      if (assessment && isOpen) {
        let loadedAssessment = assessment;
        try {
           const res = await AssessmentApi.getById(assessment.id);
           loadedAssessment = (res as any).data || res;
        } catch (error) {
           console.error("Failed to fetch assessment details", error);
        }

        const { assessment_areas, ...rest } = loadedAssessment;
        setFormData({
          ...rest,
          created_at: loadedAssessment.created_at
            ? new Date(loadedAssessment.created_at).toISOString().substring(0, 10)
            : '',
          appointment_date: loadedAssessment.appointment_date
            ? new Date(loadedAssessment.appointment_date)
            : undefined,
        });
        setSelectedPackageId(loadedAssessment.package_id || null);
        
        let loadedPaymentCondition = loadedAssessment.payment_condition || PaymentMethod.TRANSFER;
        
        if (loadedAssessment.installments && loadedAssessment.installments.length > 0 && loadedPaymentCondition !== PaymentMethod.INSTALLMENT) {
           loadedPaymentCondition = PaymentMethod.INSTALLMENT;
        }

        setPaymentCondition(loadedPaymentCondition);

        if (loadedAssessment.installments && loadedAssessment.installments.length > 0) {
          setInstallments(loadedAssessment.installments.map(inst => ({
             ...inst
          })));
        } else {
          setInstallments([]);
        }

        const rawAreas = assessment_areas || loadedAssessment.assessment_areas || [];

        const enrichArea = (wa: any) => {
          const enrichedItems = (wa.items || []).map((item: any) => {
            if (item.product_id && (!item.product_name || !item.product_price)) {
              const product = products.find((p) => p.id === item.product_id);
              if (product) {
                return {
                  ...item,
                  product_name: product.name,
                  product_price: product.cost_price ? Number(product.cost_price) : 0,
                };
              }
            }
            return item;
          });

          const itemsTotal = enrichedItems.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
          const derivedBasePrice = wa.package_price !== undefined
            ? wa.package_price
            : (Number(wa.total_price) || 0) - itemsTotal;

          return {
            ...wa,
            items: enrichedItems,
            category_services: wa.category_services || [],
            package_price: derivedBasePrice > 0 ? derivedBasePrice : 0,
          };
        };

        const enrichedAreas = rawAreas.map(enrichArea);

        setWorkAreas(enrichedAreas);
        setOriginalWorkAreas(enrichedAreas.map(a => ({ ...a })));
      } else if (!isOpen) {
        setFormData({});
        setWorkAreas([]);
        setOriginalWorkAreas([]);
        setInstallments([]);
        setPaymentCondition(PaymentMethod.TRANSFER);
        setActiveTab('info');
      }
    };
    loadData();
  }, [assessment?.id, isOpen, products]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (Number(area.total_price) || 0), 0),
    [workAreas]
  );

  const handleInstallmentChange = (index: number, field: keyof AssessmentInstallment, value: any) => {
    setInstallments(prev => prev.map((inst, i) => {
      if (i === index) {
        return { ...inst, [field]: value };
      }
      return inst;
    }));
  };

  useEffect(() => {
    if (paymentCondition === PaymentMethod.INSTALLMENT) {
      if (installments.length === 0 && totalEstimatedCost > 0) {
        setInstallments([
          { 
              id: crypto.randomUUID(), 
              installment_no: 1, 
              amount: totalEstimatedCost / 2, 
              note: 'งวดที่ 1',
          },
          { 
              id: crypto.randomUUID(), 
              installment_no: 2, 
              amount: totalEstimatedCost / 2, 
              note: 'งวดที่ 2',
          }
        ]);
      } else if (installments.length > 0 && totalEstimatedCost > 0) {
        const currentTotal = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        
        if (Math.abs(currentTotal - totalEstimatedCost) > 0.05) {
           const count = installments.length;
           const baseAmount = Math.floor((totalEstimatedCost / count) * 100) / 100;
           const remainder = totalEstimatedCost - (baseAmount * count);

           setInstallments(prev => prev.map((inst, index) => {
             let amount = baseAmount;
             if (index === count - 1) {
               amount = Number((baseAmount + remainder).toFixed(2));
             }
             return { ...inst, amount };
           }));
        }
      }
    } else {
      setInstallments([]);
    }
  }, [paymentCondition, totalEstimatedCost]);

  const updateInstallmentCount = (count: number) => {
    const newCount = Math.max(1, Math.min(60, count));
    const baseAmount = Math.floor((totalEstimatedCost / newCount) * 100) / 100;
    const remainder = totalEstimatedCost - (baseAmount * newCount);

    const newInstallments = Array.from({ length: newCount }, (_, i) => {
      let amount = baseAmount;
      if (i === newCount - 1) {
        amount = Number((baseAmount + remainder).toFixed(2));
      }
      return {
        id: installments[i]?.id || crypto.randomUUID(),
        installment_no: i + 1,
        amount,
        note: installments[i]?.note || `งวดที่ ${i + 1}`,
      };
    });
    setInstallments(newInstallments);
  };

  const handleFieldChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddArea = () => {
    setWorkAreas((prev) => [
      ...prev,
      {
        id: `area-${Date.now()}`,
        area_name: `พื้นที่ ${prev.length + 1}`,
        items: [],
        category_services: [],
        package_price: 0,
        total_price: 0,
      },
    ]);
  };

  const handleRemoveArea = (index: number) => {
    if (workAreas.length > 1) {
      setWorkAreas((prev) => prev.filter((_, i) => i !== index));
    } else {
      alert('ต้องมีอย่างน้อย 1 พื้นที่ในใบประเมิน');
    }
  };

  const handleAreaChange = (
    index: number,
    updatedArea: Partial<AssessmentWorkArea>
  ) => {
    setWorkAreas((prev) =>
      prev.map((area, i) => (i === index ? updatedArea : area))
    );
  };

  const handleClearArea = (index: number) => {
    setWorkAreas((prev) => {
      const newAreas = [...prev];
      const areaToClear = newAreas[index];
      if (areaToClear) {
        newAreas[index] = {
          id: areaToClear.id,
          area_name: areaToClear.area_name,
          building_type: '',
          area_size: undefined,
          category_services: [],
          service_system: undefined,
          package_price: 0,
          total_price: 0,
        };
      }
      return newAreas;
    });
  };

  const handlePackageSelect = (pkgId: string | null) => {
    setSelectedPackageId(pkgId);
    setFormData((prev) => ({ ...prev, package_id: pkgId || '' }));

    const selectedPkg = pkgId
      ? packages.find((p) => p.id === pkgId)
      : null;

    setWorkAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (!selectedPkg || !area.area_size || area.area_size <= 0) {
          return { ...area };
        }
        const sortedConditions = [
          ...((selectedPkg as any).package_price || []),
        ].sort((a: any, b: any) => a.area_range - b.area_range);
        const bestFit = sortedConditions.find(
          (c: any) => c.area_range >= area.area_size!
        );
        if (bestFit) {
          const termiteCategory = categories.find((c) =>
            c.name.includes('กำจัดปลวก')
          );
          const hasTermites = (area.category_services || []).some(
            (s) => s.category_id === termiteCategory?.id
          );
          const priceToUse = hasTermites
            ? bestFit.price_with_termite
            : bestFit.price_without_termite;
          return {
            ...area,
            package_price: priceToUse,
            package_price_id: bestFit.id,
            total_price: priceToUse + (area.items || []).reduce(
              (sum, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
              0
            ),
          };
        } else {
          return { ...area };
        }
      })
    );
  };

  const handleSave = async (statusOverride?: AsessmentStatus) => {
    if (!assessment) return;

    const sanitizedWorkAreas = workAreas.map((area) => {
      const newArea: any = { ...area };
      if (newArea.id && newArea.id.startsWith('area-')) {
        newArea.id = crypto.randomUUID();
      }
      if (newArea.area_size === undefined || newArea.area_size === '') {
        newArea.area_size = 0;
      } else {
        newArea.area_size = Number(newArea.area_size);
      }
      const itemsCost = (newArea.items || []).reduce(
        (sum: number, item: any) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
        0
      );
      const baseCost = Number(newArea.package_price) || 0;
      newArea.total_price = baseCost + itemsCost;

      if (newArea.package_price !== undefined && newArea.package_price !== null) {
        newArea.package_price = Number(newArea.package_price);
      }

      newArea.items = (newArea.items || []).map((item: any) => {
        const sanitizedItem: any = {
          product_id: item.product_id,
          product_name: item.product_name || '',
          product_price: Number(item.product_price) || 0,
          quantity: Number(item.quantity) || 1,
          total_price: (Number(item.product_price) || 0) * (Number(item.quantity) || 1),
        };
        if (item.id && !item.id.startsWith('item-') && item.id.includes('-')) {
          sanitizedItem.id = item.id;
        }
        return sanitizedItem;
      });

      newArea.category_services = (newArea.category_services || []).map((cat: any) => ({
        category_id: cat.category_id,
        ...(cat.id && !cat.id.startsWith('cat-') ? { id: cat.id } : {}),
      }));

      return newArea;
    });

    const updatedAssessment: Assessment = {
      ...assessment,
      ...formData,
      updated_by: 'ผู้ดูแลระบบ',
      assessment_areas: sanitizedWorkAreas as AssessmentWorkArea[],
      installments: paymentCondition === PaymentMethod.INSTALLMENT ? installments as AssessmentInstallment[] : [],
      payment_condition: paymentCondition,
      total_price: totalEstimatedCost,
      appointment_date: formData.appointment_date || new Date(),
      status: statusOverride || (formData.status as AsessmentStatus) || assessment.status,
    };

    onUpdateAssessment(updatedAssessment);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSave();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขใบประเมิน: ${assessment?.code || assessment?.id || ''}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
            <div className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary font-bold">
              ฿
              {totalEstimatedCost.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="edit-assessment-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <UserIcon className={`
              -ml-0.5 mr-2 h-5 w-5
              ${activeTab === 'info' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}
            `} />
            ข้อมูลทั่วไป
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'areas'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <DocumentIcon className={`
              -ml-0.5 mr-2 h-5 w-5
              ${activeTab === 'areas' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}
            `} />
            พื้นที่และบริการ
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'payment'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <CreditCardIcon className={`
              -ml-0.5 mr-2 h-5 w-5
              ${activeTab === 'payment' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}
            `} />
            การชำระเงิน
          </button>
        </nav>
      </div>

      <form id="edit-assessment-form" onSubmit={handleSubmit}>
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">ข้อมูลลูกค้า</h3>
              <div className="space-y-4">
                <p><span className="font-semibold">ชื่อ:</span> {assessment?.customer?.first_name} {assessment?.customer?.last_name}</p>
                <p><span className="font-semibold">โทรศัพท์:</span> {assessment?.customer?.phone}</p>
                <p><span className="font-semibold">ที่อยู่:</span> {assessment?.customer?.address_house_no}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">รายละเอียดใบประเมิน</h3>
              <div className="space-y-4">
                <p><span className="font-semibold">รหัส:</span> {assessment?.code}</p>
                <p><span className="font-semibold">วันที่สร้าง:</span> {formData.created_at}</p>
                <div>
                  <label htmlFor="appointment_date" className="block text-sm font-medium text-slate-700">วันที่นัดหมาย</label>
                  <input
                    type="date"
                    id="appointment_date"
                    name="appointment_date"
                    value={formData.appointment_date ? new Date(formData.appointment_date).toISOString().substring(0, 10) : ''}
                    onChange={handleDateChange}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'areas' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">พื้นที่และบริการ</h3>
              <button
                type="button"
                onClick={handleAddArea}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                เพิ่มพื้นที่
              </button>
            </div>

            <div className="space-y-6">
              {workAreas.map((area, index) => (
                <div key={area.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-700">{area.area_name || `พื้นที่ ${index + 1}`}</h4>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleClearArea(index)} className="text-sm text-slate-500 hover:text-slate-700">ล้างข้อมูล</button>
                      <button type="button" onClick={() => handleRemoveArea(index)} className="text-sm text-red-500 hover:text-red-700">ลบพื้นที่</button>
                    </div>
                  </div>
                  <WorkAreaForm
                    area={area}
                    index={index}
                    onAreaChange={handleAreaChange}
                    onClearArea={handleClearArea}
                    selectedPackage={packages.find(p => p.id === selectedPackageId) || null}
                    availablePackages={packages}
                    products={products}
                    categories={categories}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">เงื่อนไขการชำระเงิน</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">วิธีการชำระเงิน</label>
                <select
                  value={paymentCondition}
                  onChange={(e) => setPaymentCondition(e.target.value as PaymentMethod)}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value={PaymentMethod.TRANSFER}>โอนเงิน</option>
                  <option value={PaymentMethod.CASH}>เงินสด</option>
                  <option value={PaymentMethod.CREDIT_CARD}>บัตรเครดิต</option>
                  <option value={PaymentMethod.INSTALLMENT}>แบ่งชำระ</option>
                </select>
              </div>

              {paymentCondition === PaymentMethod.INSTALLMENT && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">จำนวนงวด</label>
                  <input
                    type="number"
                    value={installments.length}
                    onChange={(e) => updateInstallmentCount(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    min="1"
                    max="60"
                  />
                  <div className="mt-4 space-y-2">
                    {installments.map((inst, index) => (
                      <div key={inst.id} className="grid grid-cols-3 gap-4 items-center">
                        <input
                          type="number"
                          placeholder="จำนวนเงิน"
                          value={inst.amount || ''}
                          onChange={(e) => handleInstallmentChange(index, 'amount', Number(e.target.value))}
                          className="col-span-1 mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                        <input
                          type="text"
                          placeholder="หมายเหตุ"
                          value={inst.note || ''}
                          onChange={(e) => handleInstallmentChange(index, 'note', e.target.value)}
                          className="col-span-2 mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
