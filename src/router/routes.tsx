import { lazy, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { DataContextType } from '../contexts/DataContext';

// Lazy Imports
const Dashboard = lazy(() => import('../pages/dashboard'));
const Customers = lazy(() => import('../pages/customers/Customer'));
const Assessments = lazy(() => import('../pages/assessments/Assessments'));
const FieldOperations = lazy(() => import('../pages/field-operations'));
const Financials = lazy(() => import('../pages/financials'));
const CreateQuotationPage = lazy(() => import('../pages/financials/CreateQuotationPage'));
const EditQuotationPage = lazy(() => import('../pages/financials/EditQuotationPage'));
const EditInvoicePage = lazy(() => import('../pages/financials/EditInvoicePage'));
const Inventory = lazy(() => import('../pages/inventory'));
const Users = lazy(() => import('../pages/users'));
const Warehouse = lazy(() => import('../pages/warehouse'));
const GoodsReceipt = lazy(() => import('../pages/inventory/goods-receipt'));
const Suppliers = lazy(() => import('../pages/suppliers/Supplier'));
const Withdrawals = lazy(() => import('../pages/inventory/withdrawals'));
const Transfers = lazy(() => import('../pages/inventory/transfers'));
const StockAdjustment = lazy(() => import('../pages/inventory/stock-adjustment'));
const Returns = lazy(() => import('../pages/inventory/returns'));
const ReturnToSupplier = lazy(() => import('../pages/inventory/return-to-supplier'));
const Packages = lazy(() => import('../pages/packages/Package'));
const Categories = lazy(() => import('../pages/categories/Category'));
const Reports = lazy(() => import('../pages/reports'));
const Notifications = lazy(() => import('../pages/notifications'));

// Reports Sub-pages
const TotalIncome = lazy(() => import('../pages/reports/TotalIncomePage'));
const TaxInvoiceIncome = lazy(() => import('../pages/reports/TaxInvoiceIncomePage'));
const MonthlySales = lazy(() => import('../pages/reports/MonthlySalesPage'));
const SalesSummary = lazy(() => import('../pages/reports/SalesSummaryPage'));
const IndirectExpenses = lazy(() => import('../pages/reports/IndirectExpensesPage'));
const DailyCash = lazy(() => import('../pages/reports/DailyCashPage'));
const DirectExpenses = lazy(() => import('../pages/reports/DirectExpensesPage'));

export interface RouteConfig {
  path: string;
  element: ReactNode;
}

export const getRoutes = (data: DataContextType): RouteConfig[] => {
  const {
    handlers,
    users,
    jobs,
    assessments,
    contracts,
    quotations,
    invoices,
    products,
    customers,
    warehouses,
  } = data;

  return [
    {
      path: '/',
      element: <Navigate to="/dashboard" replace />,
    },
    {
      path: '/dashboard',
      element: <Dashboard />,
    },
    {
      path: '/customers',
      element: <Customers />,
    },
    {
      path: '/assessments',
      element: (
        <Assessments
          assessments={assessments}
          onCreateAssessment={handlers.assessments.create}
          onUpdateAssessment={handlers.assessments.update}
          onDeleteAssessment={handlers.assessments.delete}
          products={products}
          customers={customers}
        />
      ),
    },
    {
      path: '/field-operations',
      element: (
        <FieldOperations
          users={users}
          jobs={jobs}
          assessments={assessments}
          contracts={contracts}
          quotations={quotations}
          products={products}
          customers={customers}
          warehouses={warehouses}
          onCreateJob={handlers.jobs.create}
          onUpdateJob={handlers.jobs.update}
          onDeleteJob={handlers.jobs.delete}
          onUpdateAssessment={handlers.assessments.update}
          onUpdateQuotation={handlers.quotations.update}
          onCreateQuotation={handlers.quotations.create}
        />
      ),
    },
    {
      path: '/quotations/new',
      element: (
        <CreateQuotationPage
          onCreateQuotation={handlers.quotations.create}
          customers={customers}
          assessments={assessments}
          products={products}
        />
      ),
    },
    {
      path: '/quotations/:id/edit',
      element: (
        <EditQuotationPage
          quotations={quotations}
          onUpdateQuotation={handlers.quotations.update}
        />
      ),
    },
    {
      path: '/invoices/:id/edit',
      element: (
        <EditInvoicePage
          invoices={invoices}
          customers={customers}
          quotations={quotations}
          onUpdateInvoice={handlers.invoices.update}
        />
      ),
    },
    {
      path: '/quotations',
      element: (
        <Financials
          defaultTab="ใบเสนอราคา"
          onCreateQuotation={handlers.quotations.create}
          onUpdateQuotation={handlers.quotations.update}
          onDeleteQuotation={handlers.quotations.delete}
          onReviseQuotation={handlers.quotations.revise}
        />
      ),
    },
    {
      path: '/billing',
      element: (
        <Financials
          defaultTab="ใบแจ้งหนี้"
          onCreateInvoice={handlers.invoices.create}
          onUpdateInvoice={handlers.invoices.update}
          onDeleteInvoice={handlers.invoices.delete}
          onCreateReceipt={handlers.receipts.create}
        />
      ),
    },
    {
      path: '/receipts',
      element: (
        <Financials
          defaultTab="ใบกำกับภาษี/ใบเสร็จรับเงิน"
          onCreateReceipt={handlers.receipts.create}
          onUpdateReceipt={handlers.receipts.update}
          onDeleteReceipt={handlers.receipts.delete}
        />
      ),
    },
    {
      path: '/categories',
      element: <Categories />,
    },
    {
      path: '/inventory',
      element: <Inventory />,
    },
    {
      path: '/packages',
      element: <Packages />,
    },
    {
      path: '/warehouse',
      element: (
        <Warehouse
          onCreateWarehouse={handlers.warehouses.create}
          onUpdateWarehouse={handlers.warehouses.update}
          onDeleteWarehouse={handlers.warehouses.delete}
          onUpdateWarehouseLimits={handlers.warehouses.updateLimits}
        />
      ),
    },
    {
      path: '/suppliers',
      element: <Suppliers />,
    },
    {
      path: '/reporting/monthly-sales',
      element: <MonthlySales />,
    },
    {
      path: '/reports/monthly-sales',
      element: <MonthlySales />,
    },
    {
      path: '/reports/sales-summary',
      element: <SalesSummary />,
    },
    {
      path: '/goods-receipt',
      element: (
        <GoodsReceipt
          onCreateReceipt={handlers.goodsReceipts.create}
          onUpdateReceipt={handlers.goodsReceipts.update}
          onDeleteReceipt={handlers.goodsReceipts.delete}
        />
      ),
    },
    {
      path: '/withdrawals',
      element: (
        <Withdrawals
          onCreateWithdrawal={handlers.withdrawals.create}
          onUpdateWithdrawal={handlers.withdrawals.update}
          onDeleteWithdrawal={handlers.withdrawals.delete}
        />
      ),
    },
    {
      path: '/transfers',
      element: (
        <Transfers
          onCreateTransfer={handlers.transfers.create}
          onUpdateTransfer={handlers.transfers.update}
          onDeleteTransfer={handlers.transfers.delete}
        />
      ),
    },
    {
      path: '/stock-adjustment',
      element: (
        <StockAdjustment
          onCreateAdjustment={handlers.stockAdjustments.create}
          onUpdateAdjustment={handlers.stockAdjustments.update}
          onDeleteAdjustment={handlers.stockAdjustments.delete}
        />
      ),
    },
    {
      path: '/returns',
      element: (
        <Returns
          onCreateReturn={handlers.productReturns.create}
          onUpdateReturn={handlers.productReturns.update}
          onDeleteReturn={handlers.productReturns.delete}
        />
      ),
    },
    {
      path: '/return-to-supplier',
      element: (
        <ReturnToSupplier
          onCreateReturn={handlers.returnToSuppliers.create}
          onUpdateReturn={handlers.returnToSuppliers.update}
          onDeleteReturn={handlers.returnToSuppliers.delete}
        />
      ),
    },
    {
      path: '/users',
      element: (
        <Users
          onCreateUser={handlers.users.create}
          onUpdateUser={handlers.users.update}
          onDeleteUser={handlers.users.delete}
          onCreateWalletTransaction={handlers.userWallets.createTransaction}
        />
      ),
    },
    {
      path: '/roles',
      element: (
        <Users
          onCreateUser={handlers.users.create}
          onUpdateUser={handlers.users.update}
          onDeleteUser={handlers.users.delete}
          defaultView="roles"
          onCreateWalletTransaction={handlers.userWallets.createTransaction}
        />
      ),
    },
    {
      path: '/notifications',
      element: <Notifications />,
    },
    {
      path: '/reports',
      element: <Reports />,
    },
    {
      path: '/reports/total-income',
      element: <TotalIncome />,
    },
    {
      path: '/reports/tax-invoice-income',
      element: <TaxInvoiceIncome />,
    },
    {
      path: '/reports/indirect-expenses',
      element: <IndirectExpenses />,
    },
    {
      path: '/reports/daily-cash',
      element: <DailyCash />,
    },
    {
      path: '/reports/direct-expenses',
      element: <DirectExpenses />,
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ];
};
