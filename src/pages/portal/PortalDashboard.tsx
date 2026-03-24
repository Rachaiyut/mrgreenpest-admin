import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../api/customer-portal';
import { usePortal } from '../../contexts/PortalContext';

const PortalDashboard: React.FC = () => {
  const { customer } = usePortal();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ quotations: 0, contracts: 0, receipts: 0, serviceReports: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [quotationsRes, contractsRes, receiptsRes, reportsRes] = await Promise.all([
          portalApi.getQuotations(),
          portalApi.getContracts(),
          portalApi.getReceipts(),
          portalApi.getServiceReports(),
        ]);
        setCounts({
          quotations: quotationsRes.data?.length || 0,
          contracts: contractsRes.data?.length || 0,
          receipts: receiptsRes.data?.length || 0,
          serviceReports: reportsRes.data?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const cards = [
    {
      title: 'ใบเสนอราคา',
      count: counts.quotations,
      path: '/portal/quotations',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'สัญญา',
      count: counts.contracts,
      path: '/portal/contracts',
      color: 'bg-green-50 border-green-200 text-green-700',
      iconBg: 'bg-green-100',
    },
    {
      title: 'ใบเสร็จ',
      count: counts.receipts,
      path: '/portal/receipts',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'รายงานบริการ',
      count: counts.serviceReports,
      path: '/portal/service-reports',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      iconBg: 'bg-orange-100',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          สวัสดี, {customer?.first_name} {customer?.last_name}
        </h2>
        <p className="text-slate-500 mt-1">ภาพรวมเอกสารของคุณ</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`p-6 rounded-xl border ${card.color} text-left hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold">{card.count}</p>
              <p className="text-sm mt-1 opacity-75">รายการ</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalDashboard;
