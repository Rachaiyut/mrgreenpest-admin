import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Modal } from '../../common/Modal';
import { Button, FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { Customer } from '@/src/types/entity/customer.interface';
import { Contract } from '@/src/types/entity/financial.interface';
import {
  ContactMethod,
  ContactMethodLabels,
  FollowUpResult,
  FollowUpResultLabels,
  ContractFollowUp,
} from '@/src/types/entity/contract-follow-up.interface';
import { ContractFollowUpApi } from '@/src/api/contract-follow-up';
import { ContractApi } from '@/src/api/contract';
import { formatThaiDate } from '../../../utils/date';
import { LoadingIcon } from '../../../assets/icons/Icons';

interface CustomerFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

const resultColors: Record<FollowUpResult, string> = {
  INTERESTED: 'bg-green-100 text-green-700',
  NOT_INTERESTED: 'bg-red-100 text-red-700',
  NO_RESPONSE: 'bg-slate-100 text-slate-600',
  CALL_BACK: 'bg-amber-100 text-amber-700',
  RENEWED: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-purple-100 text-purple-700',
};

const resultDotColors: Record<FollowUpResult, string> = {
  INTERESTED: 'bg-green-500',
  NOT_INTERESTED: 'bg-red-500',
  NO_RESPONSE: 'bg-slate-400',
  CALL_BACK: 'bg-amber-500',
  RENEWED: 'bg-blue-500',
  OTHER: 'bg-purple-500',
};

export const CustomerFollowUpModal: React.FC<CustomerFollowUpModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [followUps, setFollowUps] = useState<ContractFollowUp[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().substring(0, 10);
  const [formData, setFormData] = useState({
    contract_id: '',
    follow_up_date: today,
    contact_method: '' as string,
    result: '' as string,
    notes: '',
    next_follow_up_date: '',
  });

  const fetchData = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const [followUpRes, contractRes] = await Promise.all([
        ContractFollowUpApi.getByCustomerId(customer.id),
        ContractApi.getAll({ limit: 100, customer_id: customer.id } as Record<string, unknown>),
      ]);
      setFollowUps(followUpRes?.data || []);
      setContracts(contractRes?.data || []);
    } catch (error) {
      console.error('Error fetching follow-up data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      fetchData();
      setFormData({
        contract_id: '',
        follow_up_date: today,
        contact_method: '',
        result: '',
        notes: '',
        next_follow_up_date: '',
      });
    }
  }, [isOpen, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (!formData.contract_id || !formData.contact_method || !formData.result) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบ', text: 'สัญญา, ช่องทางติดต่อ และผลการติดตาม จำเป็นต้องกรอก' });
      return;
    }

    if (formData.result === FollowUpResult.CALL_BACK && !formData.next_follow_up_date) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุวันนัดถัดไป', text: 'กรณีผลเป็น "ขอให้โทรกลับ" ต้องระบุวันนัดติดตามครั้งถัดไป' });
      return;
    }

    setSaving(true);
    try {
      await ContractFollowUpApi.create({
        contract_id: formData.contract_id,
        customer_id: customer.id,
        follow_up_date: formData.follow_up_date,
        contact_method: formData.contact_method as ContactMethod,
        result: formData.result as FollowUpResult,
        notes: formData.notes || undefined,
        next_follow_up_date: formData.next_follow_up_date || undefined,
      });
      Swal.fire({ icon: 'success', title: 'บันทึกการติดตามสำเร็จ', timer: 1500, showConfirmButton: false });
      setFormData({
        contract_id: '',
        follow_up_date: today,
        contact_method: '',
        result: '',
        notes: '',
        next_follow_up_date: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating follow-up:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกการติดตามได้' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !customer) return null;

  const fullName = `${customer.first_name} ${customer.last_name || ''}`.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`การติดตาม (${fullName})`}
      size="4xl"
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" onClick={onClose} variant="outline" className="py-2 px-4">
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Form บันทึกการติดตาม */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-900 mb-4">บันทึกการติดตามใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="สัญญา" htmlFor="fu-contract">
                <DropdownSelect
                  value={formData.contract_id}
                  onChange={(v) => setFormData({ ...formData, contract_id: v })}
                  placeholder="เลือกสัญญา"
                  options={contracts.map((c) => ({ value: c.id, label: `${c.code || c.id.substring(0, 8)} — ${c.status}` }))}
                />
              </FormField>
              <FormField label="วันที่ติดตาม" htmlFor="fu-date">
                <Input
                  id="fu-date"
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="ช่องทางติดต่อ" htmlFor="fu-method">
                <DropdownSelect
                  value={formData.contact_method}
                  onChange={(v) => setFormData({ ...formData, contact_method: v })}
                  placeholder="เลือกช่องทาง"
                  options={Object.values(ContactMethod).map((m) => ({ value: m, label: ContactMethodLabels[m] }))}
                />
              </FormField>
              <FormField label="ผลการติดตาม" htmlFor="fu-result">
                <DropdownSelect
                  value={formData.result}
                  onChange={(v) => setFormData({ ...formData, result: v })}
                  placeholder="เลือกผล"
                  options={Object.values(FollowUpResult).map((r) => ({ value: r, label: FollowUpResultLabels[r] }))}
                />
              </FormField>
            </div>
            <FormField label="หมายเหตุ / เหตุผล" htmlFor="fu-notes">
              <Textarea
                id="fu-notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="รายละเอียดการติดตาม..."
              />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField label="วันนัดติดตามครั้งถัดไป" htmlFor="fu-next-date">
                <Input
                  id="fu-next-date"
                  type="date"
                  value={formData.next_follow_up_date}
                  onChange={(e) => setFormData({ ...formData, next_follow_up_date: e.target.value })}
                />
              </FormField>
              <div>
                <Button type="submit" variant="primary" className="w-full md:w-auto" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการติดตาม'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Timeline ประวัติการติดตาม */}
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-4">
            ประวัติการติดตาม ({followUps.length} รายการ)
          </h3>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <LoadingIcon className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">กำลังโหลดประวัติ...</p>
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-sm">ยังไม่มีประวัติการติดตาม</p>
            </div>
          ) : (
            <div className="relative space-y-0 max-h-[40vh] overflow-y-auto pr-2">
              {followUps.map((fu, index) => {
                const result = fu.result as FollowUpResult;
                const isLast = index === followUps.length - 1;
                return (
                  <div key={fu.id} className="relative flex gap-4 pb-6">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${resultDotColors[result] || 'bg-slate-400'} flex-shrink-0 mt-1.5`} />
                      {!isLast && <div className="w-0.5 bg-slate-200 flex-1 mt-1" />}
                    </div>
                    {/* Content */}
                    <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {formatThaiDate(fu.follow_up_date)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {ContactMethodLabels[fu.contact_method as ContactMethod] || fu.contact_method}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${resultColors[result] || 'bg-slate-100 text-slate-600'}`}>
                          {FollowUpResultLabels[result] || fu.result}
                        </span>
                        {fu.contract?.code && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-mono">
                            {fu.contract.code}
                          </span>
                        )}
                      </div>
                      {fu.notes && (
                        <p className="text-sm text-slate-600 mb-2">{fu.notes}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        {fu.creator && (
                          <span>
                            โดย: {fu.creator.first_name} {fu.creator.last_name || ''}
                          </span>
                        )}
                        {fu.next_follow_up_date && (
                          <span className="text-amber-600 font-medium">
                            นัดถัดไป: {formatThaiDate(fu.next_follow_up_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
