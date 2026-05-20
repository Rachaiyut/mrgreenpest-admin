import React, { useState, useMemo, useRef, useEffect } from 'react';
import Swal from '@/src/utils/swal';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TruncateText } from '../../components/common/TruncateText';
import { formatThaiDate } from '../../utils/date';
import { formatPhoneNumber } from '../../utils/format';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import {
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  LoadingIcon,
  CheckCircleIcon,
} from '../../assets/icons/Icons';
import { CustomerApi } from '../../api/customer';
import { Pagination } from '../../components/common/Pagination';
import { Invoice } from '../../types';
import { InvoiceStatus, InvoiceStatusLabel, InvoiceStatusColor } from '../../types/enums/invoice';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { useData } from '../../contexts/DataContext';
import { InvoiceApi } from '../../api/invoice';
import { AccountApi } from '../../api/account';
import { Account } from '@/src/types/entity/account.interface';
import { usePermissions } from '../../hooks/usePermissions';
import { useNotificationFocus } from '../../hooks/useNotificationFocus';
import { renderApprovalDetails, joinName, pickName } from '../../utils/approvalSwal';
import { InvoiceModal } from '@/src/components/features/invoices/InvoiceModal';
import { RecordPaymentModal } from '@/src/components/features/invoices/RecordPaymentModal';

interface InvoicesPageProps {
  onCreateInvoice?: (data: Omit<Invoice, 'id'>) => void | Promise<void>;
  onUpdateInvoice?: (updated: Invoice) => void | Promise<void>;
  onDeleteInvoice?: (id: string) => void | Promise<void>;
}

const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
}) => {
  const { invoices, customers, fetchData } = useData();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchData(['invoices', 'customers', 'quotations']);
      } catch (error) {
        console.error('Failed to fetch invoice data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const [invoicePage, setInvoicePage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceItemsPerPage, setInvoiceItemsPerPage] = useState(10);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    'ทั้งหมด' | InvoiceStatus
  >('ทั้งหมด');
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isInvoiceEditModalOpen, setIsInvoiceEditModalOpen] = useState(false);
  const [isInvoiceDeleteModalOpen, setIsInvoiceDeleteModalOpen] =
    useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceInitialValues, setInvoiceInitialValues] = useState<
    Partial<Invoice> | undefined
  >(undefined);

  const [openInvoiceDropdownId, setOpenInvoiceDropdownId] = useState<
    string | null
  >(null);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);
  const [invoiceDropdownPosition, setInvoiceDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // ===== New approval-flow state =====
  const { hasPermission } = usePermissions();
  const [activeAccounts, setActiveAccounts] = useState<Account[]>([]);

  // Fetch active accounts on mount (used in admin-approve Swal dropdown)
  // ใช้ pattern เดียวกับหน้ารายการเบิก (Issue.tsx) — fetch ทั้งหมดแล้ว filter ฝั่งหน้าบ้าน
  useEffect(() => {
    AccountApi.getAll({ limit: 100, page: 1 })
      .then((res) => {
        const accounts = (res?.data || []).filter((a) => a.is_active);
        setActiveAccounts(accounts);
      })
      .catch(() => setActiveAccounts([]));
  }, []);

  const invoiceData = invoices || [];

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchQuery.trim().toLowerCase();
    const start = invoiceStartDate ? new Date(invoiceStartDate) : null;
    const end = invoiceEndDate ? new Date(invoiceEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const custPhoneMap = new Map(
      (customers || []).map((c) => [c.id, [c.primary_phone].filter(Boolean).join('')])
    );

    let result = invoiceData;

    // 1. Search
    if (q) {
      result = result.filter((item) => {
        const phone = custPhoneMap.get(item.customer_id) || '';
        return (
          item.id.toLowerCase().includes(q) ||
          item.customer_name.toLowerCase().includes(q) ||
          phone.includes(q)
        );
      });
    }

    // 2. Status Filter
    if (invoiceStatusFilter !== 'ทั้งหมด') {
      result = result.filter((i) => i.status === invoiceStatusFilter);
    }

    // 3. Date Filter (using issuedAt)
    if (start || end) {
      result = result.filter((item) => {
        const d = new Date(item.issued_at);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    return result;
  }, [
    invoiceData,
    invoiceSearchQuery,
    invoiceStatusFilter,
    invoiceStartDate,
    invoiceEndDate,
    customers,
  ]);

  const totalInvoiceItems = filteredInvoices.length;
  const paginatedInvoices = useMemo(
    () =>
      filteredInvoices.slice(
        (invoicePage - 1) * invoiceItemsPerPage,
        invoicePage * invoiceItemsPerPage
      ),
    [filteredInvoices, invoicePage, invoiceItemsPerPage]
  );

  const invoiceStats = useMemo(() => {
    const total = invoiceData.length;
    const pending = invoiceData.filter(
      (i) => i.status === InvoiceStatus.PENDING
    ).length;
    const paid = invoiceData.filter(
      (i) => i.status === InvoiceStatus.PAID
    ).length;
    const overdue = invoiceData.filter(
      (i) => i.status === InvoiceStatus.OVERDUE
    ).length;
    const totalValue = invoiceData.reduce(
      (sum, i) => sum + (Number(i.total) || 0),
      0
    );
    const pendingValue = invoiceData
      .filter(
        (i) =>
          (i.status === InvoiceStatus.PENDING ||
          i.status === InvoiceStatus.OVERDUE) &&
          !(i as unknown as Record<string, unknown>).carried_over_to_id
      )
      .reduce((sum, i) => sum + ((Number(i.total) || 0) - (Number((i as unknown as Record<string, number>).paid_amount) || 0)), 0);

    return { total, pending, paid, overdue, totalValue, pendingValue };
  }, [invoiceData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openInvoiceDropdownId &&
        invoiceDropdownRef.current &&
        !invoiceDropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[data-invoice-id]')
      ) {
        setOpenInvoiceDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openInvoiceDropdownId]);

  const handleInvoiceItemsPerPageChange = (size: number) => {
    setInvoiceItemsPerPage(size);
    setInvoicePage(1);
  };

  const handleInvoiceDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
    invoice: Invoice
  ) => {
    event.stopPropagation();
    if (openInvoiceDropdownId === id) {
      setOpenInvoiceDropdownId(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setSelectedInvoice(invoice);
      setOpenInvoiceDropdownId(id);
      setInvoiceDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX,
      });
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceEditModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const handleViewPdf = async (invoice: Invoice) => {
    setPdfLoadingId(invoice.id);
    try {
      const blob = await InvoiceApi.exportPdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to view PDF', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการเปิด PDF' });
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsInvoiceDeleteModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };

  const confirmDeleteInvoice = () => {
    if (invoiceToDelete && onDeleteInvoice) onDeleteInvoice(invoiceToDelete.id);
    setIsInvoiceDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  // ===== Approval flow handlers =====

  const handleAdminApprove = async (invoice: Invoice) => {
    setOpenInvoiceDropdownId(null);

    if (activeAccounts.length === 0) {
      Swal.fire('ไม่พบบัญชี', 'ยังไม่มีบัญชีที่เปิดใช้งานในระบบ', 'warning');
      return;
    }

    const amount = Number(invoice.total || 0).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const customer = customers?.find((x) => x.id === invoice.customer_id);
    const customerName = (() => {
      if (customer) {
        const lookup = pickName(joinName(customer.first_name, customer.last_name), (customer as any).nickname, (customer as any).code);
        if (lookup) return lookup;
      }
      // Fallback to the snapshot stored on the invoice itself when customer isn't
      // loaded in DataContext (e.g. archived/inactive customer).
      return invoice.customer_name || '-';
    })();
    const issueDate = invoice.issued_at
      ? new Date(invoice.issued_at).toLocaleDateString('th-TH')
      : '-';
    const dueDate = invoice.due_at
      ? new Date(invoice.due_at).toLocaleDateString('th-TH')
      : '-';

    const isIndividual = customer?.type === 'INDIVIDUAL';

    const detailsHtml = renderApprovalDetails([
      { label: 'เลขที่ใบแจ้งหนี้', value: invoice.code || null },
      { label: 'ลูกค้า', value: customerName },
      { label: 'วันที่ออก', value: issueDate },
      { label: 'ครบกำหนด', value: dueDate },
      { label: 'ยอดรวม', value: `${amount} บาท`, accent: 'money' },
    ]);

    const accountOptionsHtml = activeAccounts
      .map((acc) => `<option value="${acc.id}">${acc.bank_name} ${acc.account_number} (${acc.account_name})</option>`)
      .join('');

    const taxInvoiceSectionHtml = isIndividual
      ? `
        <div style="border-top:1px solid #e5e7eb; margin-top:14px; padding-top:12px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;">
            <input id="chkTI" type="checkbox" style="width:18px; height:18px; accent-color:#10b981;" />
            <span style="font-size:15px; font-weight:600; color:#334155;">ออกใบกำกับภาษีด้วย</span>
          </label>
          <div id="tiFields" style="display:none; margin-top:10px; padding:14px; background:#f8fafc; border-radius:8px;">
            <div style="font-size:14px; color:#64748b; margin-bottom:10px;">กรอกข้อมูลที่จะแสดงในใบกำกับภาษี</div>
            <div style="margin-bottom:10px;">
              <label style="font-size:15px; font-weight:600; color:#334155; display:block; margin-bottom:5px;">ชื่อ / บริษัท</label>
              <input id="tiName" type="text" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:15px; background:#fff;" placeholder="ชื่อ-นามสกุล หรือ บริษัท ..." />
            </div>
            <div style="margin-bottom:10px;">
              <label style="font-size:15px; font-weight:600; color:#334155; display:block; margin-bottom:5px;">ที่อยู่</label>
              <textarea id="tiAddress" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:15px; background:#fff; min-height:80px; resize:vertical; font-family:inherit;" placeholder="ที่อยู่ตามใบกำกับภาษี"></textarea>
            </div>
            <div>
              <label style="font-size:15px; font-weight:600; color:#334155; display:block; margin-bottom:5px;">เลขประจำตัวผู้เสียภาษี</label>
              <input id="tiTaxId" type="text" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:15px; background:#fff;" placeholder="0-0000-00000-00-0" />
            </div>
          </div>
        </div>
      `
      : '';

    const r = await Swal.fire({
      icon: 'question',
      title: 'ตรวจสอบรายรับ',
      width: 600,
      html: `
        <div style="box-sizing:border-box; width:100%; text-align:left;">
          ${detailsHtml}
          <div style="font-size:14px; color:#64748b; margin-top:14px; line-height:1.6;">
            เลือกบัญชีที่ลูกค้าโอนเงินเข้าหรือรับเงินสด
          </div>
          <select id="accountSelect" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:15px; background:#fff; margin-top:6px;">
            <option value="">เลือกบัญชี</option>
            ${accountOptionsHtml}
          </select>
          ${taxInvoiceSectionHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ส่งฝ่ายบัญชี',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      didOpen: () => {
        const chk = document.getElementById('chkTI') as HTMLInputElement | null;
        const fields = document.getElementById('tiFields') as HTMLDivElement | null;
        if (chk && fields) {
          chk.addEventListener('change', () => {
            fields.style.display = chk.checked ? 'block' : 'none';
          });
        }
      },
      preConfirm: () => {
        const accSel = document.getElementById('accountSelect') as HTMLSelectElement | null;
        const accountId = accSel?.value || '';
        if (!accountId) {
          Swal.showValidationMessage('กรุณาเลือกบัญชีรับเข้า');
          return false;
        }
        const chk = document.getElementById('chkTI') as HTMLInputElement | null;
        if (chk?.checked) {
          const name = (document.getElementById('tiName') as HTMLInputElement)?.value?.trim() || '';
          const address = (document.getElementById('tiAddress') as HTMLTextAreaElement)?.value?.trim() || '';
          const taxId = (document.getElementById('tiTaxId') as HTMLInputElement)?.value?.trim() || '';
          if (!name || !address || !taxId) {
            Swal.showValidationMessage('กรอกข้อมูลใบกำกับภาษีให้ครบ (ชื่อ / ที่อยู่ / เลขประจำตัวผู้เสียภาษี)');
            return false;
          }
          return { accountId, taxInvoice: { name, address, tax_id: taxId } };
        }
        return { accountId, taxInvoice: undefined };
      },
    });

    if (!r.isConfirmed || !r.value) return;
    const { accountId, taxInvoice } = r.value as {
      accountId: string;
      taxInvoice?: { name: string; address: string; tax_id: string };
    };

    try {
      await InvoiceApi.adminApprove(invoice.id, accountId, taxInvoice);
      await fetchData(['invoices']);
      Swal.fire({
        icon: 'success',
        title: 'ส่งฝ่ายบัญชีแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถส่งฝ่ายบัญชีได้', 'error');
    }
  };

  const handleAccountingApprove = async (invoice: Invoice) => {
    setOpenInvoiceDropdownId(null);
    const amountStr = Number(invoice.total || 0).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const customerName = (() => {
      const c = customers?.find((x) => x.id === invoice.customer_id);
      if (c) {
        const lookup = pickName(joinName(c.first_name, c.last_name), (c as any).nickname, (c as any).code);
        if (lookup) return lookup;
      }
      // Fallback to invoice's snapshot when customer is missing in DataContext
      return invoice.customer_name || '-';
    })();

    // ดึงบัญชีที่ admin เลือกไว้ตอน step 1 (admin-approve)
    let currentAccountId = '';
    try {
      const res = await InvoiceApi.getById(invoice.id) as unknown as Record<string, unknown>;
      // ResponseService wraps body — unwrap if needed
      const data = (res?.data as Record<string, unknown> | undefined) || res;
      const payments = (Array.isArray(data?.payments) ? data.payments : []) as Array<{
        created_at?: string;
        admin_approved_at?: string;
        account_id?: string | null;
      }>;
      // หา payment ที่มี account_id ก่อน (admin เลือกไว้แล้ว) — ถ้าไม่เจอ ใช้ตัวล่าสุด
      const withAccount = [...payments]
        .filter((p) => !!p?.account_id)
        .sort((a, b) =>
          new Date(b.admin_approved_at || b.created_at || 0).getTime()
          - new Date(a.admin_approved_at || a.created_at || 0).getTime(),
        )[0];
      const latest = withAccount || [...payments].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      )[0];
      currentAccountId = String(latest?.account_id || '');
    } catch {
      currentAccountId = '';
    }

    if (activeAccounts.length === 0) {
      Swal.fire('ไม่พบบัญชี', 'ยังไม่มีบัญชีที่เปิดใช้งานในระบบ', 'warning');
      return;
    }

    const accountOptionsHtml = activeAccounts
      .map((acc) => {
        const selected = acc.id === currentAccountId ? 'selected' : '';
        return `<option value="${acc.id}" ${selected}>${acc.bank_name} ${acc.account_number} (${acc.account_name})</option>`;
      })
      .join('');

    const currentAccount = activeAccounts.find((a) => a.id === currentAccountId);
    const currentAccountLabel = currentAccount
      ? `${currentAccount.bank_name} ${currentAccount.account_number} (${currentAccount.account_name})`
      : '— ยังไม่ระบุ —';

    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันอนุมัติรายรับ',
      width: 600,
      html: `
        <div style="box-sizing:border-box; width:100%; text-align:left;">
          ${renderApprovalDetails([
            { label: 'เลขที่ใบแจ้งหนี้', value: invoice.code || null },
            { label: 'ลูกค้า', value: customerName },
            { label: 'ยอดรวม', value: `${amountStr} บาท`, accent: 'money' },
          ])}
          <div style="margin-top:14px; padding:10px 12px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
            <div style="font-size:13px; color:#64748b; margin-bottom:4px;">บัญชีรับเข้าที่บันทึกไว้</div>
            <div style="font-size:15px; font-weight:600; color:#1e293b;">${currentAccountLabel}</div>
          </div>
          <div style="font-size:14px; color:#64748b; margin-top:14px; line-height:1.6;">
            เลือกบัญชีรับเข้า
          </div>
          <select id="accountSelect" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:15px; background:#fff; margin-top:6px;">
            ${accountOptionsHtml}
          </select>
          <div style="margin-top:12px;font-size:13px;color:#64748b;text-align:center;">
            ระบบจะออกใบเสร็จและบันทึกเงินเข้าบัญชีอัตโนมัติ
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติรายรับ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const sel = document.getElementById('accountSelect') as HTMLSelectElement | null;
        const accountId = sel?.value || '';
        if (!accountId) {
          Swal.showValidationMessage('กรุณาเลือกบัญชีรับเข้า');
          return false;
        }
        return { accountId };
      },
    });
    if (!r.isConfirmed) return;
    const chosenAccountId = (r.value as { accountId?: string })?.accountId || currentAccountId;
    try {
      await InvoiceApi.accountingApprove(invoice.id, chosenAccountId || undefined);
      await fetchData(['invoices']);
      Swal.fire({
        icon: 'success',
        title: 'อนุมัติรายรับแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถอนุมัติได้', 'error');
    }
  };

  const handleRejectApproval = async (invoice: Invoice) => {
    setOpenInvoiceDropdownId(null);
    const r = await Swal.fire({
      icon: 'warning',
      title: 'ปฏิเสธรายรับ',
      input: 'textarea',
      inputLabel: 'เหตุผลการปฏิเสธ',
      inputPlaceholder: 'กรอกเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (!r.isConfirmed || !r.value) return;
    try {
      await InvoiceApi.reject(invoice.id, r.value.trim());
      await fetchData(['invoices']);
      Swal.fire({
        icon: 'success',
        title: 'ปฏิเสธแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถปฏิเสธได้', 'error');
    }
  };

  // Auto-open approval flow when navigating from a notification click
  useNotificationFocus('approve', true, async (focusId) => {
    let target: Invoice | undefined = invoices.find((inv) => inv.id === focusId);
    if (!target) {
      try {
        target = await InvoiceApi.getById(focusId);
      } catch {
        Swal.fire('ไม่พบใบแจ้งหนี้', 'อาจถูกลบหรือคุณไม่มีสิทธิ์เข้าถึง', 'error');
        return;
      }
    }
    if (!target) return;
    if (target.status === InvoiceStatus.PENDING_REVIEW) {
      handleAdminApprove(target);
    } else if (target.status === InvoiceStatus.PENDING_ACCOUNTING_REVIEW) {
      handleAccountingApprove(target);
    } else {
      Swal.fire('ใบแจ้งหนี้ไม่ได้อยู่ในสถานะรออนุมัติ', `สถานะปัจจุบัน: ${InvoiceStatusLabel[target.status as InvoiceStatus] || target.status}`, 'info');
    }
  });

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">ใบแจ้งหนี้</h1>
          <p className="mt-1 text-slate-600">จัดการใบแจ้งหนี้ทั้งหมด</p>
        </div>
        <Button
          onClick={() => {
            setInvoiceInitialValues(undefined);
            setIsAddInvoiceModalOpen(true);
          }}
        >
          <PlusIcon className="h-5 w-5" />
          สร้างใบแจ้งหนี้
        </Button>
      </div>

      {/* Invoice Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">ทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-800">
                {invoiceStats.total}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-600 font-medium">รอชำระ</p>
              <p className="text-2xl font-bold text-amber-800">
                {invoiceStats.pending}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">เกินกำหนด</p>
              <p className="text-2xl font-bold text-red-800">
                {invoiceStats.overdue}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">ยอดค้างชำระ</p>
              <p className="text-lg font-bold text-purple-800">
                {invoiceStats.pendingValue.toLocaleString('th-TH', {
                  minimumFractionDigits: 0,
                })}{' '}บาท
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-80 flex-shrink-0">
            <Input
              type="search"
              placeholder="ค้นหาเลขที่ใบแจ้งหนี้, ชื่อลูกค้า"
              value={invoiceSearchQuery}
              onChange={(e) => {
                setInvoiceSearchQuery(e.target.value);
                setInvoicePage(1);
              }}
              className="w-full pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DatePicker selected={invoiceStartDate ? new Date(invoiceStartDate) : null} onChange={(date: Date | null) => setInvoiceStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="วันที่เริ่มต้น" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-40" />
            <span className="text-slate-400">-</span>
            <DatePicker selected={invoiceEndDate ? new Date(invoiceEndDate) : null} onChange={(date: Date | null) => setInvoiceEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="วันที่สิ้นสุด" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-40" />
          </div>
          <div className="w-full sm:w-48">
            <DropdownSelect
              value={invoiceStatusFilter}
              onChange={(val) => {
                const v = val as 'ทั้งหมด' | InvoiceStatus;
                setInvoiceStatusFilter(v);
                setInvoicePage(1);
              }}
              className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
              placeholder="สถานะทั้งหมด"
              options={[
                { value: 'ทั้งหมด', label: 'สถานะทั้งหมด' },
                { value: 'DRAFT', label: 'ร่าง' },
                { value: 'PENDING', label: 'รอชำระ' },
                { value: 'SENT', label: 'ส่งแล้ว' },
                { value: 'PENDING_REVIEW', label: 'รอตรวจสอบ' },
                { value: 'PENDING_ACCOUNTING_REVIEW', label: 'รอบัญชีอนุมัติ' },
                { value: 'PAID', label: 'ชำระแล้ว' },
                { value: 'PARTIAL', label: 'ชำระบางส่วน' },
                { value: 'OVERDUE', label: 'เกินกำหนด' },
                { value: 'CANCELLED', label: 'ยกเลิก' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto flex-1 relative">
          <table className="min-w-[900px] w-full divide-y divide-slate-200 border-b border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ลำดับ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  เลขที่ใบแจ้งหนี้
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  งวดที่
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ครั้งที่
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ชื่อลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  เบอร์โทรศัพท์
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ประเภทลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ครบกำหนดชำระ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ยอดรวม
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-0 border-b-0 h-0">
                    <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                      <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                      <p className="text-base font-medium">กำลังโหลดข้อมูลใบแจ้งหนี้...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-0 border-b-0 h-0">
                    <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                      <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">ไม่พบข้อมูลใบแจ้งหนี้</p>
                      <p className="text-sm mt-1">
                        ลองปรับตัวกรองหรือสร้างใบแจ้งหนี้ใหม่
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((i, index) => {
                  const customer =
                    i.customer || customers?.find((c) => c.id === i.customer_id);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50 transition-colors [&>td]:align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                        {(invoicePage - 1) * invoiceItemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-bold text-primary cursor-pointer"
                        onClick={() => {
                          setSelectedInvoice(i);
                          setIsInvoiceModalOpen(true);
                        }}
                      >
                        {i.code || i.id}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {i.term ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{i.term}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {(i as unknown as Record<string, number>).billing_count ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{(i as unknown as Record<string, number>).billing_count}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">
                        {customer
                          ? `${customer.first_name || ''}${customer.last_name && customer.last_name !== '-' ? ` ${customer.last_name}` : ''}`.trim()
                          : i.customer_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatPhoneNumber(customer?.primary_phone)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {customer?.type === 'CORPORATE' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
                            นิติบุคคล
                          </span>
                        ) : customer?.type === 'INDIVIDUAL' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                            บุคคลธรรมดา
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatThaiDate(i.due_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">
                        {Number(i.total).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}บาท
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${InvoiceStatusColor[i.status as InvoiceStatus] || 'bg-slate-100 text-slate-600'}`}>{InvoiceStatusLabel[i.status as InvoiceStatus] || i.status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <Button
                            variant="primary"
                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white flex flex-row items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all whitespace-nowrap min-w-[100px]"
                            onClick={() => handleViewPdf(i)}
                            disabled={pdfLoadingId === i.id}
                            title="ดู PDF"
                          >
                            {pdfLoadingId === i.id ? (
                              <span className="flex items-center gap-2">
                                <LoadingIcon className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
                                <span>กำลังโหลด...</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <EyeIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>ดู PDF</span>
                              </span>
                            )}
                          </Button>
                          <Button
                            data-invoice-id={i.id}
                            onClick={(e) =>
                              handleInvoiceDropdownToggle(e, i.id, i)
                            }
                            variant="icon"
                            title="ตัวเลือก"
                          >
                            <span className="sr-only">Open options</span>
                            <ManageIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto border-t border-slate-200">
          <Pagination
            currentPage={invoicePage}
            totalItems={totalInvoiceItems}
            itemsPerPage={invoiceItemsPerPage}
            onPageChange={setInvoicePage}
            onItemsPerPageChange={handleInvoiceItemsPerPageChange}
          />
        </div>
      </div>

      {openInvoiceDropdownId && invoiceDropdownPosition && (
        <div
          ref={invoiceDropdownRef}
          style={{
            position: 'absolute',
            top: `${invoiceDropdownPosition.top}px`,
            left: `${invoiceDropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-60 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-30 border border-slate-100 overflow-hidden whitespace-nowrap"
        >
          <div className="py-1">
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              onClick={() => handleViewInvoice(selectedInvoice!)}
            >
              <EyeIcon className="w-4 h-4 text-slate-400" /> ดูรายละเอียด
            </button>

            {/* ===== Approval flow actions ===== */}
            {selectedInvoice?.status === InvoiceStatus.PENDING_REVIEW &&
              hasPermission('APPROVE_INVOICE') && (
                <button
                  className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                  onClick={() => handleAdminApprove(selectedInvoice)}
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> ตรวจสอบรายรับ
                </button>
              )}

            {selectedInvoice?.status === InvoiceStatus.PENDING_ACCOUNTING_REVIEW &&
              hasPermission('APPROVE_RECEIPT') && (
                <button
                  className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                  onClick={() => handleAccountingApprove(selectedInvoice)}
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> อนุมัติรายรับ
                </button>
              )}

            {selectedInvoice &&
              (selectedInvoice.status === InvoiceStatus.PENDING_REVIEW ||
                selectedInvoice.status === InvoiceStatus.PENDING_ACCOUNTING_REVIEW) &&
              (hasPermission('APPROVE_INVOICE') || hasPermission('APPROVE_RECEIPT')) && (
                <button
                  className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors"
                  onClick={() => handleRejectApproval(selectedInvoice)}
                >
                  <TrashIcon className="w-4 h-4 text-orange-500" /> ปฏิเสธรายรับ
                </button>
              )}

            {selectedInvoice?.status === InvoiceStatus.PENDING && (
              <button
                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                onClick={() => handleEditInvoice(selectedInvoice!)}
              >
                <PencilIcon className="w-4 h-4 text-slate-400" /> แก้ไข
              </button>
            )}

            {selectedInvoice &&
              selectedInvoice.status !== InvoiceStatus.PAID &&
              selectedInvoice.status !== InvoiceStatus.CANCELLED &&
              selectedInvoice.status !== InvoiceStatus.CARRIED_OVER &&
              selectedInvoice.status !== InvoiceStatus.PENDING_ACCOUNTING_REVIEW && (
                <button
                  className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                  onClick={() => {
                    setInvoiceForPayment(selectedInvoice);
                    setIsRecordPaymentOpen(true);
                    setOpenInvoiceDropdownId(null);
                  }}
                >
                  <CurrencyDollarIcon className="w-4 h-4 text-blue-500" /> แนบหลักฐานการชำระเงิน
                </button>
              )}

            <button
              className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors"
              onClick={async () => {
                if (!selectedInvoice?.customer_id) return;
                try {
                  const response = await CustomerApi.generatePortalToken(selectedInvoice.customer_id);
                  const portalUrl = `${window.location.origin}/portal?token=${response.token}`;
                  await navigator.clipboard.writeText(portalUrl);
                  Swal.fire({ title: 'คัดลอกสำเร็จ!', text: 'คัดลอกลิงก์ Portal สำหรับลูกค้าเรียบร้อยแล้ว', icon: 'success', timer: 2000, timerProgressBar: true, confirmButtonColor: '#3085d6' });
                } catch {
                  Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างลิงก์ Portal ได้', icon: 'error', confirmButtonColor: '#d33' });
                }
                setOpenInvoiceDropdownId(null);
              }}
            >
              <DocumentTextIcon className="w-4 h-4 text-green-500" /> ส่ง Link Portal ลูกค้า
            </button>
            <hr className="my-1 border-slate-100" />
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
              onClick={() => handleDeleteInvoice(selectedInvoice!)}
            >
              <TrashIcon className="w-4 h-4 text-red-500" /> ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modals */}
      <InvoiceModal
        isOpen={isAddInvoiceModalOpen}
        onClose={() => setIsAddInvoiceModalOpen(false)}
        mode='create'
        initialValues={invoiceInitialValues}
        onSubmit={async (data) => {
          if (onCreateInvoice) {
            await onCreateInvoice(data);
            setIsAddInvoiceModalOpen(false);
          }
        }}
      />
      
      <InvoiceModal
        isOpen={isInvoiceEditModalOpen}
        onClose={() => setIsInvoiceEditModalOpen(false)}
        mode="edit"
        initialValues={selectedInvoice}
        onSubmit={async (data) => {
          if (onUpdateInvoice) {
            await onUpdateInvoice({ ...selectedInvoice, ...data });
          } else if (selectedInvoice) {
            await InvoiceApi.update(selectedInvoice.id, { ...selectedInvoice, ...data } as Partial<Invoice>);
          }
          await fetchData(['invoices']);
          setIsInvoiceEditModalOpen(false);
        }}
      />

      <ConfirmationModal
        isOpen={isInvoiceDeleteModalOpen}
        onClose={() => setIsInvoiceDeleteModalOpen(false)}
        onConfirm={confirmDeleteInvoice}
        title="ยืนยันการยกเลิกใบแจ้งหนี้"
        message={`คุณต้องการยกเลิกใบแจ้งหนี้ ${invoiceToDelete?.code || invoiceToDelete?.id} ใช่หรือไม่?`}
        confirmButtonText="ยกเลิกใบแจ้งหนี้"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        mode="detail"
        initialValues={selectedInvoice}
        onSubmit={async () => {
          // detail mode: read-only, ไม่มีการบันทึก
        }}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setInvoiceForPayment(null);
        }}
        invoice={invoiceForPayment}
        onSuccess={() => fetchData(['invoices'])}
      />

    </div>
    </div>
  );
};

export default InvoicesPage;
