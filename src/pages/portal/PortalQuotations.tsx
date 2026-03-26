import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { portalApi } from '../../api/customer-portal';
import { StatusBadge } from '../../components/common/StatusBadge';
import dayjs from 'dayjs';

const PortalQuotations: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await portalApi.getQuotations();
        setQuotations(res.data || []);
      } catch (error) {
        console.error('Error fetching quotations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDownloadPdf = async (id: string, code: string) => {
    if (loadingPdfId) return;
    setLoadingPdfId(id);
    try {
      const blob = await portalApi.downloadPdf('quotations', id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation-${code || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถดาวน์โหลดเอกสารได้' });
    } finally {
      setLoadingPdfId(null);
    }
  };

  const PdfButton = ({ id, code }: { id: string; code: string }) => (
    <button
      onClick={() => handleDownloadPdf(id, code)}
      disabled={loadingPdfId === id}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${loadingPdfId === id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
    >
      {loadingPdfId === id ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
      )}
      {loadingPdfId === id ? 'กำลังโหลด...' : 'ดู PDF'}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">ใบเสนอราคา</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">รายการใบเสนอราคาทั้งหมดของคุณ</p>
      </div>

      {quotations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
          <p className="text-slate-500">ยังไม่มีใบเสนอราคา</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {quotations.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-800">{item.code || '-'}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">วันที่</span>
                    <p className="text-slate-700 font-medium">{item.created_at ? dayjs(item.created_at).format('DD/MM/YYYY') : '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">จำนวนเงิน</span>
                    <p className="text-slate-700 font-medium">
                      {item.total_amount != null ? Number(item.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <PdfButton id={item.id} code={item.code} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">เลขที่</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">วันที่</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">จำนวนเงิน</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">ดาวน์โหลด</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{item.code || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.created_at ? dayjs(item.created_at).format('DD/MM/YYYY') : '-'}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-800 font-medium">
                        {item.total_amount != null ? Number(item.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={item.status} /></td>
                      <td className="px-6 py-4 text-center"><PdfButton id={item.id} code={item.code} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PortalQuotations;
