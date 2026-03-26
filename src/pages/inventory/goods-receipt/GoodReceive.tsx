// ===== React / Core =====
import React, { 
  useCallback, 
  useEffect, 
  useMemo, 
  useRef, 
  useState 
} from 'react';

// ===== Absolute Imports =====
import {
  GoodsReceive as GoodsReceiveType,
  Status,
  Warehouse as WarehouseType,
} from '@/src/types/entity/app.interface';

// ===== Components =====
import { ApprovalModal } from '../../../components/common/ApprovalModal';
import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { AddGoodsReceiptModal } from '../../../components/features/inventory/AddGoodsReceiveModal';
import { GoodsReceiptDetailsModal } from '../../../components/features/inventory/GoodsReceiptDetailsModal';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';

// ===== API =====
import { GoodsReceiptApi } from '../../../api/goods-receipt';
import { ProductApi } from '../../../api/product';
import { SupplierApi } from '../../../api/supplier';
import { WarehouseApi } from '../../../api/warehouse';

// ===== Assets =====
import {
  DocumentCheckIcon,
  EyeIcon,
  ManageIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  LoadingIcon, // 🌟 เพิ่ม LoadingIcon
} from '../../../assets/icons/Icons';

// FIX: Define props interface
interface GoodsReceiveProps {
  onCreateReceipt: (receipt: Omit<GoodsReceiveType, 'id'>) => Promise<void> | void;
  onUpdateReceipt: (receipt: GoodsReceiveType) => Promise<void> | void;
  onDeleteReceipt: (receiptId: string) => Promise<void> | void;
}

const GoodsReceive: React.FC<GoodsReceiveProps> = ({
  onCreateReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [receipts, setReceipts] = useState<GoodsReceiveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiveType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGoodReceives = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await GoodsReceiptApi.getAll();
      if (response && response.data) {
        setReceipts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch goods receipts', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🟢 3. ดึงข้อมูลครั้งแรกเมื่อเปิดหน้า
  useEffect(() => {
    fetchGoodReceives();
  }, [fetchGoodReceives]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [warehousesRes, suppliersRes, productsRes] = await Promise.all([
          WarehouseApi.getWarehouses(),
          SupplierApi.getSuppliers({} as any),
          ProductApi.getProducts(),
        ]);
        setWarehouses(warehousesRes.data || []);
        setSuppliers(suppliersRes.data || []);
        setProducts(productsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch initial data', error);
      }
    };

    fetchInitialData();
  }, []);

  // 🟢 4. สร้าง Wrapper Functions เพื่อดึงข้อมูลใหม่หลัง Action สำเร็จ
  const handleCreate = async (data: Omit<GoodsReceiveType, 'id'>) => {
    try {
      await onCreateReceipt(data);
      await fetchGoodReceives(); // ดึงใหม่หลังสร้างเสร็จ
      setIsAddModalOpen(false); // ปิด Modal ฝั่ง Parent เพื่อความชัวร์
    } catch (error) {
      console.error('Create error', error);
    }
  };

  const handleUpdate = async (data: GoodsReceiveType) => {
    try {
      await onUpdateReceipt(data);
      await fetchGoodReceives(); // ดึงใหม่หลังอัปเดตเสร็จ
    } catch (error) {
      console.error('Update error', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await onDeleteReceipt(id);
      await fetchGoodReceives(); // ดึงใหม่หลังลบเสร็จ
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  // =====================================

  const sortedReceipts = useMemo(() => [...receipts], [receipts]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, wh) => {
      acc[wh.id] = wh.name;
      return acc;
    }, {} as Record<string, string>);
  }, [warehouses]);

  const supplierMap = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);
  }, [suppliers]);

  const filteredReceipts = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) return sortedReceipts; 

    return sortedReceipts.filter((receipt) => { 
      const supplierName = (receipt.supplier_id && supplierMap[receipt.supplier_id]) || '';
      const receiptDate = formatThaiDate(receipt.created_at);

      return (
        (receipt.code && receipt.code.toLowerCase().includes(lowercasedQuery)) ||
        (receipt.receipt_no && receipt.receipt_no.toLowerCase().includes(lowercasedQuery)) ||
        supplierName.toLowerCase().includes(lowercasedQuery) ||
        receiptDate.includes(lowercasedQuery) ||
        (receipt.status && receipt.status.toLowerCase().includes(lowercasedQuery))
      );
    });
  }, [sortedReceipts, searchQuery, supplierMap]);
  
  const totalItems = filteredReceipts.length;
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (receipt: GoodsReceiveType) => {
    setSelectedReceipt(receipt);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, receiptId: string) => {
    event.stopPropagation();
    if (openDropdownId === receiptId) {
      setOpenDropdownId(null);
      setSelectedReceipt(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const found = receipts.find((r) => r.id === receiptId);
      setSelectedReceipt((found as any) || null);
      setOpenDropdownId(receiptId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmApproval = (receiptId: string, remarks: string) => {
    const receiptToUpdate = receipts.find((r) => r.id === receiptId);
    if (receiptToUpdate) {
      handleUpdate({
        ...receiptToUpdate,
        status: approvalAction === 'approve' ? 'RECEIVED' : 'CANCELLED',
        remarks: remarks,
      } as any);
    }
    setIsApprovalModalOpen(false);
    setOpenDropdownId(null);
    setApprovalAction(null);
    setSelectedReceipt(null);
  };

  const handleCancel = (receiptId: string) => {
    const receiptToUpdate = receipts.find((r) => r.id === receiptId);
    if (receiptToUpdate) {
      handleUpdate({
        ...receiptToUpdate,
        status: 'CANCELLED',
        remarks: 'ยกเลิกโดยผู้ใช้',
        updated_by: 'ผู้ดูแลระบบ',
      } as any);
    }
    setOpenDropdownId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-receipt-id]')) return;
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const renderActions = () => {
    if (!selectedReceipt) return null;

    const actions = [
      <a
        key="view"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleViewDetails(selectedReceipt);
        }}
        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        role="menuitem"
      >
        <EyeIcon className="mr-3 h-5 w-5 text-slate-400" aria-hidden="true" />
        <span>ดูรายละเอียด</span>
      </a>,
    ];

    if (selectedReceipt.status === 'PENDING' || selectedReceipt.status === Status.PendingApproval) {
      actions.push(
        <a
          key="approve"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleApprovalAction('approve');
          }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          role="menuitem"
        >
          <DocumentCheckIcon className="mr-3 h-5 w-5 text-emerald-500" aria-hidden="true" />
          <span>อนุมัติ</span>
        </a>,
        <a
          key="reject"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleApprovalAction('reject');
          }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          role="menuitem"
        >
          <XCircleIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
          <span>ไม่อนุมัติ</span>
        </a>
      );
    }

    if (selectedReceipt.status === Status.Draft || selectedReceipt.status === Status.PendingApproval) {
      actions.push(
        <>
          <div key="divider" className="border-t border-slate-100 my-1"></div>
          <a
            key="cancel"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleCancel(selectedReceipt.id);
            }}
            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            role="menuitem"
          >
            <TrashIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
            <span>ยกเลิก</span>
          </a>
        </>
      );
    }

    return actions;
  };

  return (
    <>
      {/* 🌟 1. ปรับ Container หลักให้ยืดเต็มจอ (min-h) และใช้ Flex Column */}
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-64px)] space-y-6 max-w-full">
        
        {/* 🌟 2. Header & Filters (ให้คงขนาดไว้ด้วย shrink-0) */}
        <div className="shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-slate-800">รับสินค้าเข้า</h1>
            <p className="mt-1 text-slate-600">จัดการการรับสินค้าเข้าคลัง</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="w-full sm:w-64 xl:w-72">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่, อ้างอิง, ผู้ขาย)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); 
                }}
                className="w-full"
                title="ค้นหาด้วย: เลขที่เอกสาร, เลขที่อ้างอิง, ผู้จัดจำหน่าย, วันที่, สถานะ"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary" className="w-full sm:w-auto justify-center shrink-0">
              <PlusIcon className="h-5 w-5 mr-2" />
              สร้างใบรับเข้า
            </Button>
          </div>
        </div>

        {/* 🌟 3. Content Area (ยืดขยายตามพื้นที่ที่เหลือด้วย flex-1) */}
        <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm">
          {/* พื้นที่ตาราง ใส่ overflow-auto และ flex-1 เพื่อให้ Scroll ได้แค่ข้างในนี้ */}
          <div className="overflow-auto w-full flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่ใบรับเข้า</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่อ้างอิง</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลัง</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้จัดจำหน่าย</th>
                  <th className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase whitespace-nowrap">สถานะ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {/* 🌟 4. ปรับ Loading ให้เป็นแบบตารางหมุน (เหมือนหน้าอื่นๆ) */}
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลใบรับเข้า...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReceipts.length > 0 ? (
                  paginatedReceipts.map((receipt, index) => (
                    <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:text-primary-dark cursor-pointer transition-colors"
                        onClick={() => handleViewDetails(receipt as any)}
                      >
                        {receipt.code || receipt.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">{receipt.receipt_no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatThaiDate(receipt.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(receipt as any).warehouse?.name || warehouseMap[receipt.warehouse_id] || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {receipt.supplier_id ? supplierMap[receipt.supplier_id] : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <StatusBadge status={receipt.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-block text-left">
                          <Button data-receipt-id={receipt.id} onClick={(e) => handleDropdownToggle(e, receipt.id)} variant="icon" title="ตัวเลือก">
                            <span className="sr-only">Open options</span>
                            <ManageIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลใบรับเข้า</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบรับเข้าใหม่</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* พื้นที่ Pagination ใช้ mt-auto ดันลงล่าง และ sticky bottom-0 เพื่อให้เกาะขอบล่างเสมอ */}
          <div className="border-t border-slate-200 bg-white mt-auto sticky bottom-0 z-20 w-full pb-safe">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </Card>
      </div>

      {/* Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {renderActions()}
          </div>
        </div>
      )}

      {/* 🟢 6. เปลี่ยน onCreateReceipt ส่งเป็น handleCreate แทน */}
      {isAddModalOpen && (
        <AddGoodsReceiptModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onCreateReceipt={handleCreate as any} 
          receipts={receipts as any}
          warehouses={warehouses}
          suppliers={suppliers}
          products={products}
        />
      )}
      <GoodsReceiptDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        receipt={selectedReceipt}
        warehouses={warehouses}
        products={products}
      />
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        action={approvalAction}
        item={selectedReceipt as any}
        onConfirm={handleConfirmApproval}
      />
    </>
  );
};

export default GoodsReceive;