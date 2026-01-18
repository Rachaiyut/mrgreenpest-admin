import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import type { FC, Dispatch, SetStateAction } from 'react';
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { CreateQuotationPage } from './pages/financials/CreateQuotationPage';
import { EditQuotationPage } from './pages/financials/EditQuotationPage';
import { EditInvoicePage } from './pages/financials/EditInvoicePage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import {
  Page,
  Assessment,
  FieldJob,
  Status,
  Customer,
  Contract,
  Quotation,
  Product,
  User,
  Warehouse as WarehouseType,
  Supplier,
  GoodsReceipt as GoodsReceiptType,
  Withdrawal as WithdrawalType,
  Transfer as TransferType,
  StockAdjustment as StockAdjustmentType,
  ProductReturn as ProductReturnType,
  Invoice,
  Receipt,
  UserWallet,
  WalletTransaction,
  ReturnToSupplier as ReturnToSupplierType,
} from './types';
// FIX: The MOCK data constants were not all exported from constants.ts. They will be added and exported now.
import {
  MOCK_USERS,
  MOCK_WAREHOUSES,
  MOCK_SUPPLIERS,
  MOCK_CATEGORIES,
  MOCK_USER_WALLETS,
  MOCK_CUSTOMERS,
  MOCK_RETURN_TO_SUPPLIERS,
} from './constants';
import {
  MOCK_ASSESSMENTS,
  MOCK_FIELD_JOBS,
  MOCK_CONTRACTS,
  MOCK_QUOTATIONS,
  MOCK_PRODUCTS,
  MOCK_GOODS_RECEIPTS,
  MOCK_WITHDRAWALS,
  MOCK_TRANSFERS,
  MOCK_STOCK_ADJUSTMENTS,
  MOCK_PRODUCT_RETURNS,
  MOCK_INVOICES,
  MOCK_RECEIPTS,
} from './constants';
import { Category } from './api/master/categories';
const Dashboard = lazy(() => import('./pages/dashboard'));
const Customers = lazy(() => import('./pages/customers'));
const Assessments = lazy(() => import('./pages/assessments'));
const FieldOperations = lazy(() => import('./pages/field-operations'));
const Financials = lazy(() => import('./pages/financials'));
const Inventory = lazy(() => import('./pages/inventory/products'));
const Users = lazy(() => import('./pages/users'));
const Warehouse = lazy(() => import('./pages/warehouse'));
const GoodsReceipt = lazy(() => import('./pages/inventory/goods-receipt'));
const Suppliers = lazy(() => import('./pages/suppliers'));
const Withdrawals = lazy(() => import('./pages/inventory/withdrawals'));
const Transfers = lazy(() => import('./pages/inventory/transfers'));
const StockAdjustment = lazy(
  () => import('./pages/inventory/stock-adjustment')
);
const Returns = lazy(() => import('./pages/inventory/returns'));
const ReturnToSupplier = lazy(
  () => import('./pages/inventory/return-to-supplier')
);
const Packages = lazy(() => import('./pages/packages'));
const Categories = lazy(() => import('./pages/categories'));
const Reports = lazy(() => import('./pages/reports'));
const TotalIncome = lazy(() => import('./pages/reports/TotalIncomePage'));
const TaxInvoiceIncome = lazy(
  () => import('./pages/reports/TaxInvoiceIncomePage')
);
const MonthlySales = lazy(() => import('./pages/reports/MonthlySalesPage'));
const SalesSummary = lazy(() => import('./pages/reports/SalesSummaryPage'));
const IndirectExpenses = lazy(
  () => import('./pages/reports/IndirectExpensesPage')
);
const DailyCash = lazy(() => import('./pages/reports/DailyCashPage'));
const DirectExpenses = lazy(() => import('./pages/reports/DirectExpensesPage'));
const Notifications = lazy(() => import('./pages/notifications'));
const Login = lazy(() => import('./pages/login'));
const Forms = lazy(() => import('./pages/forms'));

const UnderDevelopment: FC<{ title: string }> = ({ title }) => (
  <div className="p-8">
    <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
    <p className="mt-2 text-slate-600">ส่วนนี้กำลังอยู่ในระหว่างการพัฒนา</p>
  </div>
);

const App: FC = () => {
  const PAGE_PATH: Record<Page, string> = {
    Dashboard: 'dashboard',
    ลูกค้า: 'customers',
    ใบประเมิน: 'assessments',
    ภาคสนาม: 'field-operations',
    ใบเสนอราคา: 'quotations',
    ใบแจ้งหนี้: 'billing',
    'ใบกำกับภาษี/ใบเสร็จรับเงิน': 'receipts',
    ฟอร์ม: 'forms',
    หมวดหมู่: 'categories',
    'สินค้า/บริการ': 'inventory',
    แพ็กเกจ: 'packages',
    คลังสินค้า: 'warehouse',
    ผู้จัดจำหน่าย: 'suppliers',
    รับเข้า: 'goods-receipt',
    'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย': 'withdrawals',
    โอนย้าย: 'transfers',
    'ปรับปรุง Stock': 'stock-adjustment',
    คืนสินค้า: 'returns',
    เบิกสินค้าคืนผู้จำหน่าย: 'return-to-supplier',
    ผู้ใช้งาน: 'users',
    จัดการบทบาท: 'roles',
    การแจ้งเตือน: 'notifications',
    รายงาน: 'reports',
    'ยอดขาย(รายเดือน)': 'reports/monthly-sales',
    'สรุปยอดขาย(รายเดือน)': 'reports/sales-summary',
    'รายงานรายได้ (รายเดือน)': 'reports/total-income',
    'รายได้ออกใบกำกับ(รายเดือน)': 'reports/tax-invoice-income',
    ค่าใช้จ่ายทางอ้อม: 'reports/indirect-expenses',
    บัญชีเงินสดรายวัน: 'reports/daily-cash',
    ค่าใช้จ่ายทางตรง: 'reports/direct-expenses',
  };
  const PATH_PAGE = Object.fromEntries(
    Object.entries(PAGE_PATH).map(([k, v]) => ['/' + v, k])
  ) as Record<string, Page>;
  const navigate = useNavigate();
  const location = useLocation();
  let currentPage: Page = PATH_PAGE[location.pathname] ?? 'Dashboard';
  // Handle sub-routes for sidebar highlighting
  if (!PATH_PAGE[location.pathname]) {
    if (location.pathname.startsWith('/quotations')) currentPage = 'ใบเสนอราคา';
    else if (location.pathname.startsWith('/billing'))
      currentPage = 'ใบแจ้งหนี้';
    else if (location.pathname.startsWith('/reports/monthly-sales'))
      currentPage = 'ยอดขาย(รายเดือน)';
    else if (location.pathname.startsWith('/reports/sales-summary'))
      currentPage = 'สรุปยอดขาย(รายเดือน)';
    else if (location.pathname.startsWith('/reports/tax-invoice-income'))
      currentPage = 'รายได้ออกใบกำกับ(รายเดือน)';
    else if (location.pathname.startsWith('/reports/indirect-expenses'))
      currentPage = 'ค่าใช้จ่ายทางอ้อม';
    else if (location.pathname.startsWith('/reports/daily-cash'))
      currentPage = 'บัญชีเงินสดรายวัน';
    else if (location.pathname.startsWith('/reports/direct-expenses'))
      currentPage = 'ค่าใช้จ่ายทางตรง';
    else if (location.pathname.startsWith('/receipts'))
      currentPage = 'ใบกำกับภาษี/ใบเสร็จรับเงิน';
    else if (location.pathname.startsWith('/customers')) currentPage = 'ลูกค้า';
    else if (location.pathname.startsWith('/forms')) currentPage = 'ฟอร์ม';
  }

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isAuthenticated') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const stored = localStorage.getItem('sidebarExpanded');
    if (stored !== null) {
      setSidebarOpen(stored === 'true');
    }
  }, []);

  const toggleSidebarState = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebarExpanded', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleLogin = useCallback((username: string, remember: boolean) => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('isAuthenticated', 'true');
      if (!remember) {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }
    } catch {}
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('isAuthenticated');
    } catch {}
  }, []);

  const goToReports = useCallback(
    (tab: string) => {
      try {
        localStorage.setItem('reportsDefaultTab', tab);
      } catch {}
      navigate('/reports');
    },
    [navigate]
  );

  // --- Centralized State ---
  const [assessments, setAssessments] =
    useState<Assessment[]>(MOCK_ASSESSMENTS);
  const [fieldJobs, setFieldJobs] = useState<FieldJob[]>(MOCK_FIELD_JOBS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [quotations, setQuotations] = useState<Quotation[]>(MOCK_QUOTATIONS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [warehouses, setWarehouses] =
    useState<WarehouseType[]>(MOCK_WAREHOUSES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [goodsReceipts, setGoodsReceipts] =
    useState<GoodsReceiptType[]>(MOCK_GOODS_RECEIPTS);
  const [withdrawals, setWithdrawals] =
    useState<WithdrawalType[]>(MOCK_WITHDRAWALS);
  const [transfers, setTransfers] = useState<TransferType[]>(MOCK_TRANSFERS);
  const [stockAdjustments, setStockAdjustments] = useState<
    StockAdjustmentType[]
  >(MOCK_STOCK_ADJUSTMENTS);
  const [productReturns, setProductReturns] =
    useState<ProductReturnType[]>(MOCK_PRODUCT_RETURNS);
  const [returnToSuppliers, setReturnToSuppliers] = useState<
    ReturnToSupplierType[]
  >(MOCK_RETURN_TO_SUPPLIERS);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);

  const [receipts, setReceipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [userWallets, setUserWallets] =
    useState<UserWallet[]>(MOCK_USER_WALLETS);
  const [warehouseStocks, setWarehouseStocks] = useState<
    Record<string, Record<string, number>>
  >(() => {
    const nameToId = new Map(MOCK_WAREHOUSES.map((w) => [w.name, w.id]));
    const initial: Record<string, Record<string, number>> = {};
    for (const p of MOCK_PRODUCTS) {
      const whId = nameToId.get(p.warehouse);
      if (!whId) continue;
      if (!initial[whId]) initial[whId] = {};
      initial[whId][p.id] = (initial[whId][p.id] || 0) + (p.stock || 0);
    }
    return initial;
  });

  // --- Handler Functions ---
  const createHandler =
    <T extends { id: string }>(
      setter: Dispatch<SetStateAction<T[]>>,
      prefix: string,
      padLength: number = 4
    ) =>
    (data: Omit<T, 'id'>) => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
        .toString()
        .slice(-2);
      const id = `${prefix.toUpperCase()}${prefix.includes('GR') || prefix.includes('SR') || prefix.includes('IT') || prefix.includes('SA') || prefix.includes('RT') ? thaiYearLastTwoDigits : ''}-${String(Date.now()).slice(-6)}`;
      setter((prev) => [...prev, { ...data, id } as T]);
    };

  const updateHandler =
    <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) =>
    (updatedItem: T) => {
      setter((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
    };

  const deleteHandler =
    <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) =>
    (id: string) => {
      setter((prev) => prev.filter((item) => item.id !== id));
    };
  const adjustStock = useCallback(
    (warehouseId: string, productId: string, delta: number) => {
      setWarehouseStocks((prev) => {
        const next: Record<string, Record<string, number>> = { ...prev };
        if (!next[warehouseId]) next[warehouseId] = {};
        const current = next[warehouseId][productId] || 0;
        const updated = Math.max(0, current + delta);
        next[warehouseId][productId] = updated;
        setProducts((prevProducts) => {
          const totals: Record<string, number> = {};
          for (const p of prevProducts) totals[p.id] = 0;
          for (const wh of Object.keys(next)) {
            for (const pid of Object.keys(next[wh])) {
              totals[pid] = (totals[pid] || 0) + next[wh][pid];
            }
          }
          return prevProducts.map((p) => ({
            ...p,
            stock: totals[p.id] ?? p.stock,
          }));
        });
        return next;
      });
    },
    []
  );
  const updateGoodsReceipt = useCallback(
    (updated: GoodsReceiptType) => {
      setGoodsReceipts((prev) => {
        const prevItem = prev.find((r) => r.id === updated.id);
        const next = prev.map((r) => (r.id === updated.id ? updated : r));
        if (
          prevItem &&
          prevItem.status !== Status.Approved &&
          updated.status === Status.Approved
        ) {
          for (const it of updated.items)
            adjustStock(
              updated.warehouseId,
              it.productId,
              Number(it.quantity) || 0
            );
        }
        return next;
      });
    },
    [adjustStock]
  );
  const updateWithdrawal = useCallback(
    (updated: WithdrawalType) => {
      setWithdrawals((prev) => {
        const prevItem = prev.find((w) => w.id === updated.id);
        const next = prev.map((w) => (w.id === updated.id ? updated : w));
        if (
          prevItem &&
          prevItem.status !== Status.Approved &&
          updated.status === Status.Approved
        ) {
          for (const it of updated.items) {
            adjustStock(
              updated.fromWarehouseId,
              it.productId,
              -(Number(it.quantity) || 0)
            );
            if (updated.toWarehouseId)
              adjustStock(
                updated.toWarehouseId,
                it.productId,
                Number(it.quantity) || 0
              );
          }
        }
        return next;
      });
    },
    [adjustStock]
  );
  const createTransfer = useCallback(
    (data: Omit<TransferType, 'id'>) => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
        .toString()
        .slice(-2);
      const id = `IT${thaiYearLastTwoDigits}-${String(Date.now()).slice(-6)}`;
      const newItem: TransferType = { ...(data as any), id };
      setTransfers((prev) => [...prev, newItem]);
      for (const it of data.items) {
        adjustStock(
          data.fromWarehouseId,
          it.productId,
          -(Number(it.quantity) || 0)
        );
        adjustStock(data.toWarehouseId, it.productId, Number(it.quantity) || 0);
      }
    },
    [adjustStock]
  );
  const createStockAdjustment = useCallback(
    (data: Omit<StockAdjustmentType, 'id'>) => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
        .toString()
        .slice(-2);
      const id = `SA${thaiYearLastTwoDigits}-${String(Date.now()).slice(-6)}`;
      const newItem: StockAdjustmentType = { ...(data as any), id };
      setStockAdjustments((prev) => [...prev, newItem]);
      for (const it of data.items)
        adjustStock(
          data.warehouseId,
          it.productId,
          (Number(it.adjustedQuantity) || 0) -
            (Number(it.originalQuantity) || 0)
        );
    },
    [adjustStock]
  );
  const createProductReturn = useCallback(
    (data: Omit<ProductReturnType, 'id'>) => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
        .toString()
        .slice(-2);
      const id = `RT${thaiYearLastTwoDigits}-${String(Date.now()).slice(-6)}`;
      const newItem: ProductReturnType = { ...(data as any), id };
      setProductReturns((prev) => [...prev, newItem]);
      for (const it of data.items) {
        adjustStock(
          data.fromWarehouseId,
          it.productId,
          -(Number(it.quantity) || 0)
        );
        adjustStock(data.toWarehouseId, it.productId, Number(it.quantity) || 0);
      }
    },
    [adjustStock]
  );

  const updateReturnToSupplier = useCallback(
    (updated: ReturnToSupplierType) => {
      setReturnToSuppliers((prev) => {
        const prevItem = prev.find((r) => r.id === updated.id);
        const next = prev.map((r) => (r.id === updated.id ? updated : r));
        if (
          prevItem &&
          prevItem.status !== Status.Approved &&
          updated.status === Status.Approved
        ) {
          for (const it of updated.items) {
            adjustStock(
              updated.warehouseId,
              it.productId,
              -(Number(it.quantity) || 0)
            );
          }
        }
        return next;
      });
    },
    [adjustStock]
  );

  const createCustomer = useCallback((data: Omit<Customer, 'id'>) => {
    setCustomers((prev) => {
      const maxId = prev.reduce((max, c) => {
        const num = parseInt(c.id.slice(1), 10);
        return num > max ? num : max;
      }, 0);
      const newId = `C${String(maxId + 1).padStart(4, '0')}`;
      return [...prev, { ...data, id: newId } as Customer];
    });
  }, []);

  const createProduct = useCallback((data: Omit<Product, 'id'>) => {
    setProducts((prev) => {
      const prefix = data.type === 'สินค้า' ? 'PROD-' : 'SERV-';
      const relevantProducts = prev.filter((p) => p.id.startsWith(prefix));
      const maxId = relevantProducts.reduce((max, p) => {
        const numPart = p.id.split('-')[1];
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : num > max ? num : max;
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(3, '0')}`;
      return [...prev, { ...data, id: newId } as Product];
    });
  }, []);

  const createPackage = useCallback((data: Omit<Product, 'id'>) => {
    setProducts((prev) => {
      const prefix = 'PK';
      const relevantProducts = prev.filter((p) => p.id.startsWith(prefix));
      const maxId = relevantProducts.reduce((max, p) => {
        const numPart = p.id.replace('PK', '');
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : num > max ? num : max;
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(4, '0')}`;
      return [...prev, { ...data, id: newId } as Product];
    });
  }, []);

  const createCategory = useCallback((data: Omit<Category, 'id'>) => {
    setCategories((prev) => {
      const prefix = data.name?.toUpperCase() || 'CAT';
      const relevantCategories = prev.filter((c) => c.id.startsWith(prefix));
      const maxId = relevantCategories.reduce((max, c) => {
        const numPart = c.id.replace(prefix, '');
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : num > max ? num : max;
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(3, '0')}`;
      return [...prev, { ...data, id: newId } as Category];
    });
  }, []);

  const createWarehouse = useCallback((data: Omit<WarehouseType, 'id'>) => {
    setWarehouses((prev) => {
      // Find the highest existing number from WHxxxx formatted IDs
      const maxId = prev.reduce((max, w) => {
        if (w.id.startsWith('WH')) {
          const num = parseInt(w.id.slice(2), 10);
          if (!isNaN(num) && num > max) {
            return num;
          }
        } else if (w.id.startsWith('wh-')) {
          // Handle old format
          const num = parseInt(w.id.slice(3), 10);
          if (!isNaN(num) && num > max) {
            return num;
          }
        }
        return max;
      }, 0);

      const newIdNumber = maxId + 1;
      const newId = `WH${String(newIdNumber).padStart(3, '0')}`;

      return [...prev, { ...data, id: newId } as WarehouseType];
    });
  }, []);

  const createSupplier = useCallback((data: Omit<Supplier, 'id'>) => {
    setSuppliers((prev) => {
      const prefix = 'SP';
      const maxId = prev.reduce((max, s) => {
        const num = parseInt(s.id.slice(2), 10);
        return num > max ? num : max;
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(4, '0')}`;
      return [...prev, { ...data, id: newId } as Supplier];
    });
  }, []);

  const createUser = useCallback((data: Omit<User, 'id'>) => {
    setUsers((prev) => {
      const maxId = prev.reduce((max, u) => {
        const numPart = u.id.split('-')[1];
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : num > max ? num : max;
      }, 0);
      const newId = `user-${maxId + 1}`;
      return [...prev, { ...data, id: newId } as User];
    });
  }, []);

  const createQuotation = useCallback(
    (data: Omit<Quotation, 'id'>, assessmentId?: string) => {
      setQuotations((prev) => {
        const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
          .toString()
          .slice(-2);
        const prefix = `QT${thaiYearLastTwoDigits}`; // QT68

        // Filter existing IDs starting with this prefix to find max running number
        // Format: QT68xxxx-v
        const runningNumbers = prev
          .filter((q) => q.id.startsWith(prefix))
          .map((q) => {
            const parts = q.id.split('-'); // ["QT680001", "1"]
            const basePart = parts[0]; // "QT680001"
            return parseInt(basePart.slice(4), 10); // 0001
          })
          .filter((n) => !isNaN(n));

        const maxRunning =
          runningNumbers.length > 0 ? Math.max(...runningNumbers) : 0;
        const nextRunning = (maxRunning + 1).toString().padStart(4, '0');
        const newId = `${prefix}${nextRunning}-1`; // First version is always -1

        if (assessmentId) {
          setAssessments((prevAssessments) =>
            prevAssessments.map((asm) =>
              asm.id === assessmentId
                ? { ...asm, status: Status.Converted }
                : asm
            )
          );
        }
        return [
          ...prev,
          { ...data, assessmentId, id: newId, revision: 1 } as Quotation,
        ];
      });
    },
    []
  );

  const createContract = useCallback((data: Omit<Contract, 'id'>) => {
    setContracts((prev) => {
      const prefix = 'CON-';
      const maxId = prev.reduce((max, c) => {
        const num = parseInt(c.id.split('-')[1], 10);
        return num > max ? num : max;
      }, 0);
      const newId = `${prefix}${maxId + 1}`;

      setQuotations((prevQuotes) =>
        prevQuotes.map((q) =>
          q.id === data.quotationId ? { ...q, status: Status.Converted } : q
        )
      );

      return [...prev, { ...data, id: newId } as Contract];
    });
  }, []);

  const createJob = useCallback(
    (data: Omit<FieldJob, 'id'>, assessmentId?: string) => {
      setFieldJobs((prev) => {
        const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
          .toString()
          .slice(-2);
        const prefix = `SER${thaiYearLastTwoDigits}`;
        const jobsThisYear = prev.filter((j) => j.id.startsWith(prefix));
        const maxId = jobsThisYear.reduce((max, j) => {
          const num = parseInt(j.id.slice(5), 10);
          return num > max ? num : max;
        }, 0);
        const newId = `${prefix}${(maxId + 1).toString().padStart(3, '0')}`;

        if (assessmentId) {
          setAssessments((prevAssessments) =>
            prevAssessments.map((asm) =>
              asm.id === assessmentId
                ? { ...asm, status: Status.Converted }
                : asm
            )
          );
        }

        return [...prev, { ...data, id: newId } as FieldJob];
      });
    },
    []
  );

  const createWalletTransaction = useCallback(
    (userId: string, transactionData: Omit<WalletTransaction, 'id'>) => {
      setUserWallets((prev) => {
        const userWalletIndex = prev.findIndex((w) => w.userId === userId);
        const newTxn = {
          ...transactionData,
          id: `txn-${Date.now()}`,
        } as WalletTransaction;

        if (userWalletIndex > -1) {
          const updatedWallets = [...prev];
          const userWallet = updatedWallets[userWalletIndex];
          updatedWallets[userWalletIndex] = {
            ...userWallet,
            transactions: [...userWallet.transactions, newTxn],
          };
          return updatedWallets;
        } else {
          // This case shouldn't happen with mock data, but good to have
          const newWallet: UserWallet = {
            userId: userId,
            transactions: [newTxn],
          };
          return [...prev, newWallet];
        }
      });
    },
    []
  );

  const updateWarehouseLimits = useCallback(
    (warehouseId: string, limits: { [productId: string]: number }) => {
      setWarehouses((prev) =>
        prev.map((w) =>
          w.id === warehouseId ? { ...w, withdrawalLimits: limits } : w
        )
      );
    },
    []
  );

  const createInvoice = useCallback((data: Omit<Invoice, 'id'>) => {
    setInvoices((prev) => {
      const prefix = 'inv-';
      const maxId = prev.reduce((max, i) => {
        const num = parseInt(i.id.split('-')[1], 10);
        return isNaN(num) ? max : num > max ? num : max;
      }, 0);
      const newId = `${prefix}${String(maxId + 1).padStart(3, '0')}`;
      return [...prev, { ...data, id: newId } as Invoice];
    });
  }, []);

  const createReceipt = useCallback((data: Omit<Receipt, 'id'>) => {
    setReceipts((prev) => {
      const prefix = 'rec-';
      const maxId = prev.reduce((max, r) => {
        const num = parseInt(r.id.split('-')[1], 10);
        return isNaN(num) ? max : num > max ? num : max;
      }, 0);
      const newId = `${prefix}${String(maxId + 1).padStart(3, '0')}`;
      return [...prev, { ...data, id: newId } as Receipt];
    });
  }, []);

  const handleReviseQuotation = useCallback((quotation: Quotation) => {
    setQuotations((prev) => {
      // Logic to find new version number
      // ID Format: QT68xxxx-v
      const [baseId, currentVersionStr] = quotation.id.split('-');

      // Find all quotations with the same baseId to determine the next version
      const versions = prev
        .filter((q) => q.id.startsWith(baseId))
        .map((q) => {
          const parts = q.id.split('-');
          return parts.length > 1 ? parseInt(parts[1], 10) : 0;
        })
        .filter((v) => !isNaN(v));

      const maxVersion =
        versions.length > 0
          ? Math.max(...versions)
          : currentVersionStr
            ? parseInt(currentVersionStr, 10)
            : 0;
      const nextVersion = maxVersion + 1;
      const newId = `${baseId}-${nextVersion}`;

      const newQuotation: Quotation = {
        ...quotation,
        id: newId,
        revision: nextVersion,
        originalId: quotation.originalId || quotation.id, // Link to original
        status: Status.Draft, // Reset to Draft for the new revision
        createdAt: new Date().toISOString().slice(0, 10), // Reset date
      };

      return [...prev, newQuotation];
    });
  }, []);

  const handleQuotationUpdate = useCallback((updatedQuotation: Quotation) => {
    setQuotations((prevQuotations) => {
      // 1. Calculate Base ID from the quotation being edited (e.g. QT680001-1 -> QT680001)
      const baseId = updatedQuotation.id.split('-')[0];

      // 2. Find all existing versions to determine the next revision number
      const existingVersions = prevQuotations
        .filter((q) => q.id.startsWith(baseId))
        .map((q) => {
          const parts = q.id.split('-');
          return parts.length > 1 ? parseInt(parts[1], 10) : 0;
        })
        .filter((v) => !isNaN(v));

      // 3. Calculate next revision
      const maxVersion =
        existingVersions.length > 0 ? Math.max(...existingVersions) : 0;
      const nextVersion = maxVersion + 1;
      const newId = `${baseId}-${nextVersion}`;

      // 4. Determine Status
      // If the user set one of the "Final/Process" statuses, keep it.
      // Otherwise (if Draft, Revise, or generic save), set to 'Revise' (แก้ไขตามรอบ)
      const allowedManualStatuses = [
        Status.UnderReview, // ลูกค้าพิจารณา
        Status.Approved, // เซ็น (อนุมัติ)
        Status.PendingApproval, // รออนุมัติ
        Status.Closed, // ปิดงาน
      ];

      let finalStatus = updatedQuotation.status;
      if (!allowedManualStatuses.includes(finalStatus)) {
        finalStatus = Status.Revise;
      }

      // 5. Create the new revision object
      const newRevision: Quotation = {
        ...updatedQuotation,
        id: newId,
        revision: nextVersion,
        status: finalStatus,
      };

      // 6. Return new state
      return [...prevQuotations, newRevision];
    });
  }, []);

  const HANDLERS = {
    assessments: {
      create: createHandler(setAssessments, 'asm'),
      update: updateHandler(setAssessments),
      delete: deleteHandler(setAssessments),
    },
    fieldJobs: {
      create: createJob,
      update: updateHandler(setFieldJobs),
      delete: deleteHandler(setFieldJobs),
    },
    customers: {
      create: createCustomer,
      update: updateHandler(setCustomers),
      delete: deleteHandler(setCustomers),
    },
    quotations: {
      create: createQuotation,
      update: handleQuotationUpdate,
      delete: deleteHandler(setQuotations),
      revise: handleReviseQuotation,
    },
    contracts: {
      create: createContract,
      update: updateHandler(setContracts),
      delete: deleteHandler(setContracts),
    },
    products: {
      create: createProduct,
      update: updateHandler(setProducts),
      delete: deleteHandler(setProducts),
    },
    packages: {
      create: createPackage,
      update: updateHandler(setProducts),
      delete: deleteHandler(setProducts),
    },
    warehouses: {
      create: createWarehouse,
      update: updateHandler(setWarehouses),
      delete: deleteHandler(setWarehouses),
      updateLimits: updateWarehouseLimits,
    },
    suppliers: {
      create: createSupplier,
      update: updateHandler(setSuppliers),
      delete: deleteHandler(setSuppliers),
    },
    goodsReceipts: {
      create: createHandler(setGoodsReceipts, 'GR'),
      update: updateGoodsReceipt,
      delete: deleteHandler(setGoodsReceipts),
    },
    withdrawals: {
      create: createHandler(setWithdrawals, 'SR'),
      update: updateWithdrawal,
      delete: deleteHandler(setWithdrawals),
    },
    transfers: {
      create: createTransfer,
      update: updateHandler(setTransfers),
      delete: deleteHandler(setTransfers),
    },
    stockAdjustments: {
      create: createStockAdjustment,
      update: updateHandler(setStockAdjustments),
      delete: deleteHandler(setStockAdjustments),
    },
    productReturns: {
      create: createProductReturn,
      update: updateHandler(setProductReturns),
      delete: deleteHandler(setProductReturns),
    },
    returnToSuppliers: {
      create: createHandler(setReturnToSuppliers, 'RTS'),
      update: updateReturnToSupplier,
      delete: deleteHandler(setReturnToSuppliers),
    },
    users: {
      create: createUser,
      update: updateHandler(setUsers),
      delete: deleteHandler(setUsers),
    },
    categories: {
      create: createCategory,
      update: updateHandler(setCategories),
      delete: deleteHandler(setCategories),
    },
    userWallets: { createTransaction: createWalletTransaction },
    invoices: {
      create: createInvoice,
      update: updateHandler(setInvoices),
      delete: deleteHandler(setInvoices),
    },

    receipts: {
      create: createReceipt,
      update: updateHandler(setReceipts),
      delete: deleteHandler(setReceipts),
    },
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return (
          <Dashboard
            assessments={assessments}
            fieldJobs={fieldJobs}
            invoices={invoices}
            receipts={receipts}
            products={products}
            contracts={contracts}
            users={users}
            customers={customers}
            goodsReceipts={goodsReceipts}
            withdrawals={withdrawals}
            transfers={transfers}
            stockAdjustments={stockAdjustments}
            productReturns={productReturns}
            onCreateAssessment={HANDLERS.assessments.create}
            onCreateJob={HANDLERS.fieldJobs.create}
            onNavigateToReports={goToReports}
          />
        );
      case 'ลูกค้า':
        return (
          <Customers
            customers={customers}
            onCreateCustomer={HANDLERS.customers.create}
            onUpdateCustomer={HANDLERS.customers.update}
            onDeleteCustomer={HANDLERS.customers.delete}
            contracts={contracts}
            quotations={quotations}
            onCreateContract={HANDLERS.contracts.create}
          />
        );
      case 'ใบประเมิน':
        return (
          <Assessments
            assessments={assessments}
            onCreateAssessment={HANDLERS.assessments.create}
            onUpdateAssessment={HANDLERS.assessments.update}
            onDeleteAssessment={HANDLERS.assessments.delete}
            products={products}
          />
        );
      case 'ภาคสนาม':
        return (
          <FieldOperations
            users={users}
            jobs={fieldJobs}
            assessments={assessments}
            contracts={contracts}
            quotations={quotations}
            onCreateJob={HANDLERS.fieldJobs.create}
            onUpdateJob={HANDLERS.fieldJobs.update}
            onDeleteJob={HANDLERS.fieldJobs.delete}
            products={products}
            onUpdateAssessment={HANDLERS.assessments.update}
            onUpdateQuotation={HANDLERS.quotations.update}
            customers={customers}
            onCreateQuotation={HANDLERS.quotations.create}
          />
        );
      case 'ใบเสนอราคา':
        return (
          <Financials
            defaultTab="ใบเสนอราคา"
            quotations={quotations}
            customers={customers}
            assessments={assessments}
            onCreateQuotation={HANDLERS.quotations.create}
            onUpdateQuotation={HANDLERS.quotations.update}
            onDeleteQuotation={HANDLERS.quotations.delete}
            onReviseQuotation={HANDLERS.quotations.revise}
          />
        );
      case 'ใบแจ้งหนี้':
        return (
          <Financials
            defaultTab="ใบแจ้งหนี้"
            invoices={invoices}
            customers={customers}
            quotations={quotations}
            onCreateInvoice={HANDLERS.invoices.create}
            onUpdateInvoice={HANDLERS.invoices.update}
            onDeleteInvoice={HANDLERS.invoices.delete}
            onCreateReceipt={HANDLERS.receipts.create}
          />
        );
      case 'ใบกำกับภาษี/ใบเสร็จรับเงิน':
        return (
          <Financials
            defaultTab="ใบกำกับภาษี/ใบเสร็จรับเงิน"
            receipts={receipts}
            invoices={invoices}
            customers={customers}
            onCreateReceipt={HANDLERS.receipts.create}
            onUpdateReceipt={HANDLERS.receipts.update}
            onDeleteReceipt={HANDLERS.receipts.delete}
          />
        );
      case 'หมวดหมู่':
        return (
          <Categories/>
        );
      case 'สินค้า/บริการ':
        return (
          <Inventory
            products={products}
            onCreateProduct={HANDLERS.products.create}
            onUpdateProduct={HANDLERS.products.update}
            onDeleteProduct={HANDLERS.products.delete}
            categories={categories}
          />
        );
      case 'แพ็กเกจ':
        return (
          <Packages
            products={products}
            onCreatePackage={HANDLERS.packages.create}
            onUpdatePackage={HANDLERS.packages.update}
            onDeletePackage={HANDLERS.packages.delete}
            categories={categories}
          />
        );
      case 'คลังสินค้า':
        return (
          <Warehouse
            warehouses={warehouses}
            products={products}
            onCreateWarehouse={HANDLERS.warehouses.create}
            onUpdateWarehouse={HANDLERS.warehouses.update}
            onDeleteWarehouse={HANDLERS.warehouses.delete}
            onUpdateWarehouseLimits={HANDLERS.warehouses.updateLimits}
            stockMap={warehouseStocks}
          />
        );
      case 'ผู้จัดจำหน่าย':
        return (
          <Suppliers
            suppliers={suppliers}
            onCreateSupplier={HANDLERS.suppliers.create}
            onUpdateSupplier={HANDLERS.suppliers.update}
            onDeleteSupplier={HANDLERS.suppliers.delete}
          />
        );
      case 'รับเข้า':
        return (
          <GoodsReceipt
            receipts={goodsReceipts}
            onCreateReceipt={HANDLERS.goodsReceipts.create}
            onUpdateReceipt={HANDLERS.goodsReceipts.update}
            onDeleteReceipt={HANDLERS.goodsReceipts.delete}
            warehouses={warehouses}
            suppliers={suppliers}
            products={products}
          />
        );
      case 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย':
        return (
          <Withdrawals
            withdrawals={withdrawals}
            onCreateWithdrawal={HANDLERS.withdrawals.create}
            onUpdateWithdrawal={HANDLERS.withdrawals.update}
            onDeleteWithdrawal={HANDLERS.withdrawals.delete}
            users={users}
            warehouses={warehouses}
            jobs={fieldJobs}
            customers={customers}
            currentUser={users[0]}
            products={products}
            stockMap={warehouseStocks}
          />
        );
      case 'โอนย้าย':
        return (
          <Transfers
            transfers={transfers}
            onCreateTransfer={HANDLERS.transfers.create}
            onUpdateTransfer={HANDLERS.transfers.update}
            onDeleteTransfer={HANDLERS.transfers.delete}
            warehouses={warehouses}
            products={products}
            stockMap={warehouseStocks}
          />
        );
      case 'ปรับปรุง Stock':
        return (
          <StockAdjustment
            adjustments={stockAdjustments}
            onCreateAdjustment={HANDLERS.stockAdjustments.create}
            onUpdateAdjustment={HANDLERS.stockAdjustments.update}
            onDeleteAdjustment={HANDLERS.stockAdjustments.delete}
            warehouses={warehouses}
            products={products}
            stockMap={warehouseStocks}
          />
        );
      case 'คืนสินค้า':
        return (
          <Returns
            returns={productReturns}
            onCreateReturn={HANDLERS.productReturns.create}
            onUpdateReturn={HANDLERS.productReturns.update}
            onDeleteReturn={HANDLERS.productReturns.delete}
            warehouses={warehouses}
            products={products}
            stockMap={warehouseStocks}
          />
        );
      case 'เบิกสินค้าคืนผู้จำหน่าย':
        return (
          <ReturnToSupplier
            returns={returnToSuppliers}
            onCreateReturn={HANDLERS.returnToSuppliers.create}
            onUpdateReturn={HANDLERS.returnToSuppliers.update}
            onDeleteReturn={HANDLERS.returnToSuppliers.delete}
            warehouses={warehouses}
            suppliers={suppliers}
            products={products}
          />
        );
      case 'ผู้ใช้งาน':
        return (
          <Users
            users={users}
            onCreateUser={HANDLERS.users.create}
            onUpdateUser={HANDLERS.users.update}
            onDeleteUser={HANDLERS.users.delete}
            userWallets={userWallets}
            onCreateWalletTransaction={HANDLERS.userWallets.createTransaction}
          />
        );
      case 'จัดการบทบาท':
        return (
          <Users
            users={users}
            onCreateUser={HANDLERS.users.create}
            onUpdateUser={HANDLERS.users.update}
            onDeleteUser={HANDLERS.users.delete}
            defaultView="roles"
            userWallets={userWallets}
            onCreateWalletTransaction={HANDLERS.userWallets.createTransaction}
          />
        );
      case 'การแจ้งเตือน':
        return (
          <Notifications
            contracts={contracts}
            jobs={fieldJobs}
            invoices={invoices}
            receipts={receipts}
            customers={customers}
          />
        );
      case 'รายงาน':
        return (
          <Reports
            products={products}
            warehouses={warehouses}
            suppliers={suppliers}
            users={users}
            stockMap={warehouseStocks}
            goodsReceipts={goodsReceipts}
            withdrawals={withdrawals}
            transfers={transfers}
            stockAdjustments={stockAdjustments}
            productReturns={productReturns}
            fieldJobs={fieldJobs}
            invoices={invoices}
            receipts={receipts}
            customers={customers}
          />
        );
      default:
        return (
          <Dashboard
            assessments={assessments}
            fieldJobs={fieldJobs}
            invoices={invoices}
            receipts={receipts}
            products={products}
            contracts={contracts}
            customers={customers}
            goodsReceipts={goodsReceipts}
            withdrawals={withdrawals}
            transfers={transfers}
            stockAdjustments={stockAdjustments}
            productReturns={productReturns}
            users={users}
            onCreateAssessment={HANDLERS.assessments.create}
            onCreateJob={HANDLERS.fieldJobs.create}
          />
        );
    }
  };

  if (!isAuthenticated)
    return (
      <Suspense
        fallback={
          <div className="p-8">
            <p className="text-slate-600">กำลังโหลด...</p>
          </div>
        }
      >
        <Login onLogin={handleLogin} />
      </Suspense>
    );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar
        currentPage={currentPage}
        onPageChange={(page) => navigate('/' + PAGE_PATH[page])}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebarState}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebarState} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense
              fallback={
                <div className="p-8">
                  <p className="text-slate-600">กำลังโหลด...</p>
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/forms" element={<Forms />} />
                <Route
                  path="/dashboard"
                  element={
                    <Dashboard
                      assessments={assessments}
                      fieldJobs={fieldJobs}
                      invoices={invoices}
                      receipts={receipts}
                      products={products}
                      contracts={contracts}
                      users={users}
                      customers={customers}
                      goodsReceipts={goodsReceipts}
                      withdrawals={withdrawals}
                      transfers={transfers}
                      stockAdjustments={stockAdjustments}
                      productReturns={productReturns}
                      onCreateAssessment={HANDLERS.assessments.create}
                      onCreateJob={HANDLERS.fieldJobs.create}
                      onNavigateToReports={goToReports}
                    />
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <Customers
                      customers={customers}
                      onCreateCustomer={HANDLERS.customers.create}
                      onUpdateCustomer={HANDLERS.customers.update}
                      onDeleteCustomer={HANDLERS.customers.delete}
                      contracts={contracts}
                      quotations={quotations}
                      onCreateContract={HANDLERS.contracts.create}
                      onCreateJob={HANDLERS.fieldJobs.create}
                    />
                  }
                />
                <Route
                  path="/assessments"
                  element={
                    <Assessments
                      assessments={assessments}
                      onCreateAssessment={HANDLERS.assessments.create}
                      onUpdateAssessment={HANDLERS.assessments.update}
                      onDeleteAssessment={HANDLERS.assessments.delete}
                      products={products}
                    />
                  }
                />
                <Route
                  path="/field-operations"
                  element={
                    <FieldOperations
                      users={users}
                      jobs={fieldJobs}
                      assessments={assessments}
                      contracts={contracts}
                      quotations={quotations}
                      onCreateJob={HANDLERS.fieldJobs.create}
                      onUpdateJob={HANDLERS.fieldJobs.update}
                      onDeleteJob={HANDLERS.fieldJobs.delete}
                      products={products}
                      onUpdateAssessment={HANDLERS.assessments.update}
                      onUpdateQuotation={HANDLERS.quotations.update}
                      customers={customers}
                      onCreateQuotation={HANDLERS.quotations.create}
                    />
                  }
                />
                <Route
                  path="/quotations/new"
                  element={
                    <CreateQuotationPage
                      onCreateQuotation={HANDLERS.quotations.create}
                      customers={customers}
                      assessments={assessments}
                    />
                  }
                />
                <Route
                  path="/quotations/:id/edit"
                  element={
                    <EditQuotationPage
                      quotations={quotations}
                      onUpdateQuotation={HANDLERS.quotations.update}
                    />
                  }
                />
                <Route
                  path="/invoices/:id/edit"
                  element={
                    <EditInvoicePage
                      invoices={invoices}
                      customers={customers}
                      quotations={quotations}
                      onUpdateInvoice={HANDLERS.invoices.update}
                    />
                  }
                />
                <Route
                  path="/quotations"
                  element={
                    <Financials
                      defaultTab="ใบเสนอราคา"
                      quotations={quotations}
                      customers={customers}
                      assessments={assessments}
                      onCreateQuotation={HANDLERS.quotations.create}
                      onUpdateQuotation={HANDLERS.quotations.update}
                      onDeleteQuotation={HANDLERS.quotations.delete}
                      onReviseQuotation={HANDLERS.quotations.revise}
                    />
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <Financials
                      defaultTab="ใบแจ้งหนี้"
                      invoices={invoices}
                      customers={customers}
                      quotations={quotations}
                      onCreateInvoice={HANDLERS.invoices.create}
                      onUpdateInvoice={HANDLERS.invoices.update}
                      onDeleteInvoice={HANDLERS.invoices.delete}
                      onCreateReceipt={HANDLERS.receipts.create}
                    />
                  }
                />
                <Route
                  path="/receipts"
                  element={
                    <Financials
                      defaultTab="ใบกำกับภาษี/ใบเสร็จรับเงิน"
                      receipts={receipts}
                      invoices={invoices}
                      customers={customers}
                      onCreateReceipt={HANDLERS.receipts.create}
                      onUpdateReceipt={HANDLERS.receipts.update}
                      onDeleteReceipt={HANDLERS.receipts.delete}
                    />
                  }
                />
                <Route
                  path="/categories"
                  element={
                    <Categories/>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <Inventory
                      products={products}
                      onCreateProduct={HANDLERS.products.create}
                      onUpdateProduct={HANDLERS.products.update}
                      onDeleteProduct={HANDLERS.products.delete}
                      categories={categories}
                    />
                  }
                />
                <Route
                  path="/packages"
                  element={
                    <Packages
                      products={products}
                      onCreatePackage={HANDLERS.packages.create}
                      onUpdatePackage={HANDLERS.packages.update}
                      onDeletePackage={HANDLERS.packages.delete}
                      categories={categories}
                    />
                  }
                />
                <Route
                  path="/warehouse"
                  element={
                    <Warehouse
                      warehouses={warehouses}
                      products={products}
                      onCreateWarehouse={HANDLERS.warehouses.create}
                      onUpdateWarehouse={HANDLERS.warehouses.update}
                      onDeleteWarehouse={HANDLERS.warehouses.delete}
                      onUpdateWarehouseLimits={HANDLERS.warehouses.updateLimits}
                      stockMap={warehouseStocks}
                    />
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <Suppliers
                      suppliers={suppliers}
                      onCreateSupplier={HANDLERS.suppliers.create}
                      onUpdateSupplier={HANDLERS.suppliers.update}
                      onDeleteSupplier={HANDLERS.suppliers.delete}
                    />
                  }
                />
                <Route
                  path="/reporting/monthly-sales"
                  element={
                    <MonthlySales
                      quotations={quotations}
                      assessments={assessments}
                      users={users}
                    />
                  }
                />
                <Route
                  path="/reports/monthly-sales"
                  element={
                    <MonthlySales
                      quotations={quotations}
                      assessments={assessments}
                      users={users}
                    />
                  }
                />
                <Route
                  path="/reports/sales-summary"
                  element={
                    <SalesSummary
                      quotations={quotations}
                      assessments={assessments}
                      fieldJobs={fieldJobs}
                    />
                  }
                />
                <Route
                  path="/goods-receipt"
                  element={
                    <GoodsReceipt
                      receipts={goodsReceipts}
                      onCreateReceipt={HANDLERS.goodsReceipts.create}
                      onUpdateReceipt={HANDLERS.goodsReceipts.update}
                      onDeleteReceipt={HANDLERS.goodsReceipts.delete}
                      warehouses={warehouses}
                      suppliers={suppliers}
                      products={products}
                    />
                  }
                />
                <Route
                  path="/withdrawals"
                  element={
                    <Withdrawals
                      withdrawals={withdrawals}
                      onCreateWithdrawal={HANDLERS.withdrawals.create}
                      onUpdateWithdrawal={HANDLERS.withdrawals.update}
                      onDeleteWithdrawal={HANDLERS.withdrawals.delete}
                      users={users}
                      warehouses={warehouses}
                      jobs={fieldJobs}
                      customers={customers}
                      currentUser={users[0]}
                      products={products}
                      stockMap={warehouseStocks}
                    />
                  }
                />
                <Route
                  path="/transfers"
                  element={
                    <Transfers
                      transfers={transfers}
                      onCreateTransfer={HANDLERS.transfers.create}
                      onUpdateTransfer={HANDLERS.transfers.update}
                      onDeleteTransfer={HANDLERS.transfers.delete}
                      warehouses={warehouses}
                      products={products}
                      stockMap={warehouseStocks}
                    />
                  }
                />
                <Route
                  path="/stock-adjustment"
                  element={
                    <StockAdjustment
                      adjustments={stockAdjustments}
                      onCreateAdjustment={HANDLERS.stockAdjustments.create}
                      onUpdateAdjustment={HANDLERS.stockAdjustments.update}
                      onDeleteAdjustment={HANDLERS.stockAdjustments.delete}
                      warehouses={warehouses}
                      products={products}
                      stockMap={warehouseStocks}
                    />
                  }
                />
                <Route
                  path="/returns"
                  element={
                    <Returns
                      returns={productReturns}
                      onCreateReturn={HANDLERS.productReturns.create}
                      onUpdateReturn={HANDLERS.productReturns.update}
                      onDeleteReturn={HANDLERS.productReturns.delete}
                      warehouses={warehouses}
                      products={products}
                      stockMap={warehouseStocks}
                    />
                  }
                />
                <Route
                  path="/return-to-supplier"
                  element={
                    <ReturnToSupplier
                      returns={returnToSuppliers}
                      onCreateReturn={HANDLERS.returnToSuppliers.create}
                      onUpdateReturn={HANDLERS.returnToSuppliers.update}
                      onDeleteReturn={HANDLERS.returnToSuppliers.delete}
                      warehouses={warehouses}
                      suppliers={suppliers}
                      products={products}
                    />
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Users
                      users={users}
                      onCreateUser={HANDLERS.users.create}
                      onUpdateUser={HANDLERS.users.update}
                      onDeleteUser={HANDLERS.users.delete}
                      userWallets={userWallets}
                      onCreateWalletTransaction={
                        HANDLERS.userWallets.createTransaction
                      }
                    />
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <Users
                      users={users}
                      onCreateUser={HANDLERS.users.create}
                      onUpdateUser={HANDLERS.users.update}
                      onDeleteUser={HANDLERS.users.delete}
                      defaultView="roles"
                      userWallets={userWallets}
                      onCreateWalletTransaction={
                        HANDLERS.userWallets.createTransaction
                      }
                    />
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <Notifications
                      contracts={contracts}
                      jobs={fieldJobs}
                      invoices={invoices}
                      receipts={receipts}
                      customers={customers}
                    />
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Reports
                      products={products}
                      warehouses={warehouses}
                      suppliers={suppliers}
                      users={users}
                      stockMap={warehouseStocks}
                      goodsReceipts={goodsReceipts}
                      withdrawals={withdrawals}
                      transfers={transfers}
                      stockAdjustments={stockAdjustments}
                      productReturns={productReturns}
                      fieldJobs={fieldJobs}
                      invoices={invoices}
                      receipts={receipts}
                      customers={customers}
                    />
                  }
                />
                <Route
                  path="/reports/total-income"
                  element={
                    <TotalIncome
                      invoices={invoices}
                      receipts={receipts}
                      customers={customers}
                    />
                  }
                />
                <Route
                  path="/reports/tax-invoice-income"
                  element={
                    <TaxInvoiceIncome
                      invoices={invoices}
                      receipts={receipts}
                      customers={customers}
                    />
                  }
                />
                <Route
                  path="/reports/indirect-expenses"
                  element={<IndirectExpenses />}
                />
                <Route path="/reports/daily-cash" element={<DailyCash />} />
                <Route
                  path="/reports/direct-expenses"
                  element={<DirectExpenses />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
