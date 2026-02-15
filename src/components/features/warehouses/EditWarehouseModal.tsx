import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Warehouse } from '@/src/types/entity/app.interface';
import {
  NewWarehouseIcon,
  TruckIcon,
  MapPinIcon,
  HomeIcon,
} from '../../../assets/icons/Icons';

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

  const handleTypeChange = (type: string) => {
    setFormData((prev: any) => ({ ...prev, type }));
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

  const isVehicleType = 
    formData.type === 'รถ' || 
    formData.type === 'Vehicle' || 
    formData.type === 'VEHICLE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขข้อมูล: ${warehouse.name}`}
      size="2xl"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 shadow-sm"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="edit-warehouse-form"
            className="py-2 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            variant="primary"
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      }
    >
      <form
        id="edit-warehouse-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Type Selection */}
        <div className="bg-slate-100 p-1 rounded-lg flex opacity-70 pointer-events-none" title="ไม่สามารถแก้ไขประเภทได้">
          <button
            type="button"
            disabled
            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              !isVehicleType
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            <NewWarehouseIcon className={`w-4 h-4 ${!isVehicleType ? 'text-white' : 'text-slate-400'}`} />
            คลังสินค้า
          </button>
          <button
            type="button"
            disabled
            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              isVehicleType
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            <TruckIcon className={`w-4 h-4 ${isVehicleType ? 'text-white' : 'text-slate-400'}`} />
            รถบริการ
          </button>
        </div>

        {/* General Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
            <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
              <HomeIcon className="w-4 h-4" />
            </div>
            ข้อมูลทั่วไป
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                ชื่อ{!isVehicleType ? 'คลัง' : 'รถ'} <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                id="name"
                type="text"
                value={formData.name || ''}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                placeholder={!isVehicleType ? 'เช่น คลังหลัก' : 'เช่น รถบริการ A'}
              />
            </div>

            {!isVehicleType ? (
              <div>
                <label htmlFor="location" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  ที่ตั้ง <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPinIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    name="location"
                    id="location"
                    type="text"
                    value={formData.location || ''}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-300 rounded-lg pl-9 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                    placeholder="เช่น สำนักงานใหญ่"
                  />
                </div>
              </div>
            ) : (
              <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  สถานะที่ตั้ง
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-500 flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-slate-400" />
                  เคลื่อนที่
                </div>
                {/* Hidden input to ensure logic handles it if needed, though submit handler sets it manually */}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Details Card (Conditional) */}
        {isVehicleType && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                <TruckIcon className="w-4 h-4" />
              </div>
              ข้อมูลยานพาหนะ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="licensePlate" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  ทะเบียนรถ <span className="text-red-500">*</span>
                </label>
                <input
                  name="licensePlate"
                  id="licensePlate"
                  type="text"
                  value={formData.licensePlate || ''}
                  onChange={handleChange}
                  required
                  maxLength={20}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                  placeholder="เช่น 1กข 1234"
                />
              </div>
              
              <div>
                <label htmlFor="brand" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  ยี่ห้อ <span className="text-red-500">*</span>
                </label>
                <input
                  name="brand"
                  id="brand"
                  type="text"
                  value={formData.brand || ''}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                  placeholder="เช่น Toyota"
                />
              </div>
              
              <div>
                <label htmlFor="model" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  รุ่น <span className="text-red-500">*</span>
                </label>
                <input
                  name="model"
                  id="model"
                  type="text"
                  value={formData.model || ''}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                  placeholder="เช่น Hilux Revo"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="color" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  สี <span className="text-red-500">*</span>
                </label>
                <input
                  name="color"
                  id="color"
                  type="text"
                  value={formData.color || ''}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                  placeholder="เช่น ขาว"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
