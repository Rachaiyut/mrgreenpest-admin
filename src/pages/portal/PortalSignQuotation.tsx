import React, { useEffect, useState, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useSearchParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { portalApi } from '../../api/customer-portal';
import { API_CONFIG } from '@/src/constants/config';

type SigningState = 'loading' | 'ready' | 'signed' | 'error';
type PdfState = 'loading' | 'loaded' | 'error';
type DocumentType = 'QUOTATION' | 'CONTRACT';

const PortalSignQuotation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<SigningState>('loading');
  const [error, setError] = useState<string>('');
  const [document, setDocument] = useState<any>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('QUOTATION');
  const [signerName, setSignerName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfState, setPdfState] = useState<PdfState>('loading');
  const signatureRef = useRef<SignatureCanvas>(null);
  const signatureContainerRef = useRef<HTMLDivElement>(null);
  const contractorSignatureRef = useRef<SignatureCanvas>(null);
  const contractorSignatureContainerRef = useRef<HTMLDivElement>(null);

  const isContract = documentType === 'CONTRACT';
  const docLabel = isContract ? 'สัญญา' : 'ใบเสนอราคา';

  // Resize signature canvas to match container width
  const resizeCanvasElement = useCallback((containerRef: React.RefObject<HTMLDivElement | null>, canvasRef: React.RefObject<SignatureCanvas | null>) => {
    if (!containerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current.getCanvas();
    const container = containerRef.current;
    const ratio = window.devicePixelRatio || 1;
    const width = container.offsetWidth;
    const height = 160;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.getContext('2d')?.scale(ratio, ratio);
    canvasRef.current.clear();
  }, []);

  const resizeCanvas = useCallback(() => {
    resizeCanvasElement(signatureContainerRef, signatureRef);
    resizeCanvasElement(contractorSignatureContainerRef, contractorSignatureRef);
  }, [resizeCanvasElement]);

  useEffect(() => {
    if (state !== 'ready') return;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [state, resizeCanvas]);

  useEffect(() => {
    if (!token) {
      setError('ลิงก์ไม่ถูกต้อง กรุณาใช้ลิงก์ที่ได้รับจากเจ้าหน้าที่');
      setState('error');
      return;
    }

    const verify = async () => {
      try {
        const res = await portalApi.getSigningData(token);
        const data = res.data;
        const docType: DocumentType = data.document_type || 'QUOTATION';
        setDocumentType(docType);

        const doc = docType === 'CONTRACT' ? data.contract : data.quotation;
        setDocument(doc);
        setSignerName(doc?.customer_name || '');
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
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณากรอกชื่อผู้เซ็น' });
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเซ็นลายมือผู้ว่าจ้างในกรอบ' });
      return;
    }

    // ช่างไม่บังคับเซ็น - ส่งได้ถ้ามี

    setIsSubmitting(true);
    try {
      const signatureData = signatureRef.current.toDataURL('image/png');
      const payload: any = {
        signer_name: signerName.trim(),
        signature: signatureData,
      };

      if (isContract && contractorSignatureRef.current && !contractorSignatureRef.current.isEmpty()) {
        payload.contractor_signer_name = contractorName.trim();
        payload.contractor_signature = contractorSignatureRef.current.toDataURL('image/png');
      }

      await portalApi.submitSignature(token, payload);
      setState('signed');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // PDF preview URL
  const pdfUrl = isContract
    ? `${API_CONFIG.baseUrl}/print/contract/${document?.id}/view`
    : `${API_CONFIG.baseUrl}/print/${document?.id}/view`;

  // Loading
  if (state === 'loading') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">กำลังโหลดเอกสาร...</p>
        </div>
      </div>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">ไม่สามารถเปิดเอกสารได้</h2>
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
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">เซ็นเอกสารเรียบร้อยแล้ว</h2>
            <p className="text-slate-600 text-sm">ขอบคุณที่ใช้บริการ บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</p>
            <p className="text-slate-400 text-xs mt-4">คุณสามารถปิดหน้านี้ได้</p>
          </div>
        </div>
      </div>
    );
  }

  // Ready - show signing form
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50 py-4 sm:py-6 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-3 sm:mb-4">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm">MG</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate">{docLabel}</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 sm:pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div className="flex justify-between sm:block">
                <span className="text-slate-500">เลขที่:</span>
                <span className="ml-2 font-semibold text-slate-800">{document?.code || '-'}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-slate-500">ลูกค้า:</span>
                <span className="ml-2 font-semibold text-slate-800">{document?.customer_name || '-'}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-slate-500">สถานที่:</span>
                <span className="ml-2 text-slate-700 text-right sm:text-left">{document?.service_location || '-'}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-slate-500">{isContract ? 'มูลค่า:' : 'ยอดรวม:'}</span>
                <span className="ml-2 font-bold text-green-700">
                  ฿{formatCurrency(isContract ? document?.total_amount : document?.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-3 sm:mb-4">
          <h3 className="font-semibold text-slate-800 mb-2 sm:mb-3 text-sm sm:text-base">รายละเอียด{docLabel}</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden relative">
            {pdfState === 'loading' && (
              <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3" />
                <p className="text-sm text-slate-500">กำลังโหลดเอกสาร...</p>
              </div>
            )}
            {pdfState === 'error' && (
              <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
                <p className="text-sm text-red-500 mb-2">ไม่สามารถโหลดเอกสารได้</p>
                <button
                  onClick={() => setPdfState('loading')}
                  className="text-sm text-green-600 underline hover:text-green-700"
                >
                  ลองใหม่
                </button>
              </div>
            )}
            <iframe
              src={pdfUrl}
              className="w-full border-0"
              style={{ height: 'clamp(300px, 60vh, 700px)' }}
              title={docLabel}
              onLoad={() => setPdfState('loaded')}
              onError={() => setPdfState('error')}
            />
          </div>
        </div>

        {/* Signature section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-800 mb-3 sm:mb-4 text-sm sm:text-base">
            {isContract ? 'ลงนามผู้ว่าจ้าง (ลูกค้า)' : 'ลงนามอนุมัติ'}
          </h3>

          {/* Signer name */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isContract ? 'ชื่อผู้ว่าจ้าง' : 'ชื่อผู้เซ็น'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="กรอกชื่อ-นามสกุล"
              className="w-full px-3 py-2.5 sm:py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>

          {/* Signature canvas */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isContract ? 'ลายเซ็นผู้ว่าจ้าง' : 'ลายเซ็น'} <span className="text-red-500">*</span>
            </label>
            <div
              ref={signatureContainerRef}
              className="border-2 border-dashed border-slate-300 rounded-lg bg-white relative touch-none"
            >
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  className: 'w-full touch-none',
                  style: { width: '100%', height: '160px', touchAction: 'none' },
                }}
              />
              <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] sm:text-xs text-slate-400 pointer-events-none">
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

          {/* Contractor signature - only for contracts */}
          {isContract && (
            <>
              <div className="border-t border-slate-200 my-4 sm:my-5" />
              <h3 className="font-semibold text-slate-800 mb-3 sm:mb-4 text-sm sm:text-base">ลงนามผู้รับจ้าง (ช่าง)</h3>

              <div className="mb-3 sm:mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อผู้รับจ้าง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุลช่าง"
                  className="w-full px-3 py-2.5 sm:py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                />
              </div>

              <div className="mb-3 sm:mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ลายเซ็นผู้รับจ้าง <span className="text-red-500">*</span>
                </label>
                <div
                  ref={contractorSignatureContainerRef}
                  className="border-2 border-dashed border-slate-300 rounded-lg bg-white relative touch-none"
                >
                  <SignatureCanvas
                    ref={contractorSignatureRef}
                    penColor="black"
                    canvasProps={{
                      className: 'w-full touch-none',
                      style: { width: '100%', height: '160px', touchAction: 'none' },
                    }}
                  />
                  <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] sm:text-xs text-slate-400 pointer-events-none">
                    วาดลายเซ็นผู้รับจ้างในกรอบนี้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => contractorSignatureRef.current?.clear()}
                  className="mt-2 text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  ล้างลายเซ็น
                </button>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            onClick={handleSign}
            disabled={isSubmitting}
            className={`w-full py-3.5 sm:py-3 rounded-lg text-white font-semibold text-sm sm:text-base transition-colors ${
              isSubmitting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {isSubmitting ? 'กำลังบันทึก...' : `ยอมรับและเซ็น${docLabel}`}
          </button>

          <p className="text-[11px] sm:text-xs text-slate-400 text-center mt-3">
            การเซ็นเอกสารนี้ถือเป็นการยืนยันการอนุมัติ{docLabel}
          </p>
        </div>

        {/* Bottom safe area spacer for mobile */}
        <div className="h-6 sm:h-0" />
      </div>
    </div>
  );
};

export default PortalSignQuotation;
