import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import {
  PlusIcon,
  TrashIcon,
} from '../../../assets/icons/Icons';
import {
  StockIssueSummary,
  StockIssueItemSummary,
  Warehouse,
} from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';
import { WarehouseType } from '@/src/types/enums/inventory';

interface EditStockIssueSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: StockIssueSummary) => Promise<void>;
  summary: StockIssueSummary | null;
  warehouses: Warehouse[];
  products: Product[];
  users: { id: string; name: string; first_name?: string; last_name?: string; nick_name?: string }[];
}

const EditStockIssueSummaryModal: React.FC<EditStockIssueSummaryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  summary,
  warehouses,
  products,
  users,
}) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockIssueItemSummary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when summary changes
  useEffect(() => {
    if (summary) {
      setWarehouseId(summary.warehouse_id || '');
      setRequesterId(summary.requester_id || '');
      setNotes(summary.notes || '');
      setItems(summary.items || []);
    }
  }, [summary]);

  // Filter warehouses - only MAIN and VEHICLE types
  const availableWarehouses = useMemo(
    () => warehouses.filter((w) => w.type === WarehouseType.MAIN || w.type === WarehouseType.VEHICLE),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const userMap = useMemo(
    () =>
      new Map(
        users.map((u) => {
          let name = u.name;
          if (typeof name !== 'string' || name === '[object Object]') {
            name =
              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
              u.nick_name ||
              'Unknown';
          }
          return [u.id, name];
        })
      ),
    [users]
  );

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `temp-${Date.now()}`,
        stock_issue_summary_id: summary?.id || '',
        product_id: '',
        product_name: '',
        quantity: 1,
        unit: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'product_id' | 'quantity',
    value: string | number
  ) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = productMap.get(value as string);
      newItems[index] = {
        ...newItems[index],
        product_id: value as string,
        product_name: product?.name || '',
        unit: product?.unit?.name || '',
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        quantity: value as number,
      };
    }
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!summary) return;

    if (!warehouseId) {
      alert('Please select a warehouse');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const invalidItems = items.filter((item) => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0) {
      alert('Please fill in all item details');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({
        ...summary,
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        notes: notes || undefined,
        items,
      });

      onClose();
    } catch (error) {
      console.error('Failed to update stock issue summary', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!summary) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Stock Issue">
      <div className="space-y-4">
        {/* ID Display */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ID
          </label>
          <Input
            type="text"
            value={summary.id}
            disabled
            className="bg-slate-100"
          />
        </div>

        {/* Warehouse Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Warehouse <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            value={warehouseId}
            onChange={setWarehouseId}
            options={availableWarehouses.map((wh) => ({
              value: wh.id,
              label: `${wh.name} (${wh.type === WarehouseType.MAIN ? 'Main' : 'Vehicle'})`,
            }))}
            placeholder="Select warehouse"
          />
        </div>

        {/* Requester Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Requester
          </label>
          <SearchableSelect
            value={requesterId}
            onChange={setRequesterId}
            options={users.map((user) => ({
              value: user.id,
              label: userMap.get(user.id) || 'Unknown',
            }))}
            placeholder="Select requester"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Items <span className="text-red-500">*</span>
            </label>
            <Button type="button" variant="secondary" onClick={handleAddItem}>
              <PlusIcon className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center border border-dashed border-slate-300 rounded-lg">
              No items yet. Click "Add Item" to add.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                >
                  <div className="flex-grow">
                    <SearchableSelect
                      value={item.product_id}
                      onChange={(value) => handleItemChange(index, 'product_id', value)}
                      options={products.map((product) => ({
                        value: product.id,
                        label: `${product.name} (${product.code})`,
                      }))}
                      placeholder="Select product"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)
                      }
                      min={1}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="w-20 text-sm text-slate-500">
                    {item.unit || '-'}
                  </div>
                  <Button
                    type="button"
                    variant="icon"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !warehouseId || items.length === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export { EditStockIssueSummaryModal };