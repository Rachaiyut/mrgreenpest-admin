import React from 'react';
import { Navigate } from 'react-router-dom';
import { DataContextType } from '../contexts/DataContext';
import { NavigationItem } from '@/src/types/nav';
import { Role } from '../types/enums/role';
import {
  NewDashboardIcon,
  NewCustomerIcon,
  DocumentTextIcon,
  NewFieldOpsIcon,
  NewAccountingIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  NewWarehouseIcon,
  PackageIcon,
  NewUsersIcon,
  NewReportIcon,
  BellIcon,
  BuildingOfficeIcon,
} from '../assets/icons/Icons';
import { Role } from '../types/enums/role';

// Route Configuration Interface
interface RouteConfig {
  path: string;
  element: React.ReactElement;
  access?: string;
}

// Sub-item Configuration Interface
interface SubItemConfig {
  name: string;
  path: string;
  access: string;
  icon?: React.ElementType;
  roles?: Role[];
  component?: React.LazyExoticComponent<any>;
  getProps?: (data: DataContextType) => Record<string, any>;
}

// Unified Configuration Interface
interface UnifiedConfig {
  // Navigation
  name: string;
  icon?: React.ElementType;
  access?: string;
  roles?: Role[];

  // Route
  path: string;
  component: React.LazyExoticComponent<any>;

  // Grouping
  group?: string;
  subItems?: SubItemConfig[];

  // Component props
  getProps?: (data: DataContextType) => Record<string, any>;
}

// Lazy load all components
const Dashboard = React.lazy(() => import('../pages/dashboard/Dashboard'));
const Customer = React.lazy(() => import('../pages/customers/Customer'));
const Assessments = React.lazy(
  () => import('../pages/assessments/Assessments')
);
const FieldOperations = React.lazy(
  () => import('../pages/job/Job')
);
const Quotation = React.lazy(() => import('../pages/quotations/Quotation'));
const Contract = React.lazy(() => import('../pages/contracts/Contract'));
const Invoice = React.lazy(() => import('../pages/invoices/Invoice'));
const Receipt = React.lazy(() => import('../pages/receipts/Receipt'));
const Warehouse = React.lazy(() => import('../pages/warehouse/Warehouse'));
const Withdrawals = React.lazy(() => import('../pages/inventory/issue/IssueSummary'));
const Product = React.lazy(() => import('../pages/inventory/products/Product'));
const Package = React.lazy(() => import('../pages/packages/Package'));
const Category = React.lazy(() => import('../pages/categories/Category'));
const Supplier = React.lazy(() => import('../pages/suppliers/Supplier'));
const UnitPage = React.lazy(() => import('../pages/units/Unit'));
const User = React.lazy(() => import('../pages/users/User'));
const Reports = React.lazy(() => import('../pages/reports'));
const Notification = React.lazy(
  () => import('../pages/notifications/Notification')
);
const GoodReceipt = React.lazy(
  () => import('../pages/inventory/goods-receipt/GoodReceive')
);
const Transfer = React.lazy(
  () => import('../pages/inventory/transfers/Transfer')
);
const StockAdjustment = React.lazy(
  () => import('../pages/inventory/stock-adjustment')
);
const ReturnToSupplier = React.lazy(
  () => import('../pages/inventory/return-to-supplier')
);
const WithDrawVehicle = React.lazy(
  () => import('../pages/inventory/issue/Issue')
);
const Return = React.lazy(() => import('../pages/inventory/returns/Return'));

// Report Pages
const ArAgingPage = React.lazy(() => import('../pages/reports/ArAgingPage'));
const ContractExpirationPage = React.lazy(() => import('../pages/reports/ContractExpirationPage'));
const TechnicianPerformancePage = React.lazy(() => import('../pages/reports/TechnicianPerformancePage'));
const InventoryUsagePage = React.lazy(() => import('../pages/reports/InventoryUsagePage'));
const SalesPipelinePage = React.lazy(() => import('../pages/reports/SalesPipelinePage'));
const ProfitLossPage = React.lazy(() => import('../pages/reports/ProfitLossPage'));

// Unified Configuration - All routes and navigation in one place
const UNIFIED_CONFIG: UnifiedConfig[] = [
  // Main Dashboard
  {
    name: 'Dashboard',
    path: 'dashboard',
    icon: NewDashboardIcon,
    access: 'ACCESS_DASHBOARD',
    component: Dashboard,
  },

  // System
  {
    name: 'การแจ้งเตือนและนัดหมาย',
    path: 'notifications',
    icon: BellIcon,
    access: '',
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO],
    component: Notification,
  },

  // Customer Management
  {
    name: 'ลูกค้า',
    path: 'customers',
    icon: NewCustomerIcon,
    access: 'ACCESS_CUSTOMER',
    component: Customer,
  },
  {
    name: 'ใบประเมิน',
    path: 'assessments',
    icon: DocumentTextIcon,
    access: 'ACCESS_ASSESSMENT',
    component: Assessments,
  },

  // Field Operations
  {
    name: 'ภาคสนาม',
    path: 'field-operations',
    icon: NewFieldOpsIcon,
    access: null,
    component: FieldOperations,
    getProps: (data) => ({
      users: data.users,
      jobs: data.jobs,
      assessments: data.assessments,
      contracts: data.contracts,
      quotations: data.quotations,
      products: data.products,
      customers: data.customers,
      warehouses: data.warehouses,
      onUpdateAssessment: data.handlers.assessments.update,
      onUpdateQuotation: data.handlers.quotations.update,
      onCreateQuotation: data.handlers.quotations.create,
    }),
  },

  // Billing & Finance Group
  {
    name: 'การเงินและบัญชี',
    path: 'billing',
    icon: NewAccountingIcon,
    access: null,
    group: 'billing',
    component: Quotation,
    subItems: [
      {
        name: 'ใบเสนอราคา',
        path: 'quotations',
        icon: DocumentTextIcon,
        access: 'ACCESS_QUOTATION',
        component: Quotation,
        getProps: (data) => ({
          onCreateQuotation: data.handlers.quotations.create,
          onUpdateQuotation: data.handlers.quotations.update,
          onDeleteQuotation: data.handlers.quotations.delete,
          onReviseQuotation: data.handlers.quotations.revise,
        }),
      },
      {
        name: 'ใบสัญญา',
        path: 'contracts',
        icon: DocumentTextIcon,
        access: 'ACCESS_CONTRACT',
        component: Contract,
      },
      {
        name: 'ใบแจ้งหนี้',
        path: 'invoice',
        icon: CurrencyDollarIcon,
        access: 'ACCESS_INVOICE',
        component: Invoice,
      },
      {
        name: 'ใบกำกับภาษี/ใบเสร็จรับเงิน',
        path: 'receipts',
        icon: ShieldCheckIcon,
        access: 'ACCESS_RECEIPT',
        component: Receipt,
      },
    ],
  },

  // Inventory Groups
  {
    name: 'คลังสินค้า',
    path: 'warehouse',
    icon: BuildingOfficeIcon,
    access: null,
    group: 'inventory',
    component: Warehouse,
    subItems: [
      {
        name: 'คลังสินค้า',
        path: 'warehouse',
        icon: BuildingOfficeIcon,
        access: 'ACCESS_WAREHOUSE',
        component: Warehouse,
      },
      {
        name: 'รับเข้า',
        path: 'goods-receipt',
        icon: NewWarehouseIcon,
        access: 'ACCESS_RECEIVE_NOTE',
        component: GoodReceipt,
        getProps: (data) => ({
          onCreateReceipt: data.handlers.goodsReceipts.create,
          onUpdateReceipt: data.handlers.goodsReceipts.update,
          onDeleteReceipt: data.handlers.goodsReceipts.delete,
        }),
      },
      {
        name: 'โอนย้าย',
        path: 'transfers',
        icon: NewWarehouseIcon,
        access: 'ACCESS_TRANSFER_NOTE',
        component: Transfer,
      },
      {
        name: 'ปรับปรุง Stock',
        path: 'stock-adjustment',
        icon: NewWarehouseIcon,
        access: 'ACCESS_ADJUSTMENT_NOTE',
        component: StockAdjustment,
        getProps: (data) => ({
          onCreateAdjustment: data.handlers.stockAdjustments.create,
          onUpdateAdjustment: data.handlers.stockAdjustments.update,
          onDeleteAdjustment: data.handlers.stockAdjustments.delete,
        }),
      },
      {
        name: 'เบิกสินค้าคืนผู้จำหน่าย',
        path: 'return-to-supplier',
        icon: NewWarehouseIcon,
        access: 'ACCESS_RETURN_NOTE',
        component: ReturnToSupplier,
        getProps: (data) => ({
          onCreateReturn: data.handlers.returnToSuppliers.create,
          onUpdateReturn: data.handlers.returnToSuppliers.update,
          onDeleteReturn: data.handlers.returnToSuppliers.delete,
        }),
      },
    ],
  },

  {
    name: 'จัดการสินค้าภายใน',
    path: 'inventory-internal',
    icon: NewWarehouseIcon,
    access: null,
    group: 'inventory',
    component: Withdrawals,
    subItems: [
      {
        name: 'เบิกสินค้าเข้าคลังย่อย',
        path: 'withdraw-vehicle',
        icon: NewWarehouseIcon,
        access: 'ACCESS_WITHDRAW_NOTE',
        component: WithDrawVehicle,
      },
      {
        name: 'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
        path: 'withdrawals',
        icon: DocumentTextIcon,
        access: 'ACCESS_SUMMARY_WITHDRAW',
        component: Withdrawals,
      },
      {
        name: 'คืนสินค้า',
        path: 'returns',
        icon: NewWarehouseIcon,
        access: 'ACCESS_RETURN_NOTE',
        component: Return,
        getProps: (data) => ({
          onCreateReturn: data.handlers.productReturns.create,
          onUpdateReturn: data.handlers.productReturns.update,
          onDeleteReturn: data.handlers.productReturns.delete,
        }),
      },
    ],
  },

  // Product Management
  {
    name: 'ข้อมูลสินค้าเเละคู่ค้า',
    path: 'products',
    icon: PackageIcon,
    access: null,
    component: Product,
    subItems: [
      {
        name: 'สินค้า/บริการ',
        path: 'products',
        access: 'ACCESS_PRODUCT',
        component: Product,
      },
      {
        name: 'แพ็กเกจ',
        path: 'packages',
        access: 'ACCESS_PACKAGES',
        component: Package,
      },
      {
        name: 'หมวดหมู่',
        path: 'categories',
        access: 'ACCESS_CATEGORY',
        component: Category,
      },
      {
        name: 'ผู้จัดจำหน่าย',
        path: 'suppliers',
        access: 'ACCESS_SUPPLIER',
        component: Supplier,
      },
      {
        name: 'หน่วยนับ',
        path: 'units',
        access: 'ACCESS_UNIT',
        component: UnitPage,
      },
    ],
  },

  // System Settings
  {
    name: 'การตั้งค่าระบบ',
    path: 'users',
    icon: NewUsersIcon,
    access: null,
    component: User,
    subItems: [
      {
        name: 'ผู้ใช้งาน',
        path: 'users',
        access: 'ACCESS_USER',
      },
      {
        name: 'จัดการบทบาท',
        path: 'roles',
        access: 'ACCESS_ROLE',
        getProps: (data) => ({ defaultView: 'roles' }),
      },
    ],
    getProps: (data) => ({
      onCreateUser: data.handlers.users.create,
      onUpdateUser: data.handlers.users.update,
      onDeleteUser: data.handlers.users.delete,
      onCreateWalletTransaction: data.handlers.userWallets.createTransaction,
    }),
  },

  // Reports
  {
    name: 'รายงาน',
    path: 'reports',
    icon: NewReportIcon,
    access: null,
    component: Reports,
    subItems: [
      {
        name: 'รายงานรายได้ (รายเดือน)',
        path: 'reports/total-income',
        access: 'ACCESS_REPORT_SALES',
      },
      {
        name: 'รายได้ออกใบกำกับ(รายเดือน)',
        path: 'reports/tax-invoice-income',
        access: 'ACCESS_REPORT_SALES',
      },
      {
        name: 'ค่าใช้จ่ายทางอ้อม',
        path: 'reports/indirect-expenses',
        access: 'ACCESS_REPORT_PURCHASE',
      },
      {
        name: 'บัญชีเงินสดรายวัน',
        path: 'reports/daily-cash',
        access: 'ACCESS_REPORT_FINANCIAL',
      },
      {
        name: 'ค่าใช้จ่ายทางตรง',
        path: 'reports/direct-expenses',
        access: 'ACCESS_REPORT_PURCHASE',
      },
      {
        name: 'ยอดขาย(รายเดือน)',
        path: 'reports/monthly-sales',
        access: 'ACCESS_REPORT_SALES',
      },
      {
        name: 'สรุปยอดขาย(รายเดือน)',
        path: 'reports/sales-summary',
        access: 'ACCESS_REPORT_SALES',
      },
      {
        name: 'ลูกหนี้ค้างชำระ',
        path: 'reports/ar-aging',
        access: 'ACCESS_REPORT_FINANCIAL',
        component: ArAgingPage,
      },
      {
        name: 'สัญญาใกล้หมดอายุ',
        path: 'reports/contract-expiration',
        access: 'ACCESS_REPORT_SALES',
        component: ContractExpirationPage,
      },
      {
        name: 'ผลงานช่าง',
        path: 'reports/technician-performance',
        access: 'ACCESS_REPORT_SALES',
        component: TechnicianPerformancePage,
      },
      {
        name: 'การใช้สินค้า/เคมีภัณฑ์',
        path: 'reports/inventory-usage',
        access: 'ACCESS_REPORT_PURCHASE',
        component: InventoryUsagePage,
      },
      {
        name: 'Sales Pipeline',
        path: 'reports/sales-pipeline',
        access: 'ACCESS_REPORT_SALES',
        component: SalesPipelinePage,
      },
      {
        name: 'กำไร-ขาดทุน',
        path: 'reports/profit-loss',
        access: 'ACCESS_REPORT_FINANCIAL',
        component: ProfitLossPage,
      },
    ],
  },
];

// Generate Routes with proper props
export const createRoutes = (data: DataContextType): RouteConfig[] => {
  const routes: RouteConfig[] = [];

  // Root redirect (role-aware)
  const RoleRedirect = () => {
    try {
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        if (user.role === Role.LEAD_TECH || user.role === Role.TECH) {
          return React.createElement(Navigate, { to: '/field-operations', replace: true });
        }
      }
    } catch {}
    return React.createElement(Navigate, { to: '/dashboard', replace: true });
  };

  routes.push({
    path: '/',
    element: React.createElement(RoleRedirect),
  });

  UNIFIED_CONFIG.forEach((config) => {
    if (config.subItems) {
      // Handle grouped items - create route for parent first
      const parentProps = config.getProps ? config.getProps(data) : {};
      routes.push({
        path: `/${config.path}`,
        access: config.access,
        element: React.createElement(config.component, parentProps),
      });

      // Then create routes for each sub-item
      config.subItems.forEach((subItem) => {
        const props = subItem.getProps ? subItem.getProps(data) : {};
        const subItemComponent = subItem.component || config.component;
        routes.push({
          path: `/${subItem.path}`,
          access: subItem.access,
          element: React.createElement(subItemComponent, props),
        });
      });
    } else {
      // Handle single items
      const props = config.getProps ? config.getProps(data) : {};
      routes.push({
        path: `/${config.path}`,
        access: config.access,
        element: React.createElement(config.component, props),
      });
    }
  });

  // Fallback redirect
  routes.push({
    path: '*',
    element: React.createElement(Navigate, { to: '/dashboard', replace: true }),
  });

  return routes;
};

// Generate Navigation Items
export const createNavigationItems = (): NavigationItem[] => {
  return UNIFIED_CONFIG.map((config): NavigationItem => {
    if (config.subItems) {
      return {
        type: 'group',
        name: config.name,
        icon: config.icon as React.FC<any>,
        subItems: config.subItems.map((sub) => ({
          name: sub.name as any,
          icon: (sub.icon as React.FC<any>) || DocumentTextIcon,
          access: sub.access,
        })),
      };
    }

    return {
      type: 'link',
      name: config.name as any,
      icon: (config.icon as React.FC<any>) || DocumentTextIcon,
      access: config.access,
      roles: config.roles,
    };
  });
};

// Generate Page Paths
export const PAGE_PATH = UNIFIED_CONFIG.reduce(
  (acc, config) => {
    acc[config.name] = config.path;
    if (config.subItems) {
      config.subItems.forEach((sub) => {
        acc[sub.name] = sub.path;
      });
    }
    return acc;
  },
  {} as Record<string, string>
);

// Navigation Items
export const NAVIGATION_ITEMS = createNavigationItems();

// Helper functions
export const getPagePath = (name: string): string | undefined => {
  const config = UNIFIED_CONFIG.find((c) => c.name === name);
  return config ? config.path : undefined;
};

export const canAccessNavigation = (
  item: NavigationItem,
  userRole: string,
  userPermissions: string[]
): boolean => {
  if (item.roles && !item.roles.includes(userRole as any)) {
    return false;
  }

  if (
    item.type === 'link' &&
    item.access &&
    !userPermissions.includes(item.access)
  ) {
    return false;
  }

  return true;
};
