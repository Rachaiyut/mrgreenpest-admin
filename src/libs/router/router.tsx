import {
  useState,
  useCallback,
  useEffect,
  lazy,
  Suspense,
  useMemo,
} from 'react';
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Config
import { PAGE_PATH } from '../common/constant/route';
import { getCurrentPageFromPath } from './utils';

// Components
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';

// Types
import { Page } from './page';

// Context
import { useData } from '../../contexts/DataContext';

// Lazy Imports
const Login = lazy(() => import('../../pages/login/Login'));
const Dashboard = lazy(() => import('../../pages/dashboard'));
const Customers = lazy(() => import('../../pages/customers/Customer'));
const Assessments = lazy(() => import('../../pages/assessments'));
const FieldOperations = lazy(() => import('../../pages/field-operations'));
const Financials = lazy(() => import('../../pages/financials'));
const CreateQuotationPage = lazy(
  () => import('../../pages/financials/CreateQuotationPage')
);
const EditQuotationPage = lazy(
  () => import('../../pages/financials/EditQuotationPage')
);
const EditInvoicePage = lazy(
  () => import('../../pages/financials/EditInvoicePage')
);
const Inventory = lazy(() => import('../../pages/inventory/products/Product'));
const Users = lazy(() => import('../../pages/users'));
const Warehouse = lazy(() => import('../../pages/warehouse'));
const GoodsReceipt = lazy(() => import('../../pages/inventory/goods-receipt'));
const Suppliers = lazy(() => import('../../pages/suppliers/Supplier'));
const Withdrawals = lazy(() => import('../../pages/inventory/withdrawals'));
const Transfers = lazy(() => import('../../pages/inventory/transfers'));
const StockAdjustment = lazy(
  () => import('../../pages/inventory/stock-adjustment')
);
const Returns = lazy(() => import('../../pages/inventory/returns'));
const ReturnToSupplier = lazy(
  () => import('../../pages/inventory/return-to-supplier')
);
const Packages = lazy(() => import('../../pages/packages'));
const Categories = lazy(() => import('../../pages/categories/Category'));
const Reports = lazy(() => import('../../pages/reports'));
const Notifications = lazy(() => import('../../pages/notifications'));

// Reports Sub-pages
const TotalIncome = lazy(() => import('../../pages/reports/TotalIncomePage'));
const TaxInvoiceIncome = lazy(
  () => import('../../pages/reports/TaxInvoiceIncomePage')
);
const MonthlySales = lazy(() => import('../../pages/reports/MonthlySalesPage'));
const SalesSummary = lazy(() => import('../../pages/reports/SalesSummaryPage'));
const IndirectExpenses = lazy(
  () => import('../../pages/reports/IndirectExpensesPage')
);
const DailyCash = lazy(() => import('../../pages/reports/DailyCashPage'));
const DirectExpenses = lazy(
  () => import('../../pages/reports/DirectExpensesPage')
);

interface AppRouterProps {
  isAuthenticated: boolean;
  onLogin: (username: string, remember: boolean) => void;
  onLogout: () => void;
}

export const AppRouter = (props: AppRouterProps) => {
  const { isAuthenticated, onLogin, onLogout } = props;

  const navigate = useNavigate();
  const location = useLocation();

  const { handlers } = useData();

  const goToReports = useCallback(
    (tab: string) => {
      try {
        localStorage.setItem('reportsDefaultTab', tab);
      } catch {}
      navigate('/reports');
    },
    [navigate]
  );

  const PATH_PAGE = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(PAGE_PATH).map(([k, v]) => ['/' + v, k])
      ) as Record<string, Page>,
    []
  );

  const currentPage: Page = useMemo(() => {
    return getCurrentPageFromPath(location.pathname, PATH_PAGE);
  }, [location.pathname, PATH_PAGE]);

  const [isSidebarOpen, setSidebarOpen] = useState(true);

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

  if (!isAuthenticated)
    return (
      <Suspense
        fallback={
          <div className="p-8">
            <p className="text-slate-600">กำลังโหลด...</p>
          </div>
        }
      >
        <Login onLogin={onLogin} />
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
        <Header toggleSidebar={toggleSidebarState} onLogout={onLogout} />
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/assessments" element={<Assessments />} />
                <Route path="/field-operations" element={<FieldOperations />} />
                <Route
                  path="/quotations/new"
                  element={<CreateQuotationPage />}
                />
                <Route
                  path="/quotations/:id/edit"
                  element={<EditQuotationPage />}
                />
                <Route
                  path="/invoices/:id/edit"
                  element={<EditInvoicePage />}
                />
                <Route
                  path="/quotations"
                  element={
                    <Financials
                      defaultTab="ใบเสนอราคา"
                      onCreateQuotation={handlers.quotations.create}
                      onUpdateQuotation={handlers.quotations.update}
                      onDeleteQuotation={handlers.quotations.delete}
                      onReviseQuotation={handlers.quotations.revise}
                    />
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <Financials
                      defaultTab="ใบแจ้งหนี้"
                      onCreateInvoice={handlers.invoices.create}
                      onUpdateInvoice={handlers.invoices.update}
                      onDeleteInvoice={handlers.invoices.delete}
                      onCreateReceipt={handlers.receipts.create}
                    />
                  }
                />
                <Route
                  path="/receipts"
                  element={
                    <Financials
                      defaultTab="ใบกำกับภาษี/ใบเสร็จรับเงิน"
                      onCreateReceipt={handlers.receipts.create}
                      onUpdateReceipt={handlers.receipts.update}
                      onDeleteReceipt={handlers.receipts.delete}
                    />
                  }
                />
                <Route path="/categories" element={<Categories />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/packages" element={<Packages />} />
                <Route
                  path="/warehouse"
                  element={
                    <Warehouse
                      onCreateWarehouse={handlers.warehouses.create}
                      onUpdateWarehouse={handlers.warehouses.update}
                      onDeleteWarehouse={handlers.warehouses.delete}
                      onUpdateWarehouseLimits={handlers.warehouses.updateLimits}
                    />
                  }
                />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route
                  path="/reporting/monthly-sales"
                  element={<MonthlySales />}
                />
                <Route
                  path="/reports/monthly-sales"
                  element={<MonthlySales />}
                />
                <Route
                  path="/reports/sales-summary"
                  element={<SalesSummary />}
                />
                <Route
                  path="/goods-receipt"
                  element={
                    <GoodsReceipt
                      onCreateReceipt={handlers.goodsReceipts.create}
                      onUpdateReceipt={handlers.goodsReceipts.update}
                      onDeleteReceipt={handlers.goodsReceipts.delete}
                    />
                  }
                />
                <Route
                  path="/withdrawals"
                  element={
                    <Withdrawals
                      onCreateWithdrawal={handlers.withdrawals.create}
                      onUpdateWithdrawal={handlers.withdrawals.update}
                      onDeleteWithdrawal={handlers.withdrawals.delete}
                    />
                  }
                />
                <Route
                  path="/transfers"
                  element={
                    <Transfers
                      onCreateTransfer={handlers.transfers.create}
                      onUpdateTransfer={handlers.transfers.update}
                      onDeleteTransfer={handlers.transfers.delete}
                    />
                  }
                />
                <Route
                  path="/stock-adjustment"
                  element={
                    <StockAdjustment
                      onCreateAdjustment={handlers.stockAdjustments.create}
                      onUpdateAdjustment={handlers.stockAdjustments.update}
                      onDeleteAdjustment={handlers.stockAdjustments.delete}
                    />
                  }
                />
                <Route
                  path="/returns"
                  element={
                    <Returns
                      onCreateReturn={handlers.productReturns.create}
                      onUpdateReturn={handlers.productReturns.update}
                      onDeleteReturn={handlers.productReturns.delete}
                    />
                  }
                />
                <Route
                  path="/return-to-supplier"
                  element={
                    <ReturnToSupplier
                      onCreateReturn={handlers.returnToSuppliers.create}
                      onUpdateReturn={handlers.returnToSuppliers.update}
                      onDeleteReturn={handlers.returnToSuppliers.delete}
                    />
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Users
                      onCreateUser={handlers.users.create}
                      onUpdateUser={handlers.users.update}
                      onDeleteUser={handlers.users.delete}
                      onCreateWalletTransaction={
                        handlers.userWallets.createTransaction
                      }
                    />
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <Users
                      onCreateUser={handlers.users.create}
                      onUpdateUser={handlers.users.update}
                      onDeleteUser={handlers.users.delete}
                      defaultView="roles"
                      onCreateWalletTransaction={
                        handlers.userWallets.createTransaction
                      }
                    />
                  }
                />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/total-income" element={<TotalIncome />} />
                <Route
                  path="/reports/tax-invoice-income"
                  element={<TaxInvoiceIncome />}
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
