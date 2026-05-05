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

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWarehouse: (warehouse: Omit<Warehouse, 'id'>) => void;
}

type FormErrors = {
  name?: string;
  location?: string;
  license_plate?: string;
  brand?: string;
  model?: string;
  color?: string;
};

const initialState = {
  name: '',
  location: '',
  license_plate: '',
  brand: '',
  model: '',
  color: '',
};

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  isOpen,
  onClose,
  onCreateWarehouse,
}) => {
  const [warehouseType, setWarehouseType] = useState<'คลัง' | 'รถ'>('คลัง');
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setWarehouseType('คลัง');
      setForm(initialState);
      setErrors({});
    }
  }, [isOpen]);

  const updateField = (key: keyof typeof initialState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key as keyof FormErrors]) return prev;
        if (value.trim()) {
          const next = { ...prev };
          delete next[key as keyof FormErrors];
          return next;
        }
        return prev;
      });
    };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) {
      next.name =
        warehouseType === 'คลัง'
          ? 'กรุณากรอกชื่อคลัง'
          : 'กรุณากรอกชื่อรถ';
    }

    if (warehouseType === 'คลัง') {
      if (!form.location.trim()) next.location = 'กรุณากรอกที่ตั้ง';
    } else {
      if (!form.license_plate.trim()) next.license_plate = 'กรุณากรอกทะเบียนรถ';
      if (!form.brand.trim()) next.brand = 'กรุณากรอกยี่ห้อ';
      if (!form.model.trim()) next.model = 'กรุณากรอกรุ่น';
      if (!form.color.trim()) next.color = 'กรุณากรอกสี';
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: warehouseType === 'รถ' ? 'VEHICLE' : 'MAIN',
      address:
        (warehouseType === 'คลัง' ? form.location.trim() : 'เคลื่อนที่') || '-',
    };

    if (warehouseType === 'รถ') {
      payload.vehicle_registration = form.license_plate.trim();
      payload.brand = form.brand.trim();
      payload.model = form.model.trim();
      payload.color = form.color.trim();
    }

    onCreateWarehouse(payload as Omit<Warehouse, 'id'>);
    onClose();
  };

  const inputClass = (hasError: boolean, withIcon = false) =>
    `w-full border rounded-lg ${withIcon ? 'pl-9 ' : ''}p-2.5 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${
      hasError
        ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
        : 'border-slate-300 focus:ring-primary/20 focus:border-primary'
    }`;

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
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6"
      >
        {/* Type Selection */}
        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button
            type="button"
            onClick={() => {
              setWarehouseType('คลัง');
              setErrors({});
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              warehouseType === 'คลัง'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <NewWarehouseIcon
              className={`w-4 h-4 ${warehouseType === 'คลัง' ? 'text-white' : 'text-slate-400'}`}
            />
            คลังสินค้า
          </button>
          <button
            type="button"
            onClick={() => {
              setWarehouseType('รถ');
              setErrors({});
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              warehouseType === 'รถ'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TruckIcon
              className={`w-4 h-4 ${warehouseType === 'รถ' ? 'text-white' : 'text-slate-400'}`}
            />
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
              <label
                htmlFor="warehouse-name"
                className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1"
              >
                ชื่อ{warehouseType === 'คลัง' ? 'คลัง' : 'รถ'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                name="warehouse-name"
                id="warehouse-name"
                type="text"
                value={form.name}
                onChange={updateField('name')}
                className={inputClass(!!errors.name)}
                placeholder={
                  warehouseType === 'คลัง'
                    ? 'เช่น คลังหลัก, คลังย่อย 01'
                    : 'เช่น รถบริการหน่วย 01'
                }
              />
              {errors.name && (
                <p className="mt-1 ml-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {warehouseType === 'คลัง' ? (
              <div>
                <label
                  htmlFor="warehouse-location"
                  className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1"
                >
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
                    value={form.location}
                    onChange={updateField('location')}
                    className={inputClass(!!errors.location, true)}
                    placeholder="เช่น สำนักงานใหญ่, สาขาลาดพร้าว"
                  />
                </div>
                {errors.location && (
                  <p className="mt-1 ml-1 text-xs text-red-500">
                    {errors.location}
                  </p>
                )}
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
                <label
                  htmlFor="license-plate"
                  className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1"
                >
                  ทะเบียนรถ <span className="text-red-500">*</span>
                </label>
                <input
                  name="license-plate"
                  id="license-plate"
                  type="text"
                  maxLength={20}
                  value={form.license_plate}
                  onChange={updateField('license_plate')}
                  className={inputClass(!!errors.license_plate)}
                  placeholder="เช่น 1กข 1234"
                />
                {errors.license_plate && (
                  <p className="mt-1 ml-1 text-xs text-red-500">
                    {errors.license_plate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="brand"
                  className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1"
                >
                  ยี่ห้อ <span className="text-red-500">*</span>
                </label>
                <input
                  name="brand"
                  id="brand"
                  type="text"
                  maxLength={50}
                  value={form.brand}
                  onChange={updateField('brand')}
                  className={inputClass(!!errors.brand)}
                  placeholder="เช่น Toyota"
                />
                {errors.brand && (
                  <p className="mt-1 ml-1 text-xs text-red-500">
                    {errors.brand}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="model"
                  className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1"
                >
                  รุ่น <span className="text-red-500">*</span>
                </label>
                <input
                  name="model"
                  id="model"
                  type="text"
                  maxLength={100}
                  value={form.model}
                  onChange={updateField('model')}
                  className={inputClass(!!errors.model)}
                  placeholder="เช่น Hilux Revo"
                />
                {errors.model && (
                  <p className="mt-1 ml-1 text-xs text-red-500">
                    {errors.model}
                  </p>
                )}
              </div>

              <div className="col-span-1 md:col-span-2">
                <label
                  htmlFor="color"
                  className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1"
                >
                  สี <span className="text-red-500">*</span>
                </label>
                <input
                  name="color"
                  id="color"
                  type="text"
                  maxLength={30}
                  value={form.color}
                  onChange={updateField('color')}
                  className={inputClass(!!errors.color)}
                  placeholder="เช่น ขาว"
                />
                {errors.color && (
                  <p className="mt-1 ml-1 text-xs text-red-500">
                    {errors.color}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
