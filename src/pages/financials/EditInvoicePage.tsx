import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FormField,
  Input,
  Select,
  Button,
} from '../../components/common/FormControls';
import {
  Invoice,
  Status,
  Customer,
  Quotation,
} from '@/src/types/entity/app.interface';
import { InvoiceStatus } from '@/src/types/enums/financial.enum';
import { LeftArrowIcon } from '../../assets/icons/Icons';

interface EditInvoicePageProps {
  invoices: Invoice[];
  customers: Customer[];
  quotations: Quotation[];
  onUpdateInvoice: (invoice: Invoice) => void;
}

import type { FC } from 'react';

export const EditInvoicePage: FC<EditInvoicePageProps> = ({
  invoices,
  customers,
  quotations,
  onUpdateInvoice,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  // Map for quick customer lookup
  const customerMap = useMemo(
    () => new Map((customers || []).map((c) => [c.id, `${c.first_name} ${c.last_name}`])),
    [customers]
  );

  useEffect(() => {
    const found = invoices.find((i) => i.id === id);
    if (found) {
      setInvoice(found);
      setFormData({
        ...found,
        issued_at: found.issued_at
          ? new Date(found.issued_at).toISOString().substring(0, 10)
          : '',
        due_at: found.due_at
          ? new Date(found.due_at).toISOString().substring(0, 10)
          : '',
      });
    } else if (id) {
      alert('ไม่พบใบแจ้งหนี้');
      navigate('/billing');
    }
  }, [id, invoices, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customerName = customerMap.get(customerId) || '';
    setFormData((prev) => ({ ...prev, customer_id: customerId, customer_name: customerName }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoice) {
      const updatedData: Invoice = {
        ...invoice,
        ...formData,
        total: Number(formData.total) || invoice.total,
        status: formData.status as InvoiceStatus,
      };
      onUpdateInvoice(updatedData);
      navigate('/billing');
    }
  };

  if (!invoice) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/billing')}>
          <LeftArrowIcon className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            แก้ไขใบแจ้งหนี้: {invoice.id}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6 border border-slate-200">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ลูกค้า" htmlFor="customerId">
              <Select
                id="customerId"
                name="customer_id"
                value={formData.customer_id || ''}
                onChange={handleCustomerChange}
                required
              >
                <option value="">เลือกลูกค้า</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="อ้างอิงใบเสนอราคา" htmlFor="quotationId">
              <Select
                id="quotationId"
                name="quotation_id"
                value={formData.quotation_id || ''}
                onChange={handleChange}
              >
                <option value="">ไม่ระบุ</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="วันที่ออก" htmlFor="issuedAt">
              <Input
                id="issuedAt"
                name="issued_at"
                type="date"
                value={formData.issued_at || ''}
                onChange={handleChange}
                required
              />
            </FormField>
            <FormField label="วันครบกำหนด" htmlFor="dueAt">
              <Input
                id="dueAt"
                name="due_at"
                type="date"
                value={formData.due_at || ''}
                onChange={handleChange}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="สถานะ" htmlFor="status">
              <Select
                id="status"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
              >
                <option value={InvoiceStatus.Pending}>{InvoiceStatus.Pending}</option>
                <option value={InvoiceStatus.Paid}>{InvoiceStatus.Paid}</option>
                <option value={InvoiceStatus.Overdue}>{InvoiceStatus.Overdue}</option>
              </Select>
            </FormField>
            <FormField label="ยอดรวม (บาท)" htmlFor="total">
              <Input
                id="total"
                name="total"
                type="number"
                value={formData.total ?? ''}
                onChange={handleChange}
                required
                step="0.01"
                placeholder="0.00"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={() => navigate('/billing')}
              className="py-2 px-6"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button type="submit" className="py-2 px-6" variant="primary">
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoicePage;
