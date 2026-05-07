import React, { useEffect, useState } from 'react';
import Swal from '@/src/utils/swal';
import { portalApi } from '../../api/customer-portal';
import dayjs from 'dayjs';

const paymentLabels: Record<string, string> = {
  CASH: 'เงินสด', TRANSFER: 'โอนเงิน', CREDIT_CARD: 'บัตรเครดิต', CHEQUE: 'เช็ค', QR_PAYMENT: 'QR Payment',
};

const PortalServiceReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await portalApi.getServiceReports();
        setReports(res.data || []);
      } catch (error) {
        console.error('Error fetching service reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDownloadPdf = async (id: string) => {
    if (loadingPdfId) return;
    setLoadingPdfId(id);
    try {
      const blob = await portalApi.downloadPdf('service-reports', id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-report-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถดาวน์โหลดเอกสารได้' });
    } finally {
      setLoadingPdfId(null);
    }
  };

  const getServiceTypes = (item: any) => {
    const types = [];
    if (item.is_service_termite) types.push('ปลวก');
    if (item.is_service_ant_roach) types.push('มด/แมลงสาบ');
    if (item.is_service_rodent) types.push('หนู');
    if (item.is_service_mosquito) types.push('ยุง');
    return types;
  };

  const PdfButton = ({ id }: { id: string }) => (
    <button
      onClick={() => handleDownloadPdf(id)}
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
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">รายงานบริการ</h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">รายการรายงานการเข้าบริการทั้งหมด</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
          <p className="text-slate-500">ยังไม่มีรายงานบริการ</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {reports.map((item) => {
              const serviceTypes = getServiceTypes(item);
              const paymentLabel = paymentLabels[item.payment_condition] || null;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-800">
                      {(item.report_date || item.created_at) ? dayjs(item.report_date || item.created_at).format('DD/MM/YYYY') : '-'}
                    </span>
                    <span className="text-sm text-slate-500">{item.time_in || '-'} - {item.time_out || '-'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400">ประเภทบริการ: </span>
                    <span className="text-slate-700 font-medium">{serviceTypes.length > 0 ? serviceTypes.join(', ') : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      {paymentLabel && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{paymentLabel}</span>
                      )}
                      <span className="text-base font-semibold text-slate-800">
                        {item.payment_amount ? `${Number(item.payment_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : '-'}
                      </span>
                    </div>
                    <PdfButton id={item.id} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">วันที่</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">เวลาเข้า-ออก</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">ประเภทบริการ</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">วิธีการชำระเงิน</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">จำนวนเงิน</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">ดาวน์โหลด</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((item) => {
                    const serviceTypes = getServiceTypes(item);
                    const paymentLabel = paymentLabels[item.payment_condition] || null;
                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-left font-medium text-slate-800">
                          {(item.report_date || item.created_at) ? dayjs(item.report_date || item.created_at).format('DD/MM/YYYY') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-slate-600">{item.time_in || '-'} - {item.time_out || '-'}</td>
                        <td className="px-6 py-4 text-sm text-left text-slate-600">{serviceTypes.length > 0 ? serviceTypes.join(', ') : '-'}</td>
                        <td className="px-6 py-4 text-left">
                          {paymentLabel ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{paymentLabel}</span>
                          ) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-slate-800">
                          {item.payment_amount ? `${Number(item.payment_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center"><PdfButton id={item.id} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PortalServiceReports;
