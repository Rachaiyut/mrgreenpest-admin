import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../common/FormControls';
import { Invoice, Customer, Quotation } from '@/src/types/entity/app.interface';
import { LeftArrowIcon } from '../../../assets/icons/Icons';
import { InvoiceForm } from './AddInvoiceModal';
import type { FC } from 'react';

interface EditInvoicePageProps {
  invoices: Invoice[];
  customers: Customer[];
  quotations: Quotation[];
  onUpdateInvoice: (invoice: Invoice) => void;
}

export const EditInvoicePage: FC<EditInvoicePageProps> = ({
  invoices,
  onUpdateInvoice,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const found = invoices.find((i) => i.id === id);
    if (found) {
      setInvoice(found);
    } else if (id) {
      alert('ไม่พบใบแจ้งหนี้');
      navigate('/billing');
    }
  }, [id, invoices, navigate]);

  const handleSave = async (data: any) => {
    if (invoice) {
      const updatedData: Invoice = {
        ...invoice,
        ...data,
      };
      await onUpdateInvoice(updatedData);
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

      <div className="max-w-5xl mx-auto">
        <InvoiceForm
          mode="edit"
          initialValues={invoice}
          onSubmit={handleSave}
          onCancel={() => navigate('/billing')}
        />
      </div>
    </div>
  );
};

export default EditInvoicePage;
