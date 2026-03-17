import React, { useEffect, useState } from 'react';
import { portalApi } from '../../api/customer-portal';
import dayjs from 'dayjs';

const PortalReceipts: React.FC = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await portalApi.getReceipts();
        setReceipts(res.data || []);
      } catch (error) {
        console.error('Error fetching receipts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDownloadPdf = async (id: string, code: string) => {
    try {
      const blob = await portalApi.downloadPdf('receipts', id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${code || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

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
        <h2 className="text-2xl font-bold text-slate-800">ใบเสร็จ</h2>
        <p className="text-slate-500 mt-1">รายการใบเสร็จทั้งหมดของคุณ</p>
      </div>

      {receipts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">ยังไม่มีใบเสร็จ</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">เลขที่</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">วันที่</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">จำนวนเงิน</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">วิธีชำระ</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">ดาวน์โหลด</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{item.code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.received_at ? dayjs(item.received_at).format('DD/MM/YYYY') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-800 font-medium">
                      {item.amount != null
                        ? Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.payment_method || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDownloadPdf(item.id, item.code)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalReceipts;
