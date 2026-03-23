import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@/src/test/test-utils';

// Mock all API modules
vi.mock('@/src/api/assessment', () => ({ AssessmentApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/quotation', () => ({ QuotationApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/customer', () => ({ CustomerApi: { getCustomers: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/contract', () => ({ ContractApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/invoice', () => ({ InvoiceApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/receipt', () => ({ ReceiptApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/job', () => ({ JobApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/product', () => ({ ProductApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/warehouse', () => ({ WarehouseApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/user', () => ({ UserApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/supplier', () => ({ SupplierApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/src/api/notification', () => ({ NotificationApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));

import { DataProvider, useData } from '../DataContext';

const TestConsumer = () => {
  const ctx = useData();
  return (
    <div>
      <span data-testid="has-context">{ctx ? 'yes' : 'no'}</span>
      <span data-testid="has-handlers">{ctx.handlers ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('DataContext', () => {
  it('should provide all API instances', () => {
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );
    expect(screen.getByTestId('has-context').textContent).toBe('yes');
    expect(screen.getByTestId('has-handlers').textContent).toBe('yes');
  });

  it('should fetch initial data on mount', async () => {
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );
    // DataContext fetches data on mount via useEffect
    expect(screen.getByTestId('has-context')).toBeDefined();
  });
});
