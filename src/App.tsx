import { useState, useCallback, useEffect } from 'react';
import type { FC, Dispatch, SetStateAction } from 'react';

// Base
import { ILOCAL_STORAGE } from './libs/common/interface/entity/auth.interface';

// Router
import { AppRouter } from './libs/router/router';

// Type
import {
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
} from '@/src/libs/common/interface/entity/app.interface';

// Service
import { Auth } from './libs/api/auth';

// MOCK data
import { MOCK_USERS, MOCK_WAREHOUSES, MOCK_SUPPLIERS, MOCK_CATEGORIES, MOCK_USER_WALLETS, MOCK_CUSTOMERS, MOCK_RETURN_TO_SUPPLIERS } from './constants';
import { MOCK_ASSESSMENTS, MOCK_FIELD_JOBS, MOCK_CONTRACTS, MOCK_QUOTATIONS, MOCK_PRODUCTS, MOCK_GOODS_RECEIPTS, MOCK_WITHDRAWALS, MOCK_TRANSFERS, MOCK_STOCK_ADJUSTMENTS, MOCK_PRODUCT_RETURNS, MOCK_INVOICES, MOCK_RECEIPTS } from './constants';

const App: FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(ILOCAL_STORAGE.USER_TOKEN);
    } catch { return false; }
  });

  const handleLogin = useCallback((username: string, remember: boolean) => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('isAuthenticated', 'true');
      if (!remember) {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }
    } catch { }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await Auth.logout();
    } catch {}
    
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(ILOCAL_STORAGE.USER_TOKEN);
      localStorage.removeItem(ILOCAL_STORAGE.USER_PROFILE);
      localStorage.removeItem('isAuthenticated');
    } catch { }
  }, []);

  // --- Centralized State ---
  const [assessments, setAssessments] = useState<Assessment[]>(MOCK_ASSESSMENTS);
  const [fieldJobs, setFieldJobs] = useState<FieldJob[]>(MOCK_FIELD_JOBS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [quotations, setQuotations] = useState<Quotation[]>(MOCK_QUOTATIONS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>(MOCK_WAREHOUSES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptType[]>(MOCK_GOODS_RECEIPTS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalType[]>(MOCK_WITHDRAWALS);
  const [transfers, setTransfers] = useState<TransferType[]>(MOCK_TRANSFERS);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentType[]>(MOCK_STOCK_ADJUSTMENTS);
  const [productReturns, setProductReturns] = useState<ProductReturnType[]>(MOCK_PRODUCT_RETURNS);
  const [returnToSuppliers, setReturnToSuppliers] = useState<ReturnToSupplierType[]>(MOCK_RETURN_TO_SUPPLIERS);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [receipts, setReceipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [userWallets, setUserWallets] = useState<UserWallet[]>(MOCK_USER_WALLETS);
  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, Record<string, number>>>(() => {
    const nameToId = new Map(MOCK_WAREHOUSES.map(w => [w.name, w.id]));
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
  const createHandler = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>, prefix: string, padLength: number = 4) => (data: Omit<T, 'id'>) => {
    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
    const id = `${prefix.toUpperCase()}${prefix.includes('GR') || prefix.includes('SR') || prefix.includes('IT') || prefix.includes('SA') || prefix.includes('RT') ? thaiYearLastTwoDigits : ''}-${String(Date.now()).slice(-6)}`;
    setter(prev => [...prev, { ...data, id } as T]);
  };

  const updateHandler = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) => (updatedItem: T) => {
    setter(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const deleteHandler = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) => (id: string) => {
    setter(prev => prev.filter(item => item.id !== id));
  };

  const adjustStock = useCallback((warehouseId: string, productId: string, delta: number) => {
    setWarehouseStocks(prev => {
      const next: Record<string, Record<string, number>> = { ...prev };
      if (!next[warehouseId]) next[warehouseId] = {};
      const current = next[warehouseId][productId] || 0;
      const updated = Math.max(0, current + delta);
      next[warehouseId][productId] = updated;
      setProducts(prevProducts => {
        const totals: Record<string, number> = {};
        for (const p of prevProducts) totals[p.id] = 0;
        for (const wh of Object.keys(next)) {
          for (const pid of Object.keys(next[wh])) {
            totals[pid] = (totals[pid] || 0) + next[wh][pid];
          }
        }
        return prevProducts.map(p => ({ ...p, stock: totals[p.id] ?? p.stock }));
      });
      return next;
    });
  }, []);

  const updateGoodsReceipt = useCallback((updated: GoodsReceiptType) => {
    setGoodsReceipts(prev => {
      const prevItem = prev.find(r => r.id === updated.id);
      const next = prev.map(r => r.id === updated.id ? updated : r);
      if (prevItem && prevItem.status !== Status.Approved && updated.status === Status.Approved) {
        for (const it of updated.items) adjustStock(updated.warehouseId, it.productId, Number(it.quantity) || 0);
      }
      return next;
    });
  }, [adjustStock]);

  const updateWithdrawal = useCallback((updated: WithdrawalType) => {
    setWithdrawals(prev => {
      const prevItem = prev.find(w => w.id === updated.id);
      const next = prev.map(w => w.id === updated.id ? updated : w);
      if (prevItem && prevItem.status !== Status.Approved && updated.status === Status.Approved) {
        for (const it of updated.items) {
          adjustStock(updated.fromWarehouseId, it.productId, -(Number(it.quantity) || 0));
          if (updated.toWarehouseId) adjustStock(updated.toWarehouseId, it.productId, Number(it.quantity) || 0);
        }
      }
      return next;
    });
  }, [adjustStock]);

  const createTransfer = useCallback((data: Omit<TransferType, 'id'>) => {
    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
    const id = `IT${thaiYearLastTwoDigits}-${String(Date.now()).slice(-6)}`;
    const newItem: TransferType = { ...(data as any), id };
    setTransfers(prev => [...prev, newItem]);
    for (const it of data.items) {
      adjustStock(data.fromWarehouseId, it.productId, -(Number(it.quantity) || 0));
      adjustStock(data.toWarehouseId, it.productId, Number(it.quantity) || 0);
    }
  }, [adjustStock]);

  const createStockAdjustment = useCallback((data: Omit<StockAdjustmentType, 'id'>) => {
    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
    const id = `SA${thaiYearLastTwoDigits}-${String(Date.now()).slice(-6)}`;
    const newItem: StockAdjustmentType = { ...(data as any), id };
    setStockAdjustments(prev => [...prev, newItem]);
    for (const it of data.items) adjustStock(data.warehouseId, it.productId, (Number(it.adjustedQuantity) || 0) - (Number(it.originalQuantity) || 0));
  }, [adjustStock]);

  const createProductReturn = useCallback((data: Omit<ProductReturnType, 'id'>) => {
    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
    const id = `RT${thaiYearLastTwoDigits}-${String(Date.now()).slice(-6)}`;
    const newItem: ProductReturnType = { ...(data as any), id };
    setProductReturns(prev => [...prev, newItem]);
    for (const it of data.items) {
      adjustStock(data.fromWarehouseId, it.productId, -(Number(it.quantity) || 0));
      adjustStock(data.toWarehouseId, it.productId, Number(it.quantity) || 0);
    }
  }, [adjustStock]);

  const updateReturnToSupplier = useCallback((updated: ReturnToSupplierType) => {
    setReturnToSuppliers(prev => {
      const prevItem = prev.find(r => r.id === updated.id);
      const next = prev.map(r => r.id === updated.id ? updated : r);
      if (prevItem && prevItem.status !== Status.Approved && updated.status === Status.Approved) {
        for (const it of updated.items) {
          adjustStock(updated.warehouseId, it.productId, -(Number(it.quantity) || 0));
        }
      }
      return next;
    });
  }, [adjustStock]);

  const createCustomer = useCallback((data: Omit<Customer, 'id'>) => {
    setCustomers(prev => {
      const maxId = prev.reduce((max, c) => {
        const num = parseInt(c.id.slice(1), 10);
        return num > max ? num : max;
      }, 0);
      const newId = `C${String(maxId + 1).padStart(4, '0')}`;
      return [...prev, { ...data, id: newId } as Customer];
    });
  }, []);

  const createProduct = useCallback((data: Omit<Product, 'id'>) => {
    setProducts(prev => {
      const prefix = data.type === 'สินค้า' ? 'PROD-' : 'SERV-';
      const relevantProducts = prev.filter(p => p.id.startsWith(prefix));
      const maxId = relevantProducts.reduce((max, p) => {
        const numPart = p.id.split('-')[1];
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(3, '0')}`;
      return [...prev, { ...data, id: newId } as Product];
    });
  }, []);

  const createPackage = useCallback((data: Omit<Product, 'id'>) => {
    setProducts(prev => {
      const prefix = 'PK';
      const relevantProducts = prev.filter(p => p.id.startsWith(prefix));
      const maxId = relevantProducts.reduce((max, p) => {
        const numPart = p.id.replace('PK', '');
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(4, '0')}`;
      return [...prev, { ...data, id: newId } as Product];
    });
  }, []);

  const createWarehouse = useCallback((data: Omit<WarehouseType, 'id'>) => {
    setWarehouses(prev => {
      const maxId = prev.reduce((max, w) => {
        if (w.id.startsWith('WH')) {
          const num = parseInt(w.id.slice(2), 10);
          if (!isNaN(num) && num > max) {
            return num;
          }
        } else if (w.id.startsWith('wh-')) {
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
    setSuppliers(prev => {
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
    setUsers(prev => {
      const maxId = prev.reduce((max, u) => {
        const numPart = u.id.split('-')[1];
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newId = `user-${maxId + 1}`;
      return [...prev, { ...data, id: newId } as User];
    });
  }, []);

  const createQuotation = useCallback((data: Omit<Quotation, 'id'>, assessmentId?: string) => {
    setQuotations(prev => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
      const prefix = `QT${thaiYearLastTwoDigits}`;
      const relevantQuotations = prev.filter(q => q.id.startsWith(prefix));
      const maxId = relevantQuotations.reduce((max, q) => {
        const numPart = q.id.slice(4);
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(6, '0')}`;
      return [...prev, { ...data, id: newId } as Quotation];
    });
  }, []);

  const handleQuotationUpdate = useCallback((updated: Quotation) => {
    setQuotations(prev => {
      const index = prev.findIndex(q => q.id === updated.id);
      if (index === -1) return prev;
      const old = prev[index];
      const next = [...prev];
      next[index] = updated;
      if (old.status !== Status.Approved && updated.status === Status.Approved) {
        // Logic for approved quotation (if any)
      }
      return next;
    });
  }, []);

  const createJob = useCallback((data: Omit<FieldJob, 'id'>) => {
    setFieldJobs(prev => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
      const prefix = `JOB${thaiYearLastTwoDigits}`;
      const relevantJobs = prev.filter(j => j.id.startsWith(prefix));
      const maxId = relevantJobs.reduce((max, j) => {
        const numPart = j.id.slice(5);
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(6, '0')}`;
      return [...prev, { ...data, id: newId } as FieldJob];
    });
  }, []);

  const createContract = useCallback((data: Omit<Contract, 'id'>) => {
    setContracts(prev => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
      const prefix = `CT${thaiYearLastTwoDigits}`;
      const relevantContracts = prev.filter(c => c.id.startsWith(prefix));
      const maxId = relevantContracts.reduce((max, c) => {
        const numPart = c.id.slice(4);
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(6, '0')}`;
      return [...prev, { ...data, id: newId } as Contract];
    });
  }, []);

  const updateWarehouseLimits = useCallback((id: string, limits: { min: number; max: number }[]) => {
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, withdrawalLimits: limits } : w));
  }, []);

  const createWalletTransaction = useCallback((data: Omit<WalletTransaction, 'id'>) => {
    setUserWallets(prev => {
      const wallet = prev.find(w => w.userId === data.userId);
      if (!wallet) return prev;
      const newTransaction: WalletTransaction = {
        ...data,
        id: `TXN-${Date.now()}`,
        date: new Date().toISOString(),
      };
      const newBalance = data.type === 'deposit' ? wallet.balance + data.amount : wallet.balance - data.amount;
      return prev.map(w => w.userId === data.userId ? { ...w, balance: newBalance, transactions: [newTransaction, ...w.transactions] } : w);
    });
  }, []);

  const createInvoice = useCallback((data: Omit<Invoice, 'id'>) => {
    setInvoices(prev => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
      const prefix = `INV${thaiYearLastTwoDigits}`;
      const relevantInvoices = prev.filter(i => i.id.startsWith(prefix));
      const maxId = relevantInvoices.reduce((max, i) => {
        const numPart = i.id.slice(5);
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(6, '0')}`;
      return [...prev, { ...data, id: newId } as Invoice];
    });
  }, []);

  const createReceipt = useCallback((data: Omit<Receipt, 'id'>) => {
    setReceipts(prev => {
      const thaiYearLastTwoDigits = (new Date().getFullYear() + 543).toString().slice(-2);
      const prefix = `RC${thaiYearLastTwoDigits}`;
      const relevantReceipts = prev.filter(r => r.id.startsWith(prefix));
      const maxId = relevantReceipts.reduce((max, r) => {
        const numPart = r.id.slice(4);
        if (!numPart) return max;
        const num = parseInt(numPart, 10);
        return isNaN(num) ? max : (num > max ? num : max);
      }, 0);
      const newIdNumber = maxId + 1;
      const newId = `${prefix}${String(newIdNumber).padStart(6, '0')}`;
      return [...prev, { ...data, id: newId } as Receipt];
    });
  }, []);

  const handleReviseQuotation = useCallback((originalId: string, changes: Partial<Quotation>) => {
    setQuotations(prevQuotations => {
      const original = prevQuotations.find(q => q.id === originalId);
      if (!original) return prevQuotations;
      const baseId = original.id.split('-Rev')[0];
      const relatedQuotations = prevQuotations.filter(q => q.id.startsWith(baseId));
      let maxRev = 0;
      relatedQuotations.forEach(q => {
        if (q.id.includes('-Rev')) {
          const revPart = parseInt(q.id.split('-Rev')[1], 10);
          if (!isNaN(revPart) && revPart > maxRev) maxRev = revPart;
        }
      });
      const nextVersion = maxRev + 1;
      const newId = `${baseId}-Rev${nextVersion}`;
      const updatedQuotation = { ...original, ...changes };
      const allowedManualStatuses = [Status.Draft, Status.Pending, Status.Approved, Status.Rejected];
      let finalStatus = updatedQuotation.status;
      if (!allowedManualStatuses.includes(finalStatus)) {
        finalStatus = Status.Revise;
      }
      const newRevision: Quotation = {
        ...updatedQuotation,
        id: newId,
        revision: nextVersion,
        status: finalStatus,
      };
      return [...prevQuotations, newRevision];
    });
  }, []);

  const HANDLERS = {
    assessments: { create: createHandler(setAssessments, 'asm'), update: updateHandler(setAssessments), delete: deleteHandler(setAssessments) },
    fieldJobs: { create: createJob, update: updateHandler(setFieldJobs), delete: deleteHandler(setFieldJobs) },
    customers: { create: createCustomer, update: updateHandler(setCustomers), delete: deleteHandler(setCustomers) },
    quotations: { create: createQuotation, update: handleQuotationUpdate, delete: deleteHandler(setQuotations), revise: handleReviseQuotation },
    contracts: { create: createContract, update: updateHandler(setContracts), delete: deleteHandler(setContracts) },
    products: { create: createProduct, update: updateHandler(setProducts), delete: deleteHandler(setProducts) },
    packages: { create: createPackage, update: updateHandler(setProducts), delete: deleteHandler(setProducts) },
    warehouses: { create: createWarehouse, update: updateHandler(setWarehouses), delete: deleteHandler(setWarehouses), updateLimits: updateWarehouseLimits },
    suppliers: { create: createSupplier, update: updateHandler(setSuppliers), delete: deleteHandler(setSuppliers) },
    goodsReceipts: { create: createHandler(setGoodsReceipts, 'GR'), update: updateGoodsReceipt, delete: deleteHandler(setGoodsReceipts) },
    withdrawals: { create: createHandler(setWithdrawals, 'SR'), update: updateWithdrawal, delete: deleteHandler(setWithdrawals) },
    transfers: { create: createTransfer, update: updateHandler(setTransfers), delete: deleteHandler(setTransfers) },
    stockAdjustments: { create: createStockAdjustment, update: updateHandler(setStockAdjustments), delete: deleteHandler(setStockAdjustments) },
    productReturns: { create: createProductReturn, update: updateHandler(setProductReturns), delete: deleteHandler(setProductReturns) },
    returnToSuppliers: { create: createHandler(setReturnToSuppliers, 'RTS'), update: updateReturnToSupplier, delete: deleteHandler(setReturnToSuppliers) },
    users: { create: createUser, update: updateHandler(setUsers), delete: deleteHandler(setUsers) },
    userWallets: { createTransaction: createWalletTransaction },
    invoices: { create: createInvoice, update: updateHandler(setInvoices), delete: deleteHandler(setInvoices) },
    receipts: { create: createReceipt, update: updateHandler(setReceipts), delete: deleteHandler(setReceipts) },
  };

  return (
    <AppRouter
      isAuthenticated={isAuthenticated}
      onLogin={handleLogin}
      onLogout={handleLogout}
      assessments={assessments}
      fieldJobs={fieldJobs}
      customers={customers}
      contracts={contracts}
      quotations={quotations}
      products={products}
      users={users}
      warehouses={warehouses}
      suppliers={suppliers}
      goodsReceipts={goodsReceipts}
      withdrawals={withdrawals}
      transfers={transfers}
      stockAdjustments={stockAdjustments}
      productReturns={productReturns}
      returnToSuppliers={returnToSuppliers}
      invoices={invoices}
      receipts={receipts}
      userWallets={userWallets}
      warehouseStocks={warehouseStocks}
      handlers={HANDLERS}
    />
  );
};

export default App;
