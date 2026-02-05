import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';

// Entities
import { User } from '@/src/types/entity/core.interface';
import { Job } from '@/src/types/entity/job.interface';
import { Assessment } from '@/src/types/entity/assessment.interface';
import { Contract } from '@/src/types/entity/financial.interface';
import {
  Quotation,
  Invoice,
  Receipt,
  ReturnToSupplier,
  UserWallet,
} from '@/src/types/entity/financial.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { Product } from '@/src/types/entity/product.interface';
import {
  Warehouse,
  Withdrawal,
  Transfer,
  StockAdjustment,
  ProductReturn,
} from '@/src/types/entity/inventory.interface';
import { Requisition, RequisitionStatus } from '@/src/types/entity/requisition.interface'; // New Import
import { GoodsReceipt } from '@/src/types/entity/good-receipt';
import { Supplier } from '@/src/types/entity/supplier.interface';
import { CategoryType } from '@/src/types/enums/category'; // Or interface?

// APIs
import { UserApi } from '@/src/api/user';
import { JobApi } from '@/src/api/job';
import { AssessmentApi } from '@/src/api/assessment';
import { ContractApi } from '@/src/api/contract';
import { QuotationApi } from '@/src/api/quotation';
import { InvoiceApi } from '@/src/api/invoice';
import { ReceiptApi } from '@/src/api/receipt';
import { CustomerApi } from '@/src/api/customer';
import { ProductApi } from '@/src/api/product';
import { WarehouseApi } from '@/src/api/warehouse';
import { SupplierApi } from '@/src/api/supplier';
import { GoodsReceiptApi } from '@/src/api/goods-receipt';
import { TransferApi } from '@/src/api/transfer';
import { StockAdjustmentApi } from '@/src/api/stock-adjustment';
import { ProductReturnApi } from '@/src/api/product-return';
import { ReturnToSupplierApi } from '@/src/api/return-to-supplier';
import { WithdrawalApi } from '@/src/api/withdrawal';
import { CategoryApi } from '@/src/api/category';
import { PackageApi } from '@/src/api/package';
import { RequisitionApi } from '@/src/api/requisition';

export type ResourceType =
  | 'users'
  | 'jobs'
  | 'assessments'
  | 'contracts'
  | 'quotations'
  | 'invoices'
  | 'receipts'
  | 'customers'
  | 'products'
  | 'warehouses'
  | 'suppliers'
  | 'goodsReceipts'
  | 'withdrawals'
  | 'transfers'
  | 'stockAdjustments'
  | 'productReturns'
  | 'returnToSuppliers'
  | 'requisitions';

export interface DataContextType {
  users: User[];
  jobs: Job[];
  assessments: Assessment[];
  contracts: Contract[];
  quotations: Quotation[];
  invoices: Invoice[];
  receipts: Receipt[];
  customers: Customer[];
  products: Product[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  goodsReceipts: GoodsReceipt[];
  withdrawals: Withdrawal[];
  transfers: Transfer[];
  stockAdjustments: StockAdjustment[];
  productReturns: ProductReturn[];
  returnToSuppliers: ReturnToSupplier[];
  requisitions: Requisition[];

  fetchData: (resources?: ResourceType[]) => Promise<void>;

  handlers: {
    users: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    jobs: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    assessments: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    contracts: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    quotations: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
      revise: (id: string) => Promise<void>;
    };
    invoices: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    receipts: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    warehouses: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
      updateLimits: (id: string, limits: any) => Promise<void>;
    };
    goodsReceipts: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    withdrawals: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    transfers: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    stockAdjustments: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    productReturns: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    returnToSuppliers: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    requisitions: {
      create: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: (id: string) => Promise<void>;
      approve: (id: string, data: any) => Promise<void>;
    };
    userWallets: {
      createTransaction: (userId: string, data: any) => Promise<void>;
    };
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(
    []
  );
  const [productReturns, setProductReturns] = useState<ProductReturn[]>([]);
  const [returnToSuppliers, setReturnToSuppliers] = useState<
    ReturnToSupplier[]
  >([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);

  // Helper to safely fetch data - returns empty array if API fails
  const safeFetch = async <T,>(
    fetchFn: () => Promise<any>
  ): Promise<T[]> => {
    try {
      const res = await fetchFn();
      if (Array.isArray(res)) return res;
      return res.data || [];
    } catch {
      return [];
    }
  };

  const fetchData = async (resources?: ResourceType[]) => {
    // If no resources specified, fetch defaults (or all that are currently active)
    const shouldFetch = (resource: ResourceType) =>
      !resources || resources.includes(resource);

    const promises: Promise<void>[] = [];

    if (shouldFetch('users')) {
      promises.push(safeFetch(() => UserApi.getAll({ limit: 100 })).then((data: any) => setUsers(data)));
    }
    if (shouldFetch('jobs')) {
      // promises.push(safeFetch(() => JobApi.getAll({ limit: 100 })).then((data: any) => setJobs(data)));
    }
    if (shouldFetch('assessments')) {
      // promises.push(safeFetch(() => AssessmentApi.getAll({ limit: 100 })).then((data: any) => setAssessments(data)));
    }
    if (shouldFetch('contracts')) {
      // promises.push(safeFetch(() => ContractApi.getAll({ limit: 100 })).then((data: any) => setContracts(data)));
    }
    if (shouldFetch('quotations')) {
      // promises.push(safeFetch(() => QuotationApi.getAll({ limit: 100 })).then(setQuotations));
      setQuotations([]);
    }
    if (shouldFetch('invoices')) {
      // promises.push(safeFetch(() => InvoiceApi.getAll({ limit: 100 })).then(setInvoices));
      setInvoices([]);
    }
    if (shouldFetch('receipts')) {
      // promises.push(safeFetch(() => ReceiptApi.getAll({ limit: 100 })).then(setReceipts));
      setReceipts([]);
    }
    if (shouldFetch('customers')) {
      promises.push(safeFetch(() => CustomerApi.getCustomers({ limit: 100 })).then((data: any) => setCustomers(data)));
    }
    if (shouldFetch('products')) {
      promises.push(safeFetch(() => ProductApi.getProducts({ limit: 100 })).then((data: any) => setProducts(data)));
    }
    if (shouldFetch('warehouses')) {
      promises.push(safeFetch(() => WarehouseApi.getWarehouses({ limit: 100 })).then((data: any) => setWarehouses(data)));
    }
    if (shouldFetch('suppliers')) {
      // promises.push(safeFetch(() => SupplierApi.getSuppliers({ limit: 100 })).then(setSuppliers));
      setSuppliers([]);
    }
    if (shouldFetch('goodsReceipts')) {
      // promises.push(safeFetch(() => GoodsReceiptApi.getAll({ limit: 100 })).then(setGoodsReceipts));
      setGoodsReceipts([]);
    }
    if (shouldFetch('withdrawals')) {
      promises.push(safeFetch(() => WithdrawalApi.getAll({ limit: 100 })).then((data: any) => setWithdrawals(data)));
    }
    if (shouldFetch('transfers')) {
      // promises.push(safeFetch(() => TransferApi.getAll({ limit: 100 })).then(setTransfers));
      setTransfers([]);
    }
    if (shouldFetch('stockAdjustments')) {
      // promises.push(safeFetch(() => StockAdjustmentApi.getAll({ limit: 100 })).then(setStockAdjustments));
      setStockAdjustments([]);
    }
    if (shouldFetch('productReturns')) {
      // promises.push(safeFetch(() => ProductReturnApi.getAll({ limit: 100 })).then(setProductReturns));
      setProductReturns([]);
    }
    if (shouldFetch('returnToSuppliers')) {
      // promises.push(safeFetch(() => ReturnToSupplierApi.getAll({ limit: 100 })).then(setReturnToSuppliers));
      setReturnToSuppliers([]);
    }
    if (shouldFetch('requisitions')) {
      // promises.push(safeFetch(() => RequisitionApi.getAll({ limit: 100 })).then(setRequisitions));
      setRequisitions([]);
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    // Initial fetch of active modules
    fetchData();
  }, []);

  const handlers = useMemo(
    () => ({
      users: {
        create: async (data: any) => {
          await UserApi.create(data);
          fetchData(['users']);
        },
        update: async (data: any) => {
          await UserApi.update(data.id, data);
          fetchData(['users']);
        },
        delete: async (id: string) => {
          await UserApi.delete(id);
          fetchData(['users']);
        },
      },
      jobs: {
        create: async (data: any) => {
          await JobApi.create(data);
          fetchData(['jobs']);
        },
        update: async (data: any) => {
          await JobApi.update(data.id, data);
          fetchData(['jobs']);
        },
        delete: async (id: string) => {
          await JobApi.delete(id);
          fetchData(['jobs']);
        },
      },
      assessments: {
        create: async (data: any) => {
          await AssessmentApi.create(data);
          fetchData(['assessments']);
        },
        update: async (data: any) => {
          await AssessmentApi.update(data.id, data);
          fetchData(['assessments']);
        },
        delete: async (id: string) => {
          await AssessmentApi.delete(id);
          fetchData(['assessments']);
        },
      },
      contracts: {
        create: async (data: any) => {
          await ContractApi.create(data);
          fetchData(['contracts']);
        },
        update: async (data: any) => {
          await ContractApi.update(data.id, data);
          fetchData(['contracts']);
        },
        delete: async (id: string) => {
          await ContractApi.delete(id);
          fetchData(['contracts']);
        },
      },
      quotations: {
        create: async (data: any) => {
          await QuotationApi.create(data);
          // fetchData(['quotations']);
        },
        update: async (data: any) => {
          await QuotationApi.update(data.id, data);
          // fetchData(['quotations']);
        },
        delete: async (id: string) => {
          await QuotationApi.delete(id);
          // fetchData(['quotations']);
        },
        revise: async (id: string) => {
          console.log('Revise quotation', id);
          // fetchData(['quotations']);
        },
      },
      invoices: {
        create: async (data: any) => {
          await InvoiceApi.create(data);
          // fetchData(['invoices']);
        },
        update: async (data: any) => {
          await InvoiceApi.update(data.id, data);
          // fetchData(['invoices']);
        },
        delete: async (id: string) => {
          await InvoiceApi.delete(id);
          // fetchData(['invoices']);
        },
      },
      receipts: {
        create: async (data: any) => {
          await ReceiptApi.create(data);
          // fetchData(['receipts']);
        },
        update: async (data: any) => {
          await ReceiptApi.update(data.id, data);
          // fetchData(['receipts']);
        },
        delete: async (id: string) => {
          await ReceiptApi.delete(id);
          // fetchData(['receipts']);
        },
      },
      warehouses: {
        create: async (data: any) => {
          await WarehouseApi.create(data);
          fetchData(['warehouses']);
        },
        update: async (data: any) => {
          await WarehouseApi.update(data.id, data);
          fetchData(['warehouses']);
        },
        delete: async (id: string) => {
          await WarehouseApi.delete(id);
          fetchData(['warehouses']);
        },
        updateLimits: async (id: string, limits: any) => {
          await WarehouseApi.update(id, { withdrawal_limits: limits });
          fetchData(['warehouses']);
        },
      },
      goodsReceipts: {
        create: async (data: any) => {
          await GoodsReceiptApi.create(data);
          // fetchData(['goodsReceipts']);
        },
        update: async (data: any) => {
          await GoodsReceiptApi.update(data.id, data);
          // fetchData(['goodsReceipts']);
        },
        delete: async (id: string) => {
          await GoodsReceiptApi.delete(id);
          // fetchData(['goodsReceipts']);
        },
      },
      withdrawals: {
        create: async (data: any) => {
          await WithdrawalApi.create(data);
          fetchData(['withdrawals', 'products', 'warehouses']); // Creating withdrawal affects stock and products logic potentially
        },
        update: async (data: any) => {
          await WithdrawalApi.update(data.id, data);
          fetchData(['withdrawals']);
        },
        delete: async (id: string) => {
          await WithdrawalApi.delete(id);
          fetchData(['withdrawals']);
        },
      },
      transfers: {
        create: async (data: any) => {
          await TransferApi.create(data);
          // fetchData(['transfers']);
        },
        update: async (data: any) => {
          await TransferApi.update(data.id, data);
          // fetchData(['transfers']);
        },
        delete: async (id: string) => {
          await TransferApi.delete(id);
          // fetchData(['transfers']);
        },
      },
      stockAdjustments: {
        create: async (data: any) => {
          await StockAdjustmentApi.create(data);
          // fetchData(['stockAdjustments']);
        },
        update: async (data: any) => {
          await StockAdjustmentApi.update(data.id, data);
          // fetchData(['stockAdjustments']);
        },
        delete: async (id: string) => {
          await StockAdjustmentApi.delete(id);
          // fetchData(['stockAdjustments']);
        },
      },
      productReturns: {
        create: async (data: any) => {
          await ProductReturnApi.create(data);
          // fetchData(['productReturns']);
        },
        update: async (data: any) => {
          await ProductReturnApi.update(data.id, data);
          // fetchData(['productReturns']);
        },
        delete: async (id: string) => {
          await ProductReturnApi.delete(id);
          // fetchData(['productReturns']);
        },
      },
      returnToSuppliers: {
        create: async (data: any) => {
          await ReturnToSupplierApi.create(data);
          // fetchData(['returnToSuppliers']);
        },
        update: async (data: any) => {
          await ReturnToSupplierApi.update(data.id, data);
          // fetchData(['returnToSuppliers']);
        },
        delete: async (id: string) => {
          await ReturnToSupplierApi.delete(id);
          // fetchData(['returnToSuppliers']);
        },
      },
      requisitions: {
        create: async (data: any) => {
          await RequisitionApi.create(data);
          // fetchData(['requisitions']);
        },
        update: async (data: any) => {
          await RequisitionApi.update(data.id, data);
          // fetchData(['requisitions']);
        },
        delete: async (id: string) => {
          await RequisitionApi.delete(id);
          // fetchData(['requisitions']);
        },
        approve: async (id: string, data: any) => {
          await RequisitionApi.approve(id, data);
          // fetchData(['requisitions']);
        }
      },
      userWallets: {
        createTransaction: async (userId: string, data: any) => {
          console.log('Create wallet transaction', userId, data);
          // fetchData(['users']);
        },
      },
    }),
    []
  );

  return (
    <DataContext.Provider
      value={{
        users,
        jobs,
        assessments,
        contracts,
        quotations,
        invoices,
        receipts,
        customers,
        products,
        warehouses,
        suppliers,
        goodsReceipts,
        withdrawals,
        transfers,
        stockAdjustments,
        productReturns,
        returnToSuppliers,
        requisitions,
        fetchData,
        handlers,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
