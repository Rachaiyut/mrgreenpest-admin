import { lazy, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { DataContextType } from '../contexts/DataContext';
// import Product from '../pages/inventory';

// Lazy Imports
const Dashboard = lazy(() => import('../pages/dashboard'));
const Customers = lazy(() => import('../pages/customers/Customer'));
const Assessments = lazy(() => import('../pages/assessments/Assessments'));
const FieldOperations = lazy(() => import('../pages/field-operations/FieldOpearation'));
const QuotationsPage = lazy(() => import('../pages/quotations/Quotation'));
const InvoicesPage = lazy(() => import('../pages/invoices/Invoice'));
const ReceiptsPage = lazy(() => import('../pages/receipts/Receipt'));
const EditQuotation = lazy(() => import('../pages/quotations/EditQuotation'));
const EditInvoicePage = lazy(() => import('../components/features/invoices/EditInvoiceModal'));
const Users = lazy(() => import('../pages/users/User'));
const Warehouse = lazy(() => import('../pages/warehouse/Warehouse'));
const GoodsReceipt = lazy(() => import('../pages/inventory/goods-receipt/Good-Receipt'));
const Suppliers = lazy(() => import('../pages/suppliers/Supplier'));
const Withdrawals = lazy(() => import('../pages/inventory/withdrawals'));
const WithDrawVehicle = lazy(() => import('../pages/inventory/withdrawals/WithDrawVehicle'));
const Transfers = lazy(() => import('../pages/inventory/transfers/Transfer'));
const StockAdjustment = lazy(() => import('../pages/inventory/stock-adjustment'));
const Returns = lazy(() => import('../pages/inventory/returns'));
const Requisitions = lazy(() => import('../pages/inventory/requisitions'));
const ReturnToSupplier = lazy(() => import('../pages/inventory/return-to-supplier'));
const Packages = lazy(() => import('../pages/packages/Package'));
const Categories = lazy(() => import('../pages/categories/Category'));
const Products = lazy(() => import('../pages/inventory/products/Product'));
const Reports = lazy(() => import('../pages/reports'));
const Notifications = lazy(() => import('../pages/notifications/Notification'));
const Forms = lazy(() => import('../pages/forms'));
const ContractsPage = lazy(() => import('../pages/contracts/Contract'));
const CreateInvoicePage = lazy(() => import('../pages/billing/CreateInvoice'));

// Reports Sub-pages
const TotalIncome = lazy(() => import('../pages/reports/TotalIncomePage'));
const TaxInvoiceIncome = lazy(() => import('../pages/reports/TaxInvoiceIncomePage'));
const MonthlySales = lazy(() => import('../pages/reports/MonthlySalesPage'));
const SalesSummary = lazy(() => import('../pages/reports/SalesSummaryPage'));
const IndirectExpenses = lazy(() => import('../pages/reports/IndirectExpensesPage'));
const DailyCash = lazy(() => import('../pages/reports/DailyCashPage'));
const DirectExpenses = lazy(() => import('../pages/reports/DirectExpensesPage'));

import { Role } from '../types/enums/role';

export interface RouteConfig {
  path: string;
  element: ReactNode;
  access?: string; // Changed from roles to access
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
      access: 'ACCESS_DASHBOARD',
    },
    {
      path: '/customers',
      element: <Customers />,
      access: 'ACCESS_CUSTOMER',
    },
    {
      path: '/assessments',
      element: <Assessments />,
      access: 'ACCESS_ASSESSMENT',
    },
    {
      path: '/field-operations',
      element: (
        <FieldOperations
          users={users}
          jobs={jobs as any}
          assessments={assessments}
          contracts={contracts}
          quotations={quotations}
          products={products}
          customers={customers}
          warehouses={warehouses}
          onUpdateAssessment={handlers.assessments.update}
          onUpdateQuotation={handlers.quotations.update}
          onCreateQuotation={handlers.quotations.create}
        />
      ),
      access: 'ACCESS_OPERATION',
    },
    {
      path: '/field-jobs',
      element: <Navigate to="/field-operations" replace />,
      access: 'ACCESS_OPERATION',
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
      access: 'ACCESS_INVOICE',
    },
    {
      path: '/quotations/:id/edit',
      element: <EditQuotation />,
      access: 'ACCESS_QUOTATION',
    },
    {
      path: '/quotations',
      element: (
        <QuotationsPage
          onCreateQuotation={handlers.quotations.create}
          onUpdateQuotation={handlers.quotations.update}
          onDeleteQuotation={handlers.quotations.delete}
          onReviseQuotation={handlers.quotations.revise}
        />
      ),
      access: 'ACCESS_QUOTATION',
    },
    {
      path: '/contracts',
      element: (
        <ContractsPage
          onCreateContract={handlers.contracts.create}
          onUpdateContract={handlers.contracts.update}
          onDeleteContract={handlers.contracts.delete}
        />
      ),
      access: 'ACCESS_CONTRACT',
    },
    {
      path: '/invoice',
      element: (
        <InvoicesPage
          onCreateInvoice={handlers.invoices.create}
          onUpdateInvoice={handlers.invoices.update}
          onDeleteInvoice={handlers.invoices.delete}
        />
      ),
      access: 'ACCESS_INVOICE',
    },
    {
      path: '/invoice/new',
      element: <CreateInvoicePage />,
      access: 'ACCESS_INVOICE',
    },
    {
      path: '/receipts',
      element: (
        <ReceiptsPage
          onCreateReceipt={handlers.receipts.create}
          onUpdateReceipt={handlers.receipts.update}
          onDeleteReceipt={handlers.receipts.delete}
        />
      ),
      access: 'ACCESS_RECEIPT',
    },
    {
      path: '/categories',
      element: <Categories />,
      access: 'ACCESS_CATEGORY',
    },
    {
      path: '/products',
      element: <Products />,
      access: 'ACCESS_PRODUCT',
    },
    {
      path: '/packages',
      element: <Packages />,
      access: 'ACCESS_PACKAGES',
    },
    {
      path: '/warehouse',
      element: <Warehouse />,
      access: 'ACCESS_WAREHOUSE',
    },
    {
      path: '/suppliers',
      element: <Suppliers />,
      access: 'ACCESS_SUPPLIER',
    },
    {
      path: '/reporting/monthly-sales',
      element: <MonthlySales />,
      access: 'ACCESS_REPORT_SALES',
    },
    {
      path: '/reports/monthly-sales',
      element: <MonthlySales />,
      access: 'ACCESS_REPORT_SALES',
    },
    {
      path: '/reports/sales-summary',
      element: <SalesSummary />,
      access: 'ACCESS_REPORT_SALES',
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
      access: 'ACCESS_RECEIVE_NOTE',
    },
    {
      path: '/withdrawals',
      element: <Withdrawals />,
      access: 'ACCESS_SUMMARY_WITHDRAW',
    },
    {
      path: '/withdraw-vehicle',
      element: <WithDrawVehicle />,
      access: 'ACCESS_WITHDRAW_NOTE',
    },
    {
      path: '/transfers',
      element: <Transfers />,
      access: 'ACCESS_TRANSFER_NOTE',
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
      access: 'ACCESS_ADJUSTMENT_NOTE',
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
      access: 'ACCESS_RETURN_NOTE',
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
      access: 'ACCESS_RETURN_NOTE',
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
      access: 'ACCESS_USER',
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
      access: 'ACCESS_ROLE',
    },
    {
      path: '/notifications',
      element: <Notifications />,
      // No specific permission, accessible to all logged-in users
    },
    {
      path: '/reports',
      element: <Reports />,
      access: 'ACCESS_REPORT_MASTER',
    },
    {
      path: '/reports/total-income',
      element: <TotalIncome />,
      access: 'ACCESS_REPORT_SALES',
    },
    {
      path: '/reports/tax-invoice-income',
      element: <TaxInvoiceIncome />,
      access: 'ACCESS_REPORT_SALES',
    },
    {
      path: '/reports/indirect-expenses',
      element: <IndirectExpenses />,
      access: 'ACCESS_REPORT_PURCHASE',
    },
    {
      path: '/reports/daily-cash',
      element: <DailyCash />,
      access: 'ACCESS_REPORT_FINANCIAL', 
    },
    {
      path: '/reports/direct-expenses',
      element: <DirectExpenses />,
      access: 'ACCESS_REPORT_PURCHASE',
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ];
};
