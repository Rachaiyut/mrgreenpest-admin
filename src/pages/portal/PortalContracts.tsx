import React, { useEffect, useState } from 'react';
import Swal from '@/src/utils/swal';
import { portalApi } from '../../api/customer-portal';
import { openPortalPdf } from '../../utils/portalPdf';
import { StatusBadge } from '../../components/common/StatusBadge';
import dayjs from 'dayjs';

const PortalContracts: React.FC = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await portalApi.getContracts();
        setContracts(res.data || []);
      } catch (error) {
        console.error('Error fetching contracts:', error);
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
      await openPortalPdf('contracts', id, `contract-${code || id}.pdf`);
    } catch (error) {
      console.error('Error opening PDF:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปิดเอกสารได้' });
    } finally {
      setLoadingPdfId(null);
    }
  };

  const PdfButton = ({ id, code, full }: { id: string; code: string; full?: boolean }) => (
    <button
      onClick={() => handleDownloadPdf(id, code)}
      disabled={loadingPdfId === id}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${full ? 'w-full' : ''} ${loadingPdfId === id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm hover:shadow active:scale-[0.98]'}`}
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
      <div className="mb-5 sm:mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">สัญญา</h2>
          <p className="text-slate-500 mt-0.5 text-sm">รายการสัญญาทั้งหมดของคุณ</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
          ทั้งหมด {contracts.length} รายการ
        </span>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">ยังไม่มีสัญญา</p>
          <p className="text-slate-400 text-sm mt-1">เมื่อมีสัญญาใหม่ ระบบจะแสดงที่นี่</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {contracts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border-l-4 border-green-400 border-y border-r border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">สัญญา</span>
                      <p className="text-base font-bold text-slate-900 font-mono truncate">{item.code || '-'}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">เริ่ม</p>
                      <p className="text-sm text-slate-700 font-semibold mt-0.5">{item.start_date ? dayjs(item.start_date).format('DD/MM/YYYY') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">สิ้นสุด</p>
                      <p className="text-sm text-slate-700 font-semibold mt-0.5">{item.end_date ? dayjs(item.end_date).format('DD/MM/YYYY') : '-'}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 font-medium">มูลค่ารวม</p>
                    <p className="text-lg text-slate-900 font-bold mt-0.5">
                      {item.total_amount != null ? `${Number(item.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿` : '-'}
                    </p>
                  </div>
                  <PdfButton id={item.id} code={item.code} full />
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
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">เลขที่สัญญา</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">เริ่มต้น</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">สิ้นสุด</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">มูลค่า</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">ดาวน์โหลด</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-left font-medium text-slate-800">{item.code || '-'}</td>
                      <td className="px-6 py-4 text-sm text-left text-slate-600">{item.start_date ? dayjs(item.start_date).format('DD/MM/YYYY') : '-'}</td>
                      <td className="px-6 py-4 text-sm text-left text-slate-600">{item.end_date ? dayjs(item.end_date).format('DD/MM/YYYY') : '-'}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-800 font-medium">
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

export default PortalContracts;
