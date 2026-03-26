import { FC } from 'react';
import { Input } from './FormControls';
import { SearchableSelect } from './SearchableSelect';
import { PlusIcon, TrashIcon, CurrencyDollarIcon } from '../../assets/icons/Icons';

export interface ItemsSectionItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface ItemsSectionProps {
  items: ItemsSectionItem[];
  onItemsChange: (items: ItemsSectionItem[]) => void;
  productOptions: Array<{ value: string; label: string; description?: string }>;
  onProductSelect: (itemId: string, productId: string) => void;
  isReadOnly?: boolean;
  title?: string;
  subtitle?: string;
  /** Disable the product select dropdown (e.g. when using package pricing) */
  disableProductSelect?: boolean;
  /** Hide the add/remove buttons even when not read-only */
  hideAddRemove?: boolean;
}

const ItemsSection: FC<ItemsSectionProps> = ({
  items,
  onItemsChange,
  productOptions,
  onProductSelect,
  isReadOnly = false,
  title = 'รายการสินค้าและบริการ',
  subtitle = 'ระบุรายการสินค้า จำนวน และราคาต่อหน่วย',
  disableProductSelect = false,
  hideAddRemove = false,
}) => {
  const canModify = !isReadOnly && !hideAddRemove;

  const addItem = () => {
    const newItem: ItemsSectionItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'รายการ',
      unitPrice: 0,
      amount: 0,
    };
    onItemsChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemsSectionItem, value: string | number) => {
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">{subtitle}</p>
          </div>
        </div>

      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 bg-slate-50">
            <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ยังไม่มีรายการ กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-end gap-4">
                <div className="flex-shrink-0 flex items-center justify-center bg-white h-10 w-10 rounded-full border border-slate-200 text-slate-500 font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-11 gap-4 items-end">
                  <div className="md:col-span-4">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">สินค้า/บริการ</label>
                    <SearchableSelect
                      value={item.product_id || ''}
                      onChange={(val) => onProductSelect(item.id, val)}
                      options={productOptions}
                      placeholder="เลือกสินค้า..."
                      disabled={isReadOnly || disableProductSelect}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">รายละเอียดเพิ่มเติม</label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="รายละเอียด..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">จำนวน</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        disabled={isReadOnly}
                        className="text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">ราคา/หน่วย</label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        disabled={isReadOnly}
                        className="text-right"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 text-right">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">รวม</label>
                    <div className="h-10 flex items-center justify-end px-3 font-semibold text-slate-900 bg-white rounded border border-slate-200">
                      {item.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors mb-0.5"
                    title="ลบรายการ"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {canModify && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
            >
              <PlusIcon className="h-5 w-5" /> เพิ่มรายการ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsSection;
