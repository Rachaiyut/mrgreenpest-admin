import React, { useState } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import { IssueSummaryForm } from './IssueSummaryForm';

// ===== Types =====
import {
  User as UserType,
  Customer as CustomerType,
  Warehouse,
  Product as ProductType,
} from '@/src/types/entity/app.interface';
import {
  StockIssueSummary,
  Warehouse as InventoryWarehouse,
} from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';

interface IssueSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  onSubmit: (data: any) => Promise<void>;
  summary?: StockIssueSummary | null;
  warehouses: (Warehouse | InventoryWarehouse)[];
  products: (ProductType | Product)[];
  users: UserType[];
  customers?: CustomerType[];
  currentUser?: UserType;
  stockMap?: Map<string, Map<string, number>>;
}

export const IssueSummaryModal: React.FC<IssueSummaryModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSubmit,
  summary = null,
  warehouses,
  products,
  users,
  customers = [],
  currentUser,
  stockMap = new Map(),
}) => {
  const isEditMode = mode === 'edit';
  const [isOverStock, setIsOverStock] = useState(false);

  const getTitle = () => {
    if (isEditMode) return 'แก้ไขสรุปเบิกสินค้า/อุปกรณ์';
    return 'สร้างสรุปเบิกสินค้า/อุปกรณ์';
  };

  const overStockTitle = isOverStock
    ? 'ไม่สามารถบันทึกได้ เนื่องจากมีสินค้าที่เบิกเกินสต๊อกในคลัง'
    : undefined;

  const footer = (
    <div className="flex flex-col gap-2 w-full">
      {isOverStock && (
        <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
          <span>⚠️</span>
          <span>มีสินค้าที่เบิกเกินสต๊อกในคลัง — กรุณาแก้ไขจำนวนก่อนบันทึก</span>
        </div>
      )}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:justify-end">
        <Button variant="secondary" onClick={onClose} type="button" className="w-full sm:w-auto">
          ยกเลิก
        </Button>
        <Button
          variant="outline"
          type="button"
          className="w-full sm:w-auto"
          onClick={() => document.getElementById('issue-summary-draft-btn')?.click()}
          disabled={isOverStock}
          title={overStockTitle}
        >
          บันทึกฉบับร่าง
        </Button>
        <Button
          variant="primary"
          type="submit"
          form="issue-summary-form"
          className="w-full sm:w-auto"
          disabled={isOverStock}
          title={overStockTitle}
        >
          {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกและตัดสต็อก'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="5xl"
      footer={footer}
    >
      <IssueSummaryForm
        mode={mode}
        isOpen={isOpen}
        summary={summary}
        warehouses={warehouses}
        products={products}
        users={users}
        customers={customers}
        currentUser={currentUser}
        stockMap={stockMap}
        onSubmit={onSubmit}
        onCancel={onClose}
        onOverStockChange={setIsOverStock}
      />
    </Modal>
  );
};
