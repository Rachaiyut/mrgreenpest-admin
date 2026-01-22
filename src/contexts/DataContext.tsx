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
import { FieldJob } from '@/src/types/entity/field-job.interface';
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
import { Product } from '@/src/types/entity/package.interface';
import {
  Warehouse,
  GoodsReceipt,
  Withdrawal,
  Transfer,
  StockAdjustment,
  ProductReturn,
} from '@/src/types/entity/inventory.interface';
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
import { WithdrawalApi } from '@/src/api/withdrawal';
import { TransferApi } from '@/src/api/transfer';
import { StockAdjustmentApi } from '@/src/api/stock-adjustment';
import { ProductReturnApi } from '@/src/api/product-return';
import { ReturnToSupplierApi } from '@/src/api/return-to-supplier';
import { Category as CategoryApi } from '@/src/api/category';
import { Package as PackageApi } from '@/src/api/package';

export interface DataContextType {
  users: User[];
  jobs: FieldJob[];
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
  const [jobs, setJobs] = useState<FieldJob[]>([]);
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

  const refreshData = async () => {
    try {
      const [
        usersRes,
        jobsRes,
        assessmentsRes,
        contractsRes,
        quotationsRes,
        invoicesRes,
        receiptsRes,
        customersRes,
        productsRes,
        warehousesRes,
        suppliersRes,
        goodsReceiptsRes,
        withdrawalsRes,
        transfersRes,
        stockAdjustmentsRes,
        productReturnsRes,
        returnToSuppliersRes,
      ] = await Promise.all([
        UserApi.getAll(),
        JobApi.getAll(),
        AssessmentApi.getAll(),
        ContractApi.getAll(),
        QuotationApi.getAll(),
        InvoiceApi.getAll(),
        ReceiptApi.getAll(),
        CustomerApi.getCustomers({}),
        ProductApi.getProducts({}),
        WarehouseApi.getWarehouses(),
        SupplierApi.getSuppliers({}),
        GoodsReceiptApi.getAll(),
        WithdrawalApi.getAll(),
        TransferApi.getAll(),
        StockAdjustmentApi.getAll(),
        ProductReturnApi.getAll(),
        ReturnToSupplierApi.getAll(),
      ]);

      setUsers(usersRes.data || []);
      setJobs(jobsRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setContracts(contractsRes.data || []);
      setQuotations(quotationsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setReceipts(receiptsRes.data || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setGoodsReceipts(goodsReceiptsRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
      setTransfers(transfersRes.data || []);
      setStockAdjustments(stockAdjustmentsRes.data || []);
      setProductReturns(productReturnsRes.data || []);
      setReturnToSuppliers(returnToSuppliersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handlers = useMemo(
    () => ({
      users: {
        create: async (data: any) => {
          await UserApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await UserApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await UserApi.delete(id);
          refreshData();
        },
      },
      jobs: {
        create: async (data: any) => {
          await JobApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await JobApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await JobApi.delete(id);
          refreshData();
        },
      },
      assessments: {
        create: async (data: any) => {
          await AssessmentApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await AssessmentApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await AssessmentApi.delete(id);
          refreshData();
        },
      },
      quotations: {
        create: async (data: any) => {
          await QuotationApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await QuotationApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await QuotationApi.delete(id);
          refreshData();
        },
        revise: async (id: string) => {
          // Implement revise logic if API supports it, otherwise create new version
          console.log('Revise quotation', id);
          refreshData();
        },
      },
      invoices: {
        create: async (data: any) => {
          await InvoiceApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await InvoiceApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await InvoiceApi.delete(id);
          refreshData();
        },
      },
      receipts: {
        create: async (data: any) => {
          await ReceiptApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await ReceiptApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await ReceiptApi.delete(id);
          refreshData();
        },
      },
      warehouses: {
        create: async (data: any) => {
          await WarehouseApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await WarehouseApi.update(data.id, data);
          refreshData();
        }, // Ensure API has update method
        delete: async (id: string) => {
          await WarehouseApi.delete(id);
          refreshData();
        }, // Ensure API has delete method
        updateLimits: async (id: string, limits: any) => {
          // Custom update for limits
          await WarehouseApi.update(id, { withdrawal_limits: limits });
          refreshData();
        },
      },
      goodsReceipts: {
        create: async (data: any) => {
          await GoodsReceiptApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await GoodsReceiptApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await GoodsReceiptApi.delete(id);
          refreshData();
        },
      },
      withdrawals: {
        create: async (data: any) => {
          await WithdrawalApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await WithdrawalApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await WithdrawalApi.delete(id);
          refreshData();
        },
      },
      transfers: {
        create: async (data: any) => {
          await TransferApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await TransferApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await TransferApi.delete(id);
          refreshData();
        },
      },
      stockAdjustments: {
        create: async (data: any) => {
          await StockAdjustmentApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await StockAdjustmentApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await StockAdjustmentApi.delete(id);
          refreshData();
        },
      },
      productReturns: {
        create: async (data: any) => {
          await ProductReturnApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await ProductReturnApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await ProductReturnApi.delete(id);
          refreshData();
        },
      },
      returnToSuppliers: {
        create: async (data: any) => {
          await ReturnToSupplierApi.create(data);
          refreshData();
        },
        update: async (data: any) => {
          await ReturnToSupplierApi.update(data.id, data);
          refreshData();
        },
        delete: async (id: string) => {
          await ReturnToSupplierApi.delete(id);
          refreshData();
        },
      },
      userWallets: {
        createTransaction: async (userId: string, data: any) => {
          // Needs Wallet API
          console.log('Create wallet transaction', userId, data);
          refreshData();
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

