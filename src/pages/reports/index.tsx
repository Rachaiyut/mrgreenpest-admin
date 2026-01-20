import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Input, Select, Button } from '../../components/common/FormControls';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate, formatThaiDateTime } from '../../constants';
import {
  Product,
  Warehouse as WarehouseType,
  GoodsReceipt,
  Withdrawal,
  Transfer,
  StockAdjustment,
  ProductReturn,
  FieldJob,
  Invoice,
  Receipt,
  Customer,
  Status,
  User,
  Supplier,
} from '@/src/libs/common/interface/entity/app.interface';
import { ICustomer } from '@/src/libs/common/interface/entity/customer.interface';
import { CustomerType } from '@/src/libs/common/enum/customer.enum';
import { Status as BaseStatus } from '@/src/libs/common/enum/base.enum';
import { CustomerDetailsModal } from '../../components/features/customers/CustomerDetailsModal';

type ReportTab =
  | 'สต็อกคงเหลือ'
  | 'รับเข้า'
  | 'เบิกสินค้า'
  | 'โอนย้าย'
  | 'ปรับปรุง Stock'
  | 'คืนสินค้า'
  | 'ภาคสนาม'
  | 'ใบแจ้งหนี้'
  | 'ใบเสร็จรับเงิน'
  | 'ลูกค้า';

interface ReportsProps {
  products: Product[];
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  users: User[];
  stockMap: Record<string, Record<string, number>>;
  goodsReceipts: GoodsReceipt[];
  withdrawals: Withdrawal[];
  transfers: Transfer[];
  stockAdjustments: StockAdjustment[];
  productReturns: ProductReturn[];
  fieldJobs: FieldJob[];
  invoices: Invoice[];
  receipts: Receipt[];
  customers: Customer[];
}

const Reports: React.FC<ReportsProps> = ({
  products,
  warehouses,
  suppliers,
  users,
  stockMap,
  goodsReceipts,
  withdrawals,
  transfers,
  stockAdjustments,
  productReturns,
  fieldJobs,
  invoices,
  receipts,
  customers,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('สต็อกคงเหลือ');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  useEffect(() => {
    try {
      const def = localStorage.getItem('reportsDefaultTab') as ReportTab | null;
      if (def && tabs.includes(def) && def !== activeTab) setActiveTab(def);
    } catch {}
    try {
      localStorage.removeItem('reportsDefaultTab');
    } catch {}
  }, []);

  const warehouseById = useMemo(() => {
    const m = new Map<string, string>();
    warehouses.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [warehouses]);

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const supplierById = useMemo(() => {
    const m = new Map<string, string>();
    suppliers.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [suppliers]);

  const userById = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [users]);

  const stockRows = useMemo(() => {
    const rows: {
      warehouse: string;
      product: string;
      unit: string;
      quantity: number;
      threshold: number;
      low: boolean;
    }[] = [];
    Object.keys(stockMap).forEach((whId) => {
      const whName = warehouseById.get(whId) || whId;
      const prodMap = stockMap[whId] || {};
      Object.keys(prodMap).forEach((pid) => {
        const qty = prodMap[pid] || 0;
        const p = productById.get(pid);
        if (!p) return;
        const threshold = p.lowStockThreshold || 0;
        rows.push({
          warehouse: whName,
          product: p.name,
          unit: p.unit,
          quantity: qty,
          threshold,
          low: qty < threshold,
        });
      });
    });
    return rows;
  }, [stockMap, warehouseById, productById]);

  const grRows = useMemo(() => {
    return goodsReceipts.map((gr) => ({
      id: gr.id,
      warehouse: warehouseById.get(gr.warehouseId) || gr.warehouseId,
      supplier: gr.supplierId
        ? supplierById.get(gr.supplierId) || gr.supplierId
        : '-',
      date: formatThaiDate(gr.createdAt),
      status: gr.status,
      itemsCount: gr.items.length,
      totalQty: gr.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0),
      ts: new Date(gr.createdAt || '').getTime(),
    }));
  }, [goodsReceipts, warehouseById, supplierById]);

  const wdRows = useMemo(() => {
    return withdrawals.map((w) => ({
      id: w.id,
      from: warehouseById.get(w.fromWarehouseId) || w.fromWarehouseId,
      to: w.toWarehouseId
        ? warehouseById.get(w.toWarehouseId) || w.toWarehouseId
        : '-',
      recipient: w.recipientId
        ? userById.get(w.recipientId) || w.recipientId
        : '-',
      date: formatThaiDate(w.createdAt),
      status: w.status,
      itemsCount: w.items.length,
      totalQty: w.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0),
      expensesTotal: (w.expenses || []).reduce(
        (acc, e) => acc + Number(e.amount || 0),
        0
      ),
      ts: new Date(w.createdAt || '').getTime(),
    }));
  }, [withdrawals, warehouseById, userById]);

  const tfRows = useMemo(() => {
    return transfers.map((t) => ({
      id: t.id,
      from: warehouseById.get(t.fromWarehouseId) || t.fromWarehouseId,
      to: warehouseById.get(t.toWarehouseId) || t.toWarehouseId,
      date: formatThaiDate(t.createdAt),
      status: t.status,
      itemsCount: t.items.length,
      totalQty: t.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0),
      ts: new Date(t.createdAt || '').getTime(),
    }));
  }, [transfers, warehouseById]);

  const saRows = useMemo(() => {
    return stockAdjustments.map((a) => ({
      id: a.id,
      warehouse: warehouseById.get(a.warehouseId) || a.warehouseId,
      date: formatThaiDate(a.createdAt),
      status: a.status,
      itemsCount: a.items.length,
      totalDelta: a.items.reduce(
        (acc, it) =>
          acc +
          (Number(it.adjustedQuantity || 0) - Number(it.originalQuantity || 0)),
        0
      ),
      ts: new Date(a.createdAt || '').getTime(),
    }));
  }, [stockAdjustments, warehouseById]);

  const rtRows = useMemo(() => {
    return productReturns.map((r) => ({
      id: r.id,
      from: warehouseById.get(r.fromWarehouseId) || r.fromWarehouseId,
      to: warehouseById.get(r.toWarehouseId) || r.toWarehouseId,
      date: formatThaiDate(r.createdAt),
      status: r.status,
      itemsCount: r.items.length,
      totalQty: r.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0),
      ts: new Date(r.createdAt || '').getTime(),
    }));
  }, [productReturns, warehouseById]);

  const foRows = useMemo(() => {
    return fieldJobs
      .filter((j) => !!j.serviceReport)
      .map((j) => ({
        id: j.id,
        customer: j.customerName,
        reportDate: formatThaiDateTime(j.serviceReport?.createdAt),
        status: j.serviceReport?.status || Status.Draft,
        ts: new Date(j.serviceReport?.createdAt || '').getTime(),
      }));
  }, [fieldJobs]);

  const invRows = useMemo(() => {
    return invoices.map((inv) => ({
      id: inv.id,
      customer: inv.customerName,
      issuedAt: formatThaiDate(inv.issuedAt),
      dueAt: formatThaiDate(inv.dueAt),
      status: inv.status,
      total: inv.total,
      ts: new Date(inv.issuedAt || '').getTime(),
    }));
  }, [invoices]);

  const recRows = useMemo(() => {
    return receipts.map((r) => ({
      id: r.id,
      invoiceId: r.invoiceId,
      customer: r.customerName,
      paidAt: formatThaiDate(r.paidAt),
      amount: r.amount,
      method: r.paymentMethod,
      ts: new Date(r.paidAt || '').getTime(),
    }));
  }, [receipts]);

  const custRows = useMemo(() => {
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      createdAt: formatThaiDate(c.createdAt),
    }));
  }, [customers]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filterRows = (rows: any[], keys: string[]) => {
    if (!normalizedQuery) return rows;
    return rows.filter((r) =>
      keys.some((k) =>
        String(r[k] ?? '')
          .toLowerCase()
          .includes(normalizedQuery)
      )
    );
  };

  const withinDateRange = (rows: any[]) => {
    if (!startDate && !endDate) return rows;
    const startTs = startDate ? new Date(startDate).getTime() : -Infinity;
    const endTs = endDate
      ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1
      : Infinity;
    return rows.filter((r) =>
      typeof r.ts === 'number' ? r.ts >= startTs && r.ts <= endTs : true
    );
  };

  const applyWarehouseFilter = (
    rows: any[],
    opt: { from?: boolean; to?: boolean; warehouse?: boolean }
  ) => {
    if (!warehouseFilter) return rows;
    return rows.filter((r) => {
      if (opt.warehouse && r.warehouse)
        return (
          r.warehouse ===
          (warehouseById.get(warehouseFilter) || warehouseFilter)
        );
      const name = warehouseById.get(warehouseFilter) || warehouseFilter;
      const m1 = opt.from && r.from ? r.from === name : false;
      const m2 = opt.to && r.to ? r.to === name : false;
      return m1 || m2;
    });
  };

  const getActiveRows = () => {
    switch (activeTab) {
      case 'สต็อกคงเหลือ':
        return filterRows(stockRows, ['warehouse', 'product']);
      case 'รับเข้า':
        return applyWarehouseFilter(
          withinDateRange(filterRows(grRows, ['id', 'warehouse', 'supplier'])),
          { warehouse: true }
        );
      case 'เบิกสินค้า':
        return applyWarehouseFilter(
          withinDateRange(
            filterRows(wdRows, ['id', 'from', 'to', 'recipient'])
          ),
          { from: true, to: true }
        );
      case 'โอนย้าย':
        return applyWarehouseFilter(
          withinDateRange(filterRows(tfRows, ['id', 'from', 'to'])),
          { from: true, to: true }
        );
      case 'ปรับปรุง Stock':
        return applyWarehouseFilter(
          withinDateRange(filterRows(saRows, ['id', 'warehouse'])),
          { warehouse: true }
        );
      case 'คืนสินค้า':
        return applyWarehouseFilter(
          withinDateRange(filterRows(rtRows, ['id', 'from', 'to'])),
          { from: true, to: true }
        );
      case 'ภาคสนาม':
        return withinDateRange(
          filterRows(foRows, ['id', 'customer', 'reportDate'])
        );
      case 'ใบแจ้งหนี้':
        return withinDateRange(filterRows(invRows, ['id', 'customer']));
      case 'ใบเสร็จรับเงิน':
        return withinDateRange(
          filterRows(recRows, ['id', 'invoiceId', 'customer'])
        );
      case 'ลูกค้า':
        return filterRows(custRows, ['id', 'name', 'type']);
      default:
        return [];
    }
  };

  const allRows = getActiveRows();
  const totalItems = allRows.length;
  const paginatedRows = allRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs: ReportTab[] = [
    'สต็อกคงเหลือ',
    'รับเข้า',
    'เบิกสินค้า',
    'โอนย้าย',
    'ปรับปรุง Stock',
    'คืนสินค้า',
    'ภาคสนาม',
    'ใบแจ้งหนี้',
    'ใบเสร็จรับเงิน',
    'ลูกค้า',
  ];

  const [isCustDetailsOpen, setIsCustDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(
    null
  );
  const handleViewCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) {
      setSelectedCustomer(null);
      setIsCustDetailsOpen(false);
      return;
    }

    const mapped: ICustomer = {
      id: cust.id,
      created_at: cust.createdAt,
      updated_at: cust.createdAt,
      country: cust.address.country,
      status: BaseStatus.ACTIVE,
      customer_type:
        cust.type === 'บุคคลธรรมดา'
          ? CustomerType.INDIVIDUAL
          : CustomerType.CORPORATE,
      first_name: cust.name,
      last_name: '',
      nickname: cust.nickname ?? '',
      tax_id: cust.taxId,
      phone: cust.phone,
      email: cust.email ?? '',
      address_house_no: cust.address.street,
      sub_district: cust.address.subdistrict,
      district: cust.address.district,
      province: cust.address.province,
      postal_code: cust.address.postalcode,
      google_map_link: cust.googleMapLink,
    };

    setSelectedCustomer(mapped);
    setIsCustDetailsOpen(true);
  };

  const exportCsv = () => {
    const rows = allRows;
    const escape = (s: any) => {
      const str = String(s ?? '');
      const needQuote = /[",\n]/.test(str);
      const esc = str.replace(/"/g, '""');
      return needQuote ? `"${esc}"` : esc;
    };
    let headers: string[] = [];
    let dataRows: any[] = [];
    switch (activeTab) {
      case 'สต็อกคงเหลือ':
        headers = [
          'คลัง',
          'สินค้า',
          'หน่วย',
          'คงเหลือ',
          'เกณฑ์ต่ำสุด',
          'สถานะ',
        ];
        dataRows = rows.map((r: any) => [
          r.warehouse,
          r.product,
          r.unit,
          r.quantity,
          r.threshold,
          r.low ? 'ต่ำกว่ากำหนด' : 'ปกติ',
        ]);
        break;
      case 'รับเข้า':
        headers = [
          'เลขที่รับเข้า',
          'คลัง',
          'ผู้จัดจำหน่าย',
          'วันที่',
          'สถานะ',
          'จำนวนรายการ',
          'รวมจำนวน',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.warehouse,
          r.supplier,
          r.date,
          r.status,
          r.itemsCount,
          r.totalQty,
        ]);
        break;
      case 'เบิกสินค้า':
        headers = [
          'เลขที่เบิก',
          'จากคลัง',
          'ไปยัง',
          'ผู้รับ',
          'วันที่',
          'สถานะ',
          'จำนวนรายการ',
          'รวมจำนวน',
          'รวมค่าใช้จ่าย',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.from,
          r.to,
          r.recipient,
          r.date,
          r.status,
          r.itemsCount,
          r.totalQty,
          r.expensesTotal,
        ]);
        break;
      case 'โอนย้าย':
        headers = [
          'เลขที่โอนย้าย',
          'จากคลัง',
          'ไปยัง',
          'วันที่',
          'สถานะ',
          'จำนวนรายการ',
          'รวมจำนวน',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.from,
          r.to,
          r.date,
          r.status,
          r.itemsCount,
          r.totalQty,
        ]);
        break;
      case 'ปรับปรุง Stock':
        headers = [
          'เลขที่ปรับปรุง',
          'คลัง',
          'วันที่',
          'สถานะ',
          'จำนวนรายการ',
          'ผลรวมปรับปรุง',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.warehouse,
          r.date,
          r.status,
          r.itemsCount,
          r.totalDelta,
        ]);
        break;
      case 'คืนสินค้า':
        headers = [
          'เลขที่คืน',
          'จากคลัง',
          'ไปยัง',
          'วันที่',
          'สถานะ',
          'จำนวนรายการ',
          'รวมจำนวน',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.from,
          r.to,
          r.date,
          r.status,
          r.itemsCount,
          r.totalQty,
        ]);
        break;
      case 'ภาคสนาม':
        headers = ['รหัสงาน', 'ลูกค้า', 'วันที่รายงาน', 'สถานะ'];
        dataRows = rows.map((r: any) => [
          r.id,
          r.customer,
          r.reportDate,
          r.status,
        ]);
        break;
      case 'ใบแจ้งหนี้':
        headers = [
          'เลขที่ใบแจ้งหนี้',
          'ลูกค้า',
          'วันที่ออก',
          'กำหนดชำระ',
          'สถานะ',
          'ยอดรวม',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.customer,
          r.issuedAt,
          r.dueAt,
          r.status,
          r.total,
        ]);
        break;
      case 'ใบเสร็จรับเงิน':
        headers = [
          'เลขที่ใบเสร็จ',
          'เลขที่ใบแจ้งหนี้',
          'ลูกค้า',
          'วันที่ชำระ',
          'จำนวนเงิน',
          'วิธีชำระ',
        ];
        dataRows = rows.map((r: any) => [
          r.id,
          r.invoiceId,
          r.customer,
          r.paidAt,
          r.amount,
          r.method,
        ]);
        break;
      case 'ลูกค้า':
        headers = ['รหัสลูกค้า', 'ชื่อ', 'ประเภท', 'วันที่สร้าง'];
        dataRows = rows.map((r: any) => [r.id, r.name, r.type, r.createdAt]);
        break;
    }
    const csv = [
      headers.map(escape).join(','),
      ...dataRows.map((row) => row.map(escape).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${activeTab}-report.csv`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (activeTab === 'สต็อกคงเหลือ') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    คลัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สินค้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    หน่วย
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    คงเหลือ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    เกณฑ์ต่ำสุด
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={`${r.warehouse}-${r.product}`}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.warehouse}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.product}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.threshold}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {r.low ? (
                        <StatusBadge status={Status.Failed} />
                      ) : (
                        <StatusBadge status={Status.Approved} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'รับเข้า') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่รับเข้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    คลัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ผู้จัดจำหน่าย
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    จำนวนรายการ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    รวมจำนวน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.warehouse}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.supplier}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.totalQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'เบิกสินค้า') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่เบิก
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    จากคลัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ไปยัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ผู้รับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    จำนวนรายการ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    รวมจำนวน
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    รวมค่าใช้จ่าย
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.from}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.to}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.recipient}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.totalQty}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.expensesTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'โอนย้าย') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่โอนย้าย
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    จากคลัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ไปยัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    จำนวนรายการ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    รวมจำนวน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.from}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.to}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.totalQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'ปรับปรุง Stock') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่ปรับปรุง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    คลัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    จำนวนรายการ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    ผลรวมปรับปรุง
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.warehouse}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.totalDelta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'คืนสินค้า') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่คืน
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    จากคลัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ไปยัง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    จำนวนรายการ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    รวมจำนวน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.from}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.to}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.totalQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'ภาคสนาม') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    รหัสงาน
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่รายงาน
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.customer}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.reportDate}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'ใบแจ้งหนี้') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่ใบแจ้งหนี้
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่ออก
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    กำหนดชำระ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    ยอดรวม
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.customer}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.issuedAt}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.dueAt}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'ใบเสร็จรับเงิน') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่ใบเสร็จ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    เลขที่ใบแจ้งหนี้
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่ชำระ
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase">
                    จำนวนเงิน
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วิธีชำระ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.invoiceId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.customer}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.paidAt}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {r.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </Card>
      );
    }

    if (activeTab === 'ลูกค้า') {
      return (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    รหัสลูกค้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ชื่อลูกค้า
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    ประเภท
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    วันที่สร้าง
                  </th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {r.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {r.createdAt}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button
                        onClick={() => handleViewCustomer(r.id)}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold"
                      >
                        ดูรายละเอียด
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
          <CustomerDetailsModal
            isOpen={isCustDetailsOpen}
            onClose={() => setIsCustDetailsOpen(false)}
            customer={selectedCustomer}
          />
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">รายงาน</h1>
          <p className="mt-1 text-slate-600">
            แยกรายงานตามหมวดหมู่และแสดงในรูปแบบตาราง
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56">
            <Input
              type="search"
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="w-44">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              title="ตั้งแต่วันที่"
            />
          </div>
          <div className="w-44">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              title="ถึงวันที่"
            />
          </div>
          <div className="w-56">
            <Select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setCurrentPage(1);
              }}
              title="กรองคลัง"
            >
              <option value="">ทุกคลัง</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={exportCsv}
            className="px-3 py-2 rounded-lg bg-primary text-white font-semibold"
          >
            ส่งออก CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <Button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === tab ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            variant="ghost"
          >
            {tab}
          </Button>
        ))}
      </div>

      {renderTable()}
    </div>
  );
};

export default Reports;
