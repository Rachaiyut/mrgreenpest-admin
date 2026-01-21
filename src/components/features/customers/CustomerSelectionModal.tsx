import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { ICustomer } from '@/src/types/entity/customer.interface';

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerIds: string[]) => void;
  customers: ICustomer[];
  initialSelectedIds: string[];
}

export const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  customers,
  initialSelectedIds,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialSelectedIds));
      setSearchTerm('');
    }
  }, [isOpen, initialSelectedIds]);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        const lowercasedQuery = searchTerm.toLowerCase();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return (
          fullName.includes(lowercasedQuery) ||
          c.id.toLowerCase().includes(lowercasedQuery) ||
          c.phone.toLowerCase().includes(lowercasedQuery)
        );
      }),
    [searchTerm, customers]
  );

  const handleToggleSelection = (customerId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="เลือกลูกค้า"
      size="5xl"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            variant="primary"
          >
            ยืนยัน ({selectedIds.size})
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="ค้นหา (รหัส, ชื่อ, ผู้ติดต่อ, โทรศัพท์)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  รหัสลูกค้า
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อลูกค้า
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ผู้ติดต่อ
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  เบอร์โทรศัพท์
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ประเภท
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`cursor-pointer hover:bg-slate-50 ${selectedIds.has(customer.id) ? 'bg-primary/10' : ''}`}
                  onClick={() => handleToggleSelection(customer.id)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      readOnly
                      className="pointer-events-none"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                    {customer.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {/* Contact Person not available */}-
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    {customer.customer_type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              ไม่พบลูกค้าที่ตรงกัน
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
