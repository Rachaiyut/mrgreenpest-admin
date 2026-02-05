import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input } from '../../common/FormControls';
import { Warehouse } from '@/src/types/entity/app.interface';

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
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (warehouse) {
      const existingAddress =
        (warehouse as any).address ||
        warehouse.warehouse_branch?.location ||
        (warehouse.vehicle ? 'เคลื่อนที่' : '');

      setFormData({
        name: warehouse.name,
        type: warehouse.type,
        licensePlate: warehouse.vehicle?.vehicle_registration || '',
        brand: warehouse.vehicle?.brand || '',
        model: warehouse.vehicle?.model || '',
        color: warehouse.vehicle?.color || '',
        location: warehouse.warehouse_branch?.location || existingAddress || '',
      });
    }
  }, [warehouse]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Enforce backend validation limits at input-level.
    const limits: Record<string, number> = {
      licensePlate: 20,
      brand: 50,
      model: 100,
      color: 30,
    };
    const max = limits[name];
    const nextValue = typeof max === 'number' ? value.slice(0, max) : value;
    setFormData((prev: any) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (warehouse) {
      const isVehicle =
        formData.type === 'รถ' ||
        formData.type === 'Vehicle' ||
        formData.type === 'VEHICLE';

      const payload: any = {
        id: warehouse.id,
        name: formData.name,
        // Preserve existing backend type if it’s already SUB/VEHICLE.
        type: isVehicle
          ? (warehouse.type === 'SUB' || warehouse.type === 'VEHICLE'
              ? warehouse.type
              : 'VEHICLE')
          : 'MAIN',
        // Backend validates `address` as required.
        address: (formData.location || '').trim() || (isVehicle ? 'เคลื่อนที่' : '-'),
      };

      if (isVehicle) {
        // Backend validation keys indicate flattened DTO fields.
        payload.vehicle_registration = formData.licensePlate || '';
        payload.brand = formData.brand || '';
        payload.model = formData.model || '';
        payload.color = formData.color || '';
      }

      onUpdateWarehouse({ ...warehouse, ...payload });
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
          <div className="flex rounded-lg bg-slate-200 p-1 w-full">
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="คลัง"
                className="sr-only peer"
                checked={formData.type === 'คลัง' || formData.type === 'Warehouse'}
                onChange={handleChange}
              />
              <span
                className={`block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${formData.type === 'คลัง' || formData.type === 'Warehouse' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}
              >
                คลัง
              </span>
            </label>
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="รถ"
                className="sr-only peer"
                checked={formData.type === 'รถ' || formData.type === 'Vehicle'}
                onChange={handleChange}
              />
              <span
                className={`block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${formData.type === 'รถ' || formData.type === 'Vehicle' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}
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

        {(formData.type === 'รถ' ||
          formData.type === 'Vehicle' ||
          formData.type === 'VEHICLE') ? (
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
                  maxLength={20}
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
                  maxLength={50}
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
                  maxLength={100}
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
                  maxLength={30}
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
                onChange={handleChange}
                placeholder="เช่น เคลื่อนที่ หรือ ระบุจุดจอด"
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

