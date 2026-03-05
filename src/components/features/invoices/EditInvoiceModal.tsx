import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../common/FormControls';
import { Invoice, Customer, Quotation } from '@/src/types/entity/app.interface'; // ปรับ path ให้ตรงกับโปรเจกต์คุณ
import { LeftArrowIcon } from '../../../assets/icons/Icons';
import { InvoiceForm } from './InvoiceForm'; // ตรวจสอบชื่อไฟล์ที่ Import ให้ตรงกัน
import { InvoiceApi } from '../../../api/invoice'; // 💡 เพิ่มการ Import InvoiceApi
import type { FC } from 'react';

interface EditInvoicePageProps {
  invoices: Invoice[];
  customers: Customer[];
  quotations: Quotation[];
  onUpdateInvoice: (invoice: Invoice) => void;
}

export const EditInvoicePage: FC<EditInvoicePageProps> = ({
  onUpdateInvoice,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoiceDetail = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        // 💡 ยิง API ไปดึงข้อมูลฉบับเต็มที่มี items ติดมาด้วย
        const response = await InvoiceApi.getById(id);
        const data = (response as any).data || response;
        
        if (data) {
          setInvoice(data);
        } else {
          alert('ไม่พบใบแจ้งหนี้ในระบบ');
          navigate('/billing');
        }
      } catch (error) {
        console.error('Failed to fetch invoice details:', error);
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลใบแจ้งหนี้');
        navigate('/billing');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceDetail();
  }, [id, navigate]);

  const handleSave = async (data: any) => {
    if (invoice) {
      try {
        const updatedData: Invoice = {
          ...invoice,
          ...data,
        };
        await onUpdateInvoice(updatedData);
        navigate('/billing');
      } catch (error) {
        console.error('Failed to update invoice:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดตใบแจ้งหนี้');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-slate-500 font-medium flex items-center gap-2">
          {/* สามารถใส่ Loading Spinner ไอคอนตรงนี้ได้ถ้ามี */}
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/billing')}
          className="p-2 rounded-full hover:bg-slate-200 transition-colors"
        >
          <LeftArrowIcon className="w-5 h-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            แก้ไขใบแจ้งหนี้: <span className="text-primary">{invoice.code || invoice.id}</span>
          </h1>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-6xl mx-auto">
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