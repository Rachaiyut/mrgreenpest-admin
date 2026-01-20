import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Config
import { PAGE_PATH } from '../common/constant/route.';

// Components
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { CreateQuotationPage } from '../../pages/financials/CreateQuotationPage';
import { EditQuotationPage } from '../../pages/financials/EditQuotationPage';
import { EditInvoicePage } from '../../pages/financials/EditInvoicePage';

// Types
import { Page } from '../../types';

// Lazy Imports
const Dashboard = lazy(() => import('../../pages/dashboard'));
const Customers = lazy(() => import('../../pages/customers/Customer'));
const Assessments = lazy(() => import('../../pages/assessments'));
const FieldOperations = lazy(() => import('../../pages/field-operations'));
const Financials = lazy(() => import('../../pages/financials'));
const Inventory = lazy(() => import('../../pages/inventory/products/Product'));
const Users = lazy(() => import('../../pages/users'));
const Warehouse = lazy(() => import('../../pages/warehouse'));
const GoodsReceipt = lazy(
  () => import('../../pages/inventory/goods-receipt')
);
const Suppliers = lazy(() => import('../../pages/suppliers'));
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
const TotalIncome = lazy(
  () => import('../../pages/reports/TotalIncomePage')
);
const TaxInvoiceIncome = lazy(
  () => import('../../pages/reports/TaxInvoiceIncomePage')
);
const MonthlySales = lazy(
  () => import('../../pages/reports/MonthlySalesPage')
);
const SalesSummary = lazy(
  () => import('../../pages/reports/SalesSummaryPage')
);
const IndirectExpenses = lazy(
  () => import('../../pages/reports/IndirectExpensesPage')
);
const DailyCash = lazy(() => import('../../pages/reports/DailyCashPage'));
const DirectExpenses = lazy(
  () => import('../../pages/reports/DirectExpensesPage')
);
const Notifications = lazy(() => import('../../pages/notifications'));
const Login = lazy(() => import('../../pages/login/Login'));

interface AppRouterProps {
  isAuthenticated: boolean;
  onLogin: (username: string, remember: boolean) => void;
  onLogout: () => void;
  assessments: any[];
  fieldJobs: any[];
  customers: any[];
  contracts: any[];
  quotations: any[];
  products: any[];
  users: any[];
  warehouses: any[];
  suppliers: any[];
  goodsReceipts: any[];
  withdrawals: any[];
  transfers: any[];
  stockAdjustments: any[];
  productReturns: any[];
  returnToSuppliers: any[];
  invoices: any[];
  receipts: any[];
  categories: any[];
  userWallets: any[];
  warehouseStocks: Record<string, Record<string, number>>;
  handlers: any;
}

export const AppRouter = ({
  isAuthenticated,
  onLogin,
  onLogout,
  assessments,
  fieldJobs,
  customers,
  contracts,
  quotations,
  products,
  users,
  warehouses,
  suppliers,
  goodsReceipts,
  withdrawals,
  transfers,
  stockAdjustments,
  productReturns,
  returnToSuppliers,
  invoices,
  receipts,
  userWallets,
  warehouseStocks,
  handlers,
}: AppRouterProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const goToReports = useCallback(
    (tab: string) => {
      try {
        localStorage.setItem('reportsDefaultTab', tab);
      } catch {}
      navigate('/reports');
    },
    [navigate]
  );

  const PATH_PAGE = Object.fromEntries(
    Object.entries(PAGE_PATH).map(([k, v]) => ['/' + v, k])
  ) as Record<string, Page>;
  let currentPage: Page = PATH_PAGE[location.pathname] ?? 'Dashboard';

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
  }

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
                      onCreateAssessment={handlers.assessments.create}
                      onCreateJob={handlers.fieldJobs.create}
                      onNavigateToReports={goToReports}
                    />
                  }
                />
                <Route path="/customers" element={<Customers />} />
                <Route
                  path="/assessments"
                  element={
                    <Assessments
                      assessments={assessments}
                      onCreateAssessment={handlers.assessments.create}
                      onUpdateAssessment={handlers.assessments.update}
                      onDeleteAssessment={handlers.assessments.delete}
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
                      onCreateJob={handlers.fieldJobs.create}
                      onUpdateJob={handlers.fieldJobs.update}
                      onDeleteJob={handlers.fieldJobs.delete}
                      products={products}
                      onUpdateAssessment={handlers.assessments.update}
                      onUpdateQuotation={handlers.quotations.update}
                      customers={customers}
                      onCreateQuotation={handlers.quotations.create}
                    />
                  }
                />
                <Route
                  path="/quotations/new"
                  element={
                    <CreateQuotationPage
                      onCreateQuotation={handlers.quotations.create}
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
                      onUpdateQuotation={handlers.quotations.update}
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
                      onUpdateInvoice={handlers.invoices.update}
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
                      invoices={invoices}
                      customers={customers}
                      quotations={quotations}
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
                      receipts={receipts}
                      invoices={invoices}
                      customers={customers}
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
                      warehouses={warehouses}
                      products={products}
                      onCreateWarehouse={handlers.warehouses.create}
                      onUpdateWarehouse={handlers.warehouses.update}
                      onDeleteWarehouse={handlers.warehouses.delete}
                      onUpdateWarehouseLimits={handlers.warehouses.updateLimits}
                      stockMap={warehouseStocks}
                    />
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <Suppliers
                      suppliers={suppliers}
                      onCreateSupplier={handlers.suppliers.create}
                      onUpdateSupplier={handlers.suppliers.update}
                      onDeleteSupplier={handlers.suppliers.delete}
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
                      onCreateReceipt={handlers.goodsReceipts.create}
                      onUpdateReceipt={handlers.goodsReceipts.update}
                      onDeleteReceipt={handlers.goodsReceipts.delete}
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
                      onCreateWithdrawal={handlers.withdrawals.create}
                      onUpdateWithdrawal={handlers.withdrawals.update}
                      onDeleteWithdrawal={handlers.withdrawals.delete}
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
                      onCreateTransfer={handlers.transfers.create}
                      onUpdateTransfer={handlers.transfers.update}
                      onDeleteTransfer={handlers.transfers.delete}
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
                      onCreateAdjustment={handlers.stockAdjustments.create}
                      onUpdateAdjustment={handlers.stockAdjustments.update}
                      onDeleteAdjustment={handlers.stockAdjustments.delete}
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
                      onCreateReturn={handlers.productReturns.create}
                      onUpdateReturn={handlers.productReturns.update}
                      onDeleteReturn={handlers.productReturns.delete}
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
                      onCreateReturn={handlers.returnToSuppliers.create}
                      onUpdateReturn={handlers.returnToSuppliers.update}
                      onDeleteReturn={handlers.returnToSuppliers.delete}
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
                      onCreateUser={handlers.users.create}
                      onUpdateUser={handlers.users.update}
                      onDeleteUser={handlers.users.delete}
                      userWallets={userWallets}
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
                      users={users}
                      onCreateUser={handlers.users.create}
                      onUpdateUser={handlers.users.update}
                      onDeleteUser={handlers.users.delete}
                      defaultView="roles"
                      userWallets={userWallets}
                      onCreateWalletTransaction={
                        handlers.userWallets.createTransaction
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
