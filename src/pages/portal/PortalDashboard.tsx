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
      ring: 'border-blue-200 hover:border-blue-300',
      bar: 'bg-blue-500',
      accent: 'text-blue-600',
      iconBg: 'bg-blue-100 text-blue-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      title: 'สัญญา',
      count: counts.contracts,
      path: '/portal/contracts',
      ring: 'border-green-200 hover:border-green-300',
      bar: 'bg-green-500',
      accent: 'text-green-600',
      iconBg: 'bg-green-100 text-green-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
        </svg>
      ),
    },
    {
      title: 'ใบเสร็จ',
      count: counts.receipts,
      path: '/portal/receipts',
      ring: 'border-purple-200 hover:border-purple-300',
      bar: 'bg-purple-500',
      accent: 'text-purple-600',
      iconBg: 'bg-purple-100 text-purple-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25 6.75 12 9 9.75M14.25 9 16.5 11.25 14.25 13.5M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75Z" />
        </svg>
      ),
    },
    {
      title: 'รายงานบริการ',
      count: counts.serviceReports,
      path: '/portal/service-reports',
      ring: 'border-orange-200 hover:border-orange-300',
      bar: 'bg-orange-500',
      accent: 'text-orange-600',
      iconBg: 'bg-orange-100 text-orange-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm text-slate-500 font-medium">ยินดีต้อนรับ 👋</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-0.5 tracking-tight">
          {customer?.first_name} {customer?.last_name}
        </h2>
        <p className="text-slate-500 mt-1 text-sm">ภาพรวมเอกสารของคุณ</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`group relative overflow-hidden bg-white p-4 sm:p-5 rounded-2xl border ${card.ring} text-left transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]`}
            >
              <span className={`absolute top-0 left-0 right-0 h-1 ${card.bar}`} />
              <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-700 leading-tight">{card.title}</h3>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                  {card.icon}
                </div>
              </div>
              <p className={`text-3xl sm:text-4xl font-extrabold ${card.accent} tracking-tight`}>{card.count}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">รายการ</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalDashboard;
