import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input } from '../../common/FormControls';
import { Warehouse } from '@/src/libs/common/interface/entity/app.interface';

interface EditWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onUpdateWarehouse: (warehouse: Warehouse) => void;
}

export const EditWarehouseModal: React.FC<EditWarehouseModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  onUpdateWarehouse,
}) => {
  const [formData, setFormData] = useState<Partial<Warehouse>>({});

  useEffect(() => {
    if (warehouse) {
      setFormData(warehouse);
    }
  }, [warehouse]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (warehouse) {
      onUpdateWarehouse({ ...warehouse, ...formData } as Warehouse);
    }
    onClose();
  };

  if (!warehouse) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขข้อมูล: ${warehouse.name}`}
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
            form="edit-warehouse-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      }
    >
      <form
        id="edit-warehouse-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <FormField label="ประเภท">
          <div className="flex rounded-lg bg-slate-200 p-1 w-full cursor-not-allowed">
            <label className="relative flex-1">
              <input
                type="radio"
                name="warehouseType"
                value="คลัง"
                className="sr-only peer"
                checked={formData.type === 'คลัง'}
                disabled
              />
              <span
                className={`block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${formData.type === 'คลัง' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}
              >
                คลัง
              </span>
            </label>
            <label className="relative flex-1">
              <input
                type="radio"
                name="warehouseType"
                value="รถ"
                className="sr-only peer"
                checked={formData.type === 'รถ'}
                disabled
              />
              <span
                className={`block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${formData.type === 'รถ' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}
              >
                รถ
              </span>
            </label>
          </div>
        </FormField>
        <FormField label="ชื่อคลัง" htmlFor="name">
          <Input
            name="name"
            id="name"
            type="text"
            value={formData.name || ''}
            onChange={handleChange}
            required
            placeholder={
              formData.type === 'คลัง' ? 'เช่น คลังหลัก' : 'เช่น รถบริการ A'
            }
          />
        </FormField>

        {formData.type === 'รถ' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ทะเบียนรถ" htmlFor="licensePlate">
                <Input
                  name="licensePlate"
                  id="licensePlate"
                  type="text"
                  value={formData.licensePlate || ''}
                  onChange={handleChange}
                  required
                  placeholder="เช่น 1กข 1234"
                />
              </FormField>
              <FormField label="ยี่ห้อ" htmlFor="brand">
                <Input
                  name="brand"
                  id="brand"
                  type="text"
                  value={formData.brand || ''}
                  onChange={handleChange}
                  required
                  placeholder="เช่น Toyota"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="รุ่น" htmlFor="model">
                <Input
                  name="model"
                  id="model"
                  type="text"
                  value={formData.model || ''}
                  onChange={handleChange}
                  required
                  placeholder="เช่น Hilux Revo"
                />
              </FormField>
              <FormField label="สี" htmlFor="color">
                <Input
                  name="color"
                  id="color"
                  type="text"
                  value={formData.color || ''}
                  onChange={handleChange}
                  required
                  placeholder="เช่น ขาว"
                />
              </FormField>
            </div>
            <FormField label="ที่ตั้ง" htmlFor="location">
              <Input
                name="location"
                id="location"
                type="text"
                value={formData.location || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
          </>
        ) : (
          <FormField label="ที่ตั้ง" htmlFor="location">
            <Input
              name="location"
              id="location"
              type="text"
              value={formData.location || ''}
              onChange={handleChange}
              required
              placeholder="เช่น สำนักงานใหญ่"
            />
          </FormField>
        )}
      </form>
    </Modal>
  );
};
