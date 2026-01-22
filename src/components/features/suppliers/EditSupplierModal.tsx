import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input } from '../../common/FormControls';
import { Supplier } from '@/src/types/entity/app.interface';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';

// Interface
import { SupplierType } from '@/src/types';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onUpdateSupplier: (supplier: Supplier) => void;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onUpdateSupplier,
}) => {
  const [formData, setFormData] = useState<Partial<Omit<Supplier, 'phones'>>>(
    {}
  );
  const [phones, setPhones] = useState<string[]>(['']);

  useEffect(() => {
    if (supplier) {
      const { phone, ...rest } = supplier;
      setFormData(rest);
      setPhones(phones.length > 0 ? [...phones] : ['']);
    }
  }, [supplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: SupplierType) => {
    setFormData((prev) => ({ ...prev, type: type }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  const addPhoneInput = () => {
    if (phones.length < 3) {
      setPhones([...phones, '']);
    }
  };

  const removePhoneInput = (index: number) => {
    if (phones.length > 1) {
      const newPhones = phones.filter((_, i) => i !== index);
      setPhones(newPhones);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (supplier) {
      if (
        !formData.contact_name ||
        !phones[0].trim() ||
        (formData.type === SupplierType.CORPORATE && !formData.tax_id)
      ) {
        alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
      }
      const updatedSupplier = {
        ...supplier,
        ...formData,
        phones: phones.filter((p) => p.trim() !== ''),
      } as Supplier;

      onUpdateSupplier(updatedSupplier);
    }
    onClose();
  };

  if (!supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขผู้จัดจำหน่าย: ${supplier.contact_name}`}
      size="2xl"
      footer={
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
            form="edit-supplier-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      }
    >
      <form
        id="edit-supplier-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="รหัสผู้จัดจำหน่าย" htmlFor="supplier-id">
            <Input
              id="supplier-id"
              type="text"
              value={formData.code || ''}
              readOnly
              className="bg-slate-100"
            />
          </FormField>
          <FormField label="ประเภทผู้จัดจำหน่าย">
            <div className="flex rounded-lg bg-slate-100 p-1 w-full">
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="supplierType"
                  value="บุคคลธรรมดา"
                  className="sr-only peer"
                  checked={formData.type === SupplierType.INDIVIDUAL}
                  onChange={() => handleTypeChange(SupplierType.INDIVIDUAL)}
                />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                  บุคคลธรรมดา
                </span>
              </label>
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="supplierType"
                  value="นิติบุคคล"
                  className="sr-only peer"
                  checked={formData.type === SupplierType.CORPORATE}
                  onChange={() => handleTypeChange(SupplierType.CORPORATE)}
                />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                  นิติบุคคล
                </span>
              </label>
            </div>
          </FormField>
        </div>
        <FormField
          label={
            formData.type === SupplierType.CORPORATE
              ? 'ชื่อบริษัท'
              : 'ชื่อ-นามสกุล'
          }
          htmlFor="contact_name"
        >
          <Input
            name="contact_name"
            id="contact_name"
            type="text"
            value={formData.contact_name || ''}
            onChange={handleChange}
            required
          />
        </FormField>
        <FormField label="เลขประจำตัวผู้เสียภาษี" htmlFor="tax_id">
          <Input
            name="tax_id"
            id="tax_id"
            type="text"
            value={formData.tax_id || ''}
            onChange={handleChange}
            required={formData.type === SupplierType.CORPORATE}
          />
        </FormField>
        {formData.type === SupplierType.CORPORATE && (
          <FormField label="ชื่อผู้ติดต่อ" htmlFor="contactPerson">
            <Input
              name="contactPerson"
              id="contactPerson"
              type="text"
              value={formData.contact_name || ''}
              onChange={handleChange}
            />
          </FormField>
        )}

        <FormField label="โทรศัพท์">
          <div className="space-y-2">
            {phones.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  name={`phone-${index}`}
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  required={index === 0}
                  placeholder={`เบอร์โทรศัพท์ ${index + 1}${index === 0 ? '*' : ''}`}
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePhoneInput(index)}
                    className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            {phones.length < 3 && (
              <button
                type="button"
                onClick={addPhoneInput}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                เพิ่มเบอร์โทรศัพท์
              </button>
            )}
          </div>
        </FormField>

        <FormField label="อีเมล" htmlFor="email">
          <Input
            name="email"
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={handleChange}
          />
        </FormField>
      </form>
    </Modal>
  );
};

