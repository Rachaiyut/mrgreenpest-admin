import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/FormControls';
import { LeftArrowIcon } from '../../assets/icons/Icons';
import { QuotationForm } from '../../components/features/quotations/QuotationForm';
import { QuotationApi } from '../../api/quotation';

const CreateQuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Check URL params for assessmentId
  useEffect(() => {
    const id = searchParams.get('assessmentId');
    if (id) {
      setAssessmentId(id);
    }
  }, [searchParams]);

  const handleSubmit = async (data: any) => {
    try {
      await QuotationApi.create(data);
      navigate('/quotations');
    } catch (error) {
      console.error('Failed to create quotation:', error);
      alert('เกิดข้อผิดพลาดในการสร้างใบเสนอราคา');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/quotations')}>
          <LeftArrowIcon className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            สร้างใบเสนอราคาใหม่
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            กรอกข้อมูลเพื่อสร้างใบเสนอราคาค่าบริการ
          </p>
        </div>
      </div>

      <QuotationForm
        mode="create"
        assessmentId={assessmentId}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/quotations')}
      />
    </div>
  );
};

export default CreateQuotationPage;
