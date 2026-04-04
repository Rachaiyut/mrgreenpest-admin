import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../common/Modal';
import { Button, Input } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { Warehouse, Product, User } from '@/src/types/entity/app.interface';
import { WarehouseApi } from '@/src/api/warehouse';
import { TransferApi } from '@/src/api/transfer';
import { UserApi } from '@/src/api/user';
import { WarehouseType, TransferStatus } from '@/src/types/enums/inventory';
import {
  PlusIcon,
  TrashIcon,
  TruckIcon,
  CalendarIcon,
  ArrowRightIcon,
  PackageIcon,
  DocumentTextIcon,
  UserIcon,
} from '../../../assets/icons/Icons';
import { message } from 'antd';

interface ReturnToMainWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWarehouse?: Warehouse | null;
  onSuccess: () => void;
  products: Product[];
}

interface TransferItemState {
  id: string;
  productId: string;
  quantity: number;
}

export const ReturnToMainWarehouseModal: React.FC<
  ReturnToMainWarehouseModalProps
> = ({ isOpen, onClose, sourceWarehouse, onSuccess, products }) => {
  const [items, setItems] = useState<TransferItemState[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');

  const [mainWarehouses, setMainWarehouses] = useState<
    { value: string; label: string }[]
  >([]);
  const [vehicleWarehouses, setVehicleWarehouses] = useState<
    { value: string; label: string }[]
  >([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userOptions, setUserOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remark, setRemark] = useState('');
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // People State
  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.code})`,
      })),
    [products]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Initialize source if provided
  useEffect(() => {
    if (isOpen && sourceWarehouse) {
      setSourceWarehouseId(sourceWarehouse.id);
    } else if (isOpen) {
      setSourceWarehouseId('');
    }
  }, [isOpen, sourceWarehouse]);

  // Fetch Warehouses and Users
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);

      const fetchData = async () => {
        try {
          const [mainRes, vehicleRes, usersRes] = await Promise.all([
            WarehouseApi.getWarehouses({
              type: WarehouseType.MAIN,
              limit: 1000,
            }),
            WarehouseApi.getWarehouses({
              type: WarehouseType.VEHICLE,
              limit: 1000,
            }),
            UserApi.getAll({ limit: 1000 }),
          ]);

          setMainWarehouses(
            mainRes.data.map((w) => ({ value: w.id, label: w.name }))
          );

          setVehicleWarehouses(
            vehicleRes.data.map((w) => ({ value: w.id, label: w.name }))
          );

          const usersData = (usersRes as unknown as Record<string, unknown>)?.data;
          if (usersRes && Array.isArray(usersData)) {
            setUsers(usersData as User[]);
          } else if (Array.isArray(usersRes)) {
            setUsers(usersRes as User[]);
          }

          // Auto-select destination if only one
          if (mainRes.data.length === 1) {
            setDestinationWarehouseId(mainRes.data[0].id);
          }
        } catch (err) {
          console.error('Failed to fetch data', err);
          message.error('ไม่สามารถดึงข้อมูลได้');
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();

      // Reset Form
      setItems([]);
      setRemark('');
      setReturnDate(new Date().toISOString().split('T')[0]);
      setRequesterId('');
      setRecipientId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (users.length > 0) {
      const options = users.map((u) => ({
        value: u.id,
        label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
      }));
      setUserOptions(options);
    }
  }, [users]);

  // Fetch Source Stock when source changes
  useEffect(() => {
    if (sourceWarehouseId) {
      setIsLoading(true);
      WarehouseApi.getStockBalances(sourceWarehouseId)
        .then((res: any) => {
          const stocks = Array.isArray(res) ? res : res.data || [];
          const map = new Map<string, number>();
          stocks.forEach((s: any) => {
            const pId = s.product_id || s.product?.id;
            const qty = Number(s.quantity);
            if (pId) map.set(pId, qty);
          });
          setStockMap(map);
        })
        .catch((err) => console.error('Failed to fetch stock', err))
        .finally(() => setIsLoading(false));
    } else {
      setStockMap(new Map());
    }
  }, [sourceWarehouseId]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productId: '', quantity: 1 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof TransferItemState,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    // Prevent default form submission if wrapped in form
    if (e && e.preventDefault) e.preventDefault();

    if (!sourceWarehouseId) {
      message.error('กรุณาเลือกต้นทาง (รถ/คลังย่อย)');
      return;
    }
    if (!destinationWarehouseId) {
      message.error('กรุณาเลือกคลังปลายทาง');
      return;
    }
    if (items.length === 0) {
      message.error('กรุณาเพิ่มรายการสินค้า');
      return;
    }
    if (!requesterId) {
      message.error('กรุณาระบุผู้เบิก (Requester)');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productId) {
        message.error('กรุณาเลือกสินค้าให้ครบถ้วน');
        return;
      }
      if (item.quantity <= 0) {
        message.error('จำนวนสินค้าต้องมากกว่า 0');
        return;
      }
      const currentStock = stockMap.get(item.productId) || 0;
      if (item.quantity > currentStock) {
        const prodName = productMap.get(item.productId)?.name || item.productId;
        message.error(
          `สินค้า ${prodName} มีจำนวนไม่พอ (คงเหลือ: ${currentStock})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Prepare remark with requester/recipient info
      const requester = users.find((u) => u.id === requesterId);
      const recipient = users.find((u) => u.id === recipientId);
      const requesterName = requester
        ? `${requester.first_name} ${requester.last_name}`
        : requesterId;
      const recipientName = recipient
        ? `${recipient.first_name} ${recipient.last_name}`
        : '';

      const fullRemark = `[คืนสินค้า] ผู้ขอคืน: ${requesterName}${recipientName ? `, ผู้รับ: ${recipientName}` : ''}. ${remark}`;

      await TransferApi.create({
        from_warehouse_id: sourceWarehouseId,
        to_warehouse_id: destinationWarehouseId,
        items: items.map((item) => ({
          product_id: item.productId,
          qty: item.quantity,
        })),
        remark: fullRemark,
        status: TransferStatus.COMPLETED,
        // created_at: returnDate // Assuming backend supports date override if needed, otherwise it uses current timestamp
      });
      message.success('คืนสินค้าเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to return products', error);
      message.error('เกิดข้อผิดพลาดในการคืนสินค้า');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างใบคืนสินค้า"
      size="5xl"
      footer={
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300"
            >
              ยกเลิก
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                message.info('บันทึกฉบับร่างเรียบร้อย (จำลอง)');
                onClose();
              }}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium hidden sm:inline-flex"
            >
              บันทึกฉบับร่าง
            </Button>
            <Button
              variant="primary"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
              disabled={isSubmitting || isLoading}
              className="py-2 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและตัดสต็อก'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Logistics Header Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TruckIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              การเคลื่อนย้ายสินค้า
            </h3>
            <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">
                วันที่คืน:
              </span>
              <DatePicker
                selected={returnDate ? new Date(returnDate) : null}
                onChange={(date: Date | null) => setReturnDate(date ? date.toISOString().substring(0, 10) : '')}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="dd/mm/yyyy"
                className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer"
                wrapperClassName="w-full"
                required
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                คืนจาก (รถ/คลังย่อย) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={vehicleWarehouses}
                value={sourceWarehouseId}
                onChange={setSourceWarehouseId}
                placeholder="เลือกต้นทาง (รถ/คลังย่อย)"
                className="w-full bg-white shadow-sm border-slate-200"
              />
            </div>

            <div className="flex items-center justify-center pt-6 text-slate-300">
              <ArrowRightIcon className="w-5 h-5 hidden md:block text-slate-400" />
              <ArrowRightIcon className="w-5 h-5 rotate-90 md:hidden text-slate-400" />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                ไปยัง (คลังหลัก) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={mainWarehouses}
                value={destinationWarehouseId}
                onChange={setDestinationWarehouseId}
                placeholder="เลือกคลังหลัก"
                className="w-full bg-white shadow-sm border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Items List Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  รายการสินค้า
                </h3>
                <p className="text-xs text-slate-500">
                  สินค้าที่ต้องการคืนเข้าคลัง
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleAddItem}
              className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" />
              เพิ่มสินค้า
            </Button>
          </div>

          <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                <div className="bg-slate-50 p-4 rounded-full mb-3 border border-dashed border-slate-200 animate-pulse">
                  <TruckIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-600 text-sm">
                  ยังไม่มีรายการสินค้า
                </p>
                <p className="text-xs mt-1 text-slate-400">
                  กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากคลัง
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-6">รายละเอียดสินค้า</div>
                  <div className="col-span-3 text-right">จำนวน</div>
                  <div className="col-span-3 text-center">จัดการ</div>
                </div>

                {items.map((item) => {
                  const currentStock = stockMap.get(item.productId) || 0;
                  const product = productMap.get(item.productId);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border transition-all shadow-sm bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-6">
                          <SearchableSelect
                            options={productOptions}
                            value={item.productId}
                            onChange={(val) =>
                              handleItemChange(item.id, 'productId', val)
                            }
                            placeholder="เลือกสินค้า"
                            className="w-full text-sm font-bold"
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                              Stock ในรถ: {currentStock.toLocaleString()}{' '}
                              {product?.unit?.name || 'หน่วย'}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-3 flex flex-col items-end gap-1">
                          <div className="relative">
                            <Input
                              type="number"
                              min="1"
                              max={currentStock}
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'quantity',
                                  Number(e.target.value)
                                )
                              }
                              className={`w-28 text-right transition-all h-9 text-sm font-bold pr-8 ${
                                item.quantity > currentStock
                                  ? 'border-red-300 text-red-600 focus:border-red-500 focus:ring-red-200'
                                  : 'border-slate-200 focus:border-indigo-500'
                              }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                              {product?.unit?.name || 'หน่วย'}
                            </span>
                          </div>
                          {item.quantity > currentStock && (
                            <span className="text-[10px] font-bold text-red-600">
                              เกินสต็อกที่มี
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="ลบรายการ"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* People Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
            <UserIcon className="w-4 h-4 text-slate-400" />
            ผู้เกี่ยวข้อง
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                ผู้คืน (Requester) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={requesterId}
                onChange={setRequesterId}
                options={userOptions}
                placeholder="ค้นหาชื่อผู้คืนสินค้า"
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                ผู้รับคืน (Recipient)
              </label>
              <SearchableSelect
                value={recipientId}
                onChange={setRecipientId}
                options={userOptions}
                placeholder="ค้นหาชื่อผู้รับคืน (Admin/Stock)"
                className="w-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* Remark Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            ข้อมูลเพิ่มเติม
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
              หมายเหตุ
            </label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="ระบุสาเหตุการคืนสินค้า (ถ้ามี)"
              className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
