import React, { useMemo, useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { IProduct, IPackageCondition } from '@/src/types/entity/package.interface';
import { ICategory } from '@/src/types/entity/category.interface';
import { CategoryType } from '@/src/types/enums/category.enum';
import {
  FormField,
  Input,
  Textarea,
  Select,
  Button,
} from '../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';

interface AddPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: IProduct[];
  onCreatePackage: (product: Partial<IProduct>) => void;
  categories: ICategory[];
}

export const AddPackageModal: React.FC<AddPackageModalProps> = ({
  isOpen,
  onClose,
  products,
  onCreatePackage,
  categories,
}) => {
  const [conditions, setConditions] = useState<
    Partial<Omit<IPackageCondition, 'id'>>[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      setConditions([]);
    }
  }, [isOpen]);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.SERVICE),
    [categories]
  );

  const generatedId = useMemo(() => {
    if (!isOpen) return '';
    const prefix = 'PK';
    const relevantProducts = products.filter((p) => p.id.startsWith('PK'));
    const maxId = relevantProducts.reduce((max, p) => {
      const numPart = p.id.replace('PK', '');
      if (!numPart) return max;
      const num = parseInt(numPart, 10);
      return isNaN(num) ? max : num > max ? num : max;
    }, 0);
    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(4, '0')}`;
  }, [isOpen, products]);

  const invalidConditionIndices = useMemo(() => {
    const indices: number[] = [];
    conditions.forEach((cond, index) => {
      if (
        typeof cond.min_price === 'number' &&
        typeof cond.first_offer_price_no_termites === 'number' &&
        typeof cond.first_offer_price_with_termites === 'number' &&
        cond.min_price >
          Math.min(
            cond.first_offer_price_no_termites,
            cond.first_offer_price_with_termites
          )
      ) {
        indices.push(index);
      }
    });
    return indices;
  }, [conditions]);

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        max_area: undefined,
        first_offer_price_no_termites: 0,
        first_offer_price_with_termites: 0,
        min_price: 0,
      },
    ]);
  };

  const handleConditionChange = (
    index: number,
    field: keyof Omit<IPackageCondition, 'id'>,
    value: string
  ) => {
    const newConditions = [...conditions];
    (newConditions[index] as any)[field] = value ? parseFloat(value) : 0;
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invalidConditionIndices.length > 0) {
      alert('กรุณาแก้ไขราคาให้ถูกต้อง: ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const newPackage: Partial<IProduct> = {
      name: data['package-name'] as string,
      category_id: data['categoryId'] as string,
      min_stock: 0,
      created_by: 'ผู้ดูแลระบบ', // Should be handled by backend or auth context
      number_of_visits: parseInt(data['package-visits'] as string, 10),
      contract_duration: data['package-duration'] as string,
      // description: data['package-description'] as string, // IProduct doesn't have description yet? Add it if needed.
      conditions: conditions.map((c, i) => ({
        id: `cond-${Date.now()}-${i}`,
        max_area: c.max_area || 0,
        first_offer_price_no_termites: c.first_offer_price_no_termites || 0,
        first_offer_price_with_termites: c.first_offer_price_with_termites || 0,
        min_price: c.min_price || 0,
      })),
    };

    onCreatePackage(newPackage);
    onClose();
  };

  const baseInputClasses =
    'w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm text-slate-900';
  const normalInputClasses =
    'border-slate-300 focus:ring-primary focus:border-primary';
  const errorInputClasses =
    'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างแพ็กเกจบริการใหม่"
      size="3xl"
      footer={
        <div className="flex gap-2">
          <Button type="button" onClick={onClose} variant="secondary">
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="add-package-form"
            variant="primary"
            disabled={invalidConditionIndices.length > 0}
            title={
              invalidConditionIndices.length > 0
                ? 'ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ'
                : ''
            }
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form id="add-package-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="รหัสแพ็กเกจ" htmlFor="package-id">
            <Input
              id="package-id"
              name="package-id"
              type="text"
              value={generatedId}
              readOnly
              className="bg-slate-100"
            />
          </FormField>
          <FormField label="หมวดหมู่" htmlFor="categoryId">
            <Select name="categoryId" id="categoryId" required>
              <option value="">-- เลือกหมวดหมู่ --</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="ชื่อแพ็กเกจ" htmlFor="package-name">
          <Input
            id="package-name"
            name="package-name"
            type="text"
            required
            placeholder="เช่น แพ็กเกจกำจัดปลวกรายปี (บ้านเดี่ยว)"
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="จำนวนครั้งที่เข้าบริการ" htmlFor="package-visits">
            <Input
              id="package-visits"
              name="package-visits"
              type="number"
              required
              placeholder="เช่น 4"
            />
          </FormField>
          <FormField label="อายุสัญญา" htmlFor="package-duration">
            <Select id="package-duration" name="package-duration" required>
              <option>ครั้งเดียว</option>
              <option>3 เดือน</option>
              <option>6 เดือน</option>
              <option>1 ปี</option>
            </Select>
          </FormField>
        </div>

        <FormField label="หมายเหตุ" htmlFor="package-description">
          <Textarea
            id="package-description"
            name="package-description"
            rows={3}
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับแพ็กเกจ"
          />
        </FormField>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-base font-semibold text-slate-800">
              เงื่อนไขราคา
            </h4>
            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
            >
              <PlusIcon className="h-5 w-5" />
              เพิ่มเงื่อนไข
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left font-medium text-slate-600">
                    พื้นที่ฯ (ตร.ม.)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาเสนอ (ไม่มีปลวก)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาเสนอ (มีปลวก)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาต่ำสุด
                  </th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {conditions.length > 0 ? (
                  conditions.map((cond, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.max_area || ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'max_area',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="เช่น 150"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.first_offer_price_no_termites ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'first_offer_price_no_termites',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.first_offer_price_with_termites ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'first_offer_price_with_termites',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.min_price ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'min_price',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${invalidConditionIndices.includes(index) ? errorInputClasses : normalInputClasses}`}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">
                      ยังไม่มีเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {invalidConditionIndices.length > 0 && (
            <p className="text-sm text-red-600 mt-2">
              ข้อผิดพลาด: ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
