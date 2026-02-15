import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Warehouse } from '@/src/types/entity/app.interface';
import {
  NewWarehouseIcon,
  TruckIcon,
  MapPinIcon,
  HomeIcon,
} from '../../../assets/icons/Icons';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWarehouse: (warehouse: Omit<Warehouse, 'id'>) => void;
}

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  isOpen,
  onClose,
  onCreateWarehouse,
}) => {
  const [warehouseType, setWarehouseType] = useState<'คลัง' | 'รถ'>('คลัง');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setWarehouseType('คลัง');
      formRef.current?.reset();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get('warehouse-name') as string;
    const location = formData.get('warehouse-location') as string;

    const payload: any = {
      name,
      type: warehouseType === 'รถ' ? 'VEHICLE' : 'MAIN',
      // Backend validates `address` as required
      address: location || (warehouseType === 'รถ' ? 'เคลื่อนที่' : '-'),
    };

    if (warehouseType === 'รถ') {
      // Backend vehicle DTO expects flattened fields (based on validation keys).
      payload.vehicle_registration = (formData.get('license-plate') as string) || '';
      payload.brand = (formData.get('brand') as string) || '';
      payload.model = (formData.get('model') as string) || '';
      payload.color = (formData.get('color') as string) || '';
    }

    onCreateWarehouse(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างคลังสินค้าใหม่"
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
            form="add-warehouse-form"
            className="py-2 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            variant="primary"
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form
        id="add-warehouse-form"
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Type Selection */}
        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button
            type="button"
            onClick={() => setWarehouseType('คลัง')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              warehouseType === 'คลัง'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <NewWarehouseIcon className={`w-4 h-4 ${warehouseType === 'คลัง' ? 'text-white' : 'text-slate-400'}`} />
            คลังสินค้า
          </button>
          <button
            type="button"
            onClick={() => setWarehouseType('รถ')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              warehouseType === 'รถ'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TruckIcon className={`w-4 h-4 ${warehouseType === 'รถ' ? 'text-white' : 'text-slate-400'}`} />
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
              <label htmlFor="warehouse-name" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                ชื่อ{warehouseType === 'คลัง' ? 'คลัง' : 'รถ'} <span className="text-red-500">*</span>
              </label>
              <input
                name="warehouse-name"
                id="warehouse-name"
                type="text"
                required
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                placeholder={warehouseType === 'คลัง' ? 'เช่น คลังหลัก, คลังย่อย 01' : 'เช่น รถบริการหน่วย 01'}
              />
            </div>

            {warehouseType === 'คลัง' ? (
              <div>
                <label htmlFor="warehouse-location" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  ที่ตั้ง <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPinIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    name="warehouse-location"
                    id="warehouse-location"
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg pl-9 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                    placeholder="เช่น สำนักงานใหญ่, สาขาลาดพร้าว"
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
                <input type="hidden" name="warehouse-location" value="เคลื่อนที่" />
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Details Card (Conditional) */}
        {warehouseType === 'รถ' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                <TruckIcon className="w-4 h-4" />
              </div>
              ข้อมูลยานพาหนะ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label htmlFor="license-plate" className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  ทะเบียนรถ <span className="text-red-500">*</span>
                </label>
                <input
                  name="license-plate"
                  id="license-plate"
                  type="text"
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
