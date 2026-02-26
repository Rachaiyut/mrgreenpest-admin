import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/FormControls';
import { LeftArrowIcon } from '../../assets/icons/Icons';
import { QuotationForm } from '../../components/features/quotations/QuotationForm';
import { QuotationApi } from '../../api/quotation';
import { Quotation } from '../../types/entity/financial.interface';
import { QuotationStatus } from '@/src/types';

const EditQuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'revise' ? 'revise' : 'edit';
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      if (!id) return;

      try {
        const res = await QuotationApi.getById(id);
        if (res) {
          setQuotation(res);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch quotation:', error);
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);

  const title = useMemo(() => {
    if (mode === 'revise') return 'สร้างใบเสนอราคา (ฉบับแก้ไข)';
    return 'แก้ไขใบเสนอราคา';
  }, [mode]);

  const description = useMemo(() => {
    if (mode === 'revise') return 'สร้างใบเสนอราคาฉบับใหม่โดยอ้างอิงข้อมูลเดิม';
    return 'แก้ไขข้อมูลใบเสนอราคา';
  }, [mode]);

  const handleSubmit = async (data: any) => {
    try {
      if (mode === 'revise') {
        const { id: _, ...createData } = data;

        await QuotationApi.create({
          ...(createData as any),
          status: QuotationStatus.DRAFT,
        } as any);
      } else {
        if (!id) throw new Error('Missing quotation id');
        await QuotationApi.update(id, data);
      }
      navigate('/quotations');
    } catch (error) {
      console.error(`Failed to ${mode} quotation:`, error);
      alert(
        `เกิดข้อผิดพลาดในการ${mode === 'revise' ? 'สร้าง' : 'แก้ไข'}ใบเสนอราคา`
      );
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">ไม่พบข้อมูลใบเสนอราคา</p>
        <Button onClick={() => navigate('/quotations')}>ย้อนกลับ</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/quotations')}>
          <LeftArrowIcon className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {description} {quotation.code}
          </p>
        </div>
      </div>

      <QuotationForm
        key={`${quotation.id}-${mode}`}
        mode={mode}
        initialValues={quotation}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/quotations')}
      />
    </div>
  );
};

export default EditQuotationPage;
