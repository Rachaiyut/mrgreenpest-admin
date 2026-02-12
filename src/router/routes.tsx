import { lazy, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { DataContextType } from '../contexts/DataContext';
// import Product from '../pages/inventory';

// Lazy Imports
const Dashboard = lazy(() => import('../pages/dashboard'));
const Customers = lazy(() => import('../pages/customers/Customer'));
const Assessments = lazy(() => import('../pages/assessments/Assessments'));
const FieldOperations = lazy(() => import('../pages/field-operations'));
const QuotationsPage = lazy(() => import('../pages/quotations'));
const InvoicesPage = lazy(() => import('../pages/invoices/Invoice'));
const ReceiptsPage = lazy(() => import('../pages/receipts/Receipt'));
const EditQuotation = lazy(() => import('../pages/quotations/EditQuotation'));
const EditInvoicePage = lazy(() => import('../components/features/invoices/EditInvoiceModal'));
const Users = lazy(() => import('../pages/users'));
const Warehouse = lazy(() => import('../pages/warehouse/Warehouse'));
const GoodsReceipt = lazy(() => import('../pages/inventory/goods-receipt'));
const Suppliers = lazy(() => import('../pages/suppliers/Supplier'));
const Withdrawals = lazy(() => import('../pages/inventory/withdrawals'));
const Transfers = lazy(() => import('../pages/inventory/transfers'));
const StockAdjustment = lazy(() => import('../pages/inventory/stock-adjustment'));
const Returns = lazy(() => import('../pages/inventory/returns'));
const Requisitions = lazy(() => import('../pages/inventory/requisitions'));
const ReturnToSupplier = lazy(() => import('../pages/inventory/return-to-supplier'));
const Packages = lazy(() => import('../pages/packages/Package'));
const Categories = lazy(() => import('../pages/categories/Category'));
const Products = lazy(() => import('../pages/inventory/products/Product'));
const Reports = lazy(() => import('../pages/reports'));
const Notifications = lazy(() => import('../pages/notifications'));
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
  roles?: Role[];
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO, Role.LEAD_TECH, Role.TECH],
    },
    {
      path: '/customers',
      element: <Customers />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
    },
    {
      path: '/assessments',
      element: <Assessments />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.LEAD_TECH, Role.TECH],
    },
    {
      path: '/field-jobs',
      element: <Navigate to="/field-operations" replace />,
      roles: [Role.LEAD_TECH, Role.TECH, Role.SUPERADMIN],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO],
    },
    {
      path: '/quotations/:id/edit',
      element: <EditQuotation />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO, Role.COO, Role.LEAD_TECH],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO, Role.COO, Role.LEAD_TECH, Role.TECH],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO, Role.COO, Role.LEAD_TECH, Role.TECH],
    },
    {
      path: '/billing',
      element: (
        <InvoicesPage
          onCreateInvoice={handlers.invoices.create}
          onUpdateInvoice={handlers.invoices.update}
          onDeleteInvoice={handlers.invoices.delete}
        />
      ),
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO],
    },
    {
      path: '/billing/new',
      element: <CreateInvoicePage />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO],
    },
    {
      path: '/forms',
      element: <Forms />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO],
    },
    {
      path: '/categories',
      element: <Categories />,
      roles: [Role.SUPERADMIN, Role.ADMIN],
    },
    {
      path: '/products',
      element: <Products />,
      roles: [Role.SUPERADMIN, Role.ADMIN],
    },
    {
      path: '/packages',
      element: <Packages />,
      roles: [Role.SUPERADMIN, Role.ADMIN],
    },
    {
      path: '/warehouse',
      element: <Warehouse />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
    },
    {
      path: '/suppliers',
      element: <Suppliers />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
    },
    {
      path: '/reporting/monthly-sales',
      element: <MonthlySales />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO, Role.COO],
    },
    {
      path: '/reports/monthly-sales',
      element: <MonthlySales />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO, Role.COO],
    },
    {
      path: '/reports/sales-summary',
      element: <SalesSummary />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO, Role.COO],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
    },
    {
      path: '/withdrawals',
      element: (
        <Withdrawals
        />
      ),
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.LEAD_TECH, Role.TECH],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.LEAD_TECH, Role.TECH],
    },
    {
      path: '/requisitions',
      element: <Requisitions />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.CFO, Role.LEAD_TECH, Role.TECH],
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
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO],
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
      roles: [Role.SUPERADMIN, Role.ADMIN],
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
      roles: [Role.SUPERADMIN, Role.ADMIN],
    },
    {
      path: '/notifications',
      element: <Notifications />,
      roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO],
    },
    {
      path: '/reports',
      element: <Reports />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO, Role.COO],
    },
    {
      path: '/reports/total-income',
      element: <TotalIncome />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO],
    },
    {
      path: '/reports/tax-invoice-income',
      element: <TaxInvoiceIncome />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO],
    },
    {
      path: '/reports/indirect-expenses',
      element: <IndirectExpenses />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO],
    },
    {
      path: '/reports/daily-cash',
      element: <DailyCash />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO],
    },
    {
      path: '/reports/direct-expenses',
      element: <DirectExpenses />,
      roles: [Role.SUPERADMIN, Role.CEO, Role.CFO],
    },
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ];
};
