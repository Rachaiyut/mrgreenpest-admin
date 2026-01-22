import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';

import {
    FormField,
    Input,
    Textarea,
    Select,
    Button,
} from '../../common/FormControls';


import { Category, CategoryType } from '@/src/types';

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
    onUpdateCategory: (id: string, category: Partial<Category>) => void;
}

const EditCategoryModal: React.FC<EditProductModalProps> = ({
    isOpen,
    onClose,
    category,
    onUpdateCategory,
}) => {
    const [formData, setFormData] = useState<Partial<Category>>({});

    useEffect(() => {
        if (category) {
            setFormData(category);
        }
    }, [category]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (category) {
            onUpdateCategory(category.id, { ...formData } as Category);
        }
        onClose();
        setFormData({})
    };

    if (!category) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`แก้ไขหมวดหมู่: ${category.name}`}
            size="lg"
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
                        form="edit-category-form"
                        className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                    >
                        บันทึก
                    </button>
                </div>
            }
        >
            <form
                id="edit-category-form"
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                <FormField label="ชื่อหมวดหมู่" htmlFor="category-name">
                    <Input 
                        name="name" 
                        id="category-name" 
                        type="text" 
                        required
                        value={formData.name || category.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="รหัสหมวดหมู่" htmlFor="prefix">
                        <Input
                            name="code"
                            id="code"
                            type="text"
                            value={category.code}
                            maxLength={3}
                            disabled
                            placeholder="เช่น CH, MAT"
                        />
                    </FormField>
                    <FormField label="ประเภทหมวดหมู่" htmlFor="categoryId">
                        <Select name="type" id="type" defaultValue={category.type}>
                            <option value="" disabled> -- เลือกหมวดหมู่ -- </option>
                            <option value={CategoryType.PRODUCT}>สินค้า</option>
                            <option value={CategoryType.SERVICE}>บริการ</option>
                        </Select>
                    </FormField>
                </div>
                <FormField label="รายละเอียด" htmlFor="description">
                    <Textarea 
                    name="description" 
                    id="description" 
                    rows={3} 
                    value={category.description}
                    />
                </FormField>
            </form>
        </Modal>
    );
}

export default EditCategoryModal
