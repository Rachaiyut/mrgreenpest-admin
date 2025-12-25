import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Button } from '../../common/FormControls';
import { Warehouse } from '../../../types';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWarehouse: (warehouse: Omit<Warehouse, 'id'>) => void;
}

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({ isOpen, onClose, onCreateWarehouse }) => {
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
        
        const newWarehouse: Omit<Warehouse, 'id'> = {
            name: formData.get('warehouse-name') as string,
            type: warehouseType,
            location: formData.get('warehouse-location') as string,
            licensePlate: formData.get('license-plate') as string | undefined,
            brand: formData.get('brand') as string | undefined,
            model: formData.get('model') as string | undefined,
            color: formData.get('color') as string | undefined,
        };

        onCreateWarehouse(newWarehouse);
        onClose();
    };
    

    return (
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                title="สร้างคลังสินค้าใหม่"
                footer={
                    <div className="flex gap-2">
                        <Button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300" variant="outline">
                            ยกเลิก
                        </Button>
                        <Button type="submit" form="add-warehouse-form" className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm" variant="primary">
                            บันทึก
                        </Button>
                    </div>
                }
            >
            <form id="add-warehouse-form" ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <FormField label="ประเภท">
                    <div className="flex rounded-lg bg-slate-100 p-1 w-full">
                        <label className="relative flex-1 cursor-pointer">
                            <input type="radio" name="warehouseType" value="คลัง" className="sr-only peer" checked={warehouseType === 'คลัง'} onChange={() => setWarehouseType('คลัง')} />
                            <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">คลัง</span>
                        </label>
                        <label className="relative flex-1 cursor-pointer">
                            <input type="radio" name="warehouseType" value="รถ" className="sr-only peer" checked={warehouseType === 'รถ'} onChange={() => setWarehouseType('รถ')} />
                            <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">รถ</span>
                        </label>
                    </div>
                </FormField>
                 <FormField label="ชื่อคลัง" htmlFor="warehouse-name">
                    <Input name="warehouse-name" id="warehouse-name" type="text" required placeholder={warehouseType === 'คลัง' ? "เช่น คลังหลัก" : "เช่น รถบริการ A"} />
                </FormField>

                {warehouseType === 'รถ' ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="ทะเบียนรถ" htmlFor="license-plate">
                                <Input name="license-plate" id="license-plate" type="text" required placeholder="เช่น 1กข 1234" />
                            </FormField>
                            <FormField label="ยี่ห้อ" htmlFor="brand">
                                <Input name="brand" id="brand" type="text" required placeholder="เช่น Toyota" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="รุ่น" htmlFor="model">
                                <Input name="model" id="model" type="text" required placeholder="เช่น Hilux Revo" />
                            </FormField>
                            <FormField label="สี" htmlFor="color">
                                <Input name="color" id="color" type="text" required placeholder="เช่น ขาว" />
                            </FormField>
                        </div>
                        <FormField label="ที่ตั้ง" htmlFor="warehouse-location">
                            <Input name="warehouse-location" id="warehouse-location" type="text" value="เคลื่อนที่" readOnly className="bg-slate-100" />
                        </FormField>
                    </>
                ) : (
                    <FormField label="ที่ตั้ง" htmlFor="warehouse-location">
                        <Input name="warehouse-location" id="warehouse-location" type="text" placeholder="เช่น สำนักงานใหญ่" />
                    </FormField>
                )}
            </form>
        </Modal>
    );
};
