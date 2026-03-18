import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { portalApi } from '../../api/customer-portal';
import { API_CONFIG } from '@/src/constants/config';

type SigningState = 'loading' | 'ready' | 'signed' | 'error';
type PdfState = 'loading' | 'loaded' | 'error';

const PortalSignQuotation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<SigningState>('loading');
  const [error, setError] = useState<string>('');
  const [quotation, setQuotation] = useState<any>(null);
  const [signerName, setSignerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfState, setPdfState] = useState<PdfState>('loading');
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (!token) {
      setError('ลิงก์ไม่ถูกต้อง กรุณาใช้ลิงก์ที่ได้รับจากเจ้าหน้าที่');
      setState('error');
      return;
    }

    const verify = async () => {
      try {
        const res = await portalApi.getSigningData(token);
        setQuotation(res.data.quotation);
        setSignerName(res.data.quotation?.customer_name || '');
        setState('ready');
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'ลิงก์ไม่ถูกต้องหรือหมดอายุ';
        setError(msg);
        setState('error');
      }
    };

    verify();
  }, [token]);

  const handleSign = async () => {
    if (!token) return;

    if (!signerName.trim()) {
      alert('กรุณากรอกชื่อผู้เซ็น');
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert('กรุณาเซ็นลายมือในกรอบ');
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureData = signatureRef.current.toDataURL('image/png');
      await portalApi.submitSignature(token, {
        signer_name: signerName.trim(),
        signature: signatureData,
      });
      setState('signed');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Loading
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-slate-600">กำลังโหลดเอกสาร...</p>
        </div>
      </div>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่สามารถเปิดเอกสารได้</h2>
            <p className="text-slate-600 text-sm">{error}</p>
            <p className="text-slate-400 text-xs mt-4">กรุณาติดต่อเจ้าหน้าที่เพื่อขอลิงก์ใหม่</p>
          </div>
        </div>
      </div>
    );
  }

  // Signed success
  if (state === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">เซ็นเอกสารเรียบร้อยแล้ว</h2>
            <p className="text-slate-600 text-sm">ขอบคุณที่ใช้บริการ บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</p>
            <p className="text-slate-400 text-xs mt-4">คุณสามารถปิดหน้านี้ได้</p>
          </div>
        </div>
      </div>
    );
  }

  // Ready - show signing form
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MG</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">ใบเสนอราคา</h1>
              <p className="text-xs text-slate-500">บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">เลขที่:</span>
                <span className="ml-2 font-semibold text-slate-800">{quotation?.code || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">ลูกค้า:</span>
                <span className="ml-2 font-semibold text-slate-800">{quotation?.customer_name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">สถานที่:</span>
                <span className="ml-2 text-slate-700">{quotation?.service_location || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">ยอดรวม:</span>
                <span className="ml-2 font-bold text-green-700">฿{formatCurrency(quotation?.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <h3 className="font-semibold text-slate-800 mb-3">รายละเอียดใบเสนอราคา</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden relative">
            {pdfState === 'loading' && (
              <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center" style={{ minHeight: '500px' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3" />
                <p className="text-sm text-slate-500">กำลังโหลดเอกสาร...</p>
              </div>
            )}
            {pdfState === 'error' && (
              <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center" style={{ minHeight: '500px' }}>
                <p className="text-sm text-red-500 mb-2">ไม่สามารถโหลดเอกสารได้</p>
                <button
                  onClick={() => { setPdfState('loading'); }}
                  className="text-sm text-green-600 underline hover:text-green-700"
                >
                  ลองใหม่
                </button>
              </div>
            )}
            <iframe
              src={`${API_CONFIG.baseUrl}/print/${quotation?.id}/view`}
              className="w-full border-0"
              style={{ height: '70vh', minHeight: '500px' }}
              title="ใบเสนอราคา"
              onLoad={() => setPdfState('loaded')}
              onError={() => setPdfState('error')}
            />
          </div>
        </div>

        {/* Signature section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">ลงนามอนุมัติ</h3>

          {/* Signer name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อผู้เซ็น <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="กรอกชื่อ-นามสกุล"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>

          {/* Signature canvas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ลายเซ็น <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white relative">
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  className: 'w-full',
                  style: { width: '100%', height: '200px' },
                }}
              />
              <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-slate-400 pointer-events-none">
                วาดลายเซ็นในกรอบนี้
              </p>
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="mt-2 text-sm text-slate-500 hover:text-slate-700 underline"
            >
              ล้างลายเซ็น
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleSign}
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg text-white font-semibold text-base transition-colors ${
              isSubmitting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'ยอมรับและเซ็นเอกสาร'}
          </button>

          <p className="text-xs text-slate-400 text-center mt-3">
            การเซ็นเอกสารนี้ถือเป็นการยืนยันการอนุมัติใบเสนอราคา
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalSignQuotation;
