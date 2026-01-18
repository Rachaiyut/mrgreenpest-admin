import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { ContractForm } from '../../components/file/contract';
import { QuotationForm } from '../../components/file/quotation';
import { ServiceReportForm } from '../../components/file/service-report';

const FormsPage: React.FC = () => {
  const tabs = [
    { key: 'contract', label: 'แบบฟอร์มสัญญา' },
    { key: 'quotation', label: 'ใบเสนอราคา' },
    { key: 'invoice', label: 'ใบแจ้งหนี้' },
    { key: 'receipt', label: 'ใบเสร็จรับเงิน' },
    { key: 'service-report', label: 'รายงานบริการ' },
    { key: 'assessment', label: 'ใบประเมิน' },
  ];
  const [activeTab, setActiveTab] = useState<string>('contract');

  const renderTabContent = () => {
    if (activeTab === 'contract') {
      return <ContractForm />;
    }
    if (activeTab === 'quotation') {
      return <QuotationForm />;
    }
    if (activeTab === 'service-report') {
      return <ServiceReportForm />;
    }
    return (
      <div
        style={{
          padding: 24,
          backgroundColor: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 8,
          }}
        >
          ส่วนนี้กำลังอยู่ในระหว่างการพัฒนา
        </h2>
        <p style={{ color: '#64748b' }}>
          เราจะเพิ่มแบบฟอร์มสำหรับแท็บนี้ในลำดับถัดไป
        </p>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">เมนูฟอร์ม</h1>
          <p className="text-slate-600 mt-1">
            รวมฟอร์มสำคัญในระบบเป็นแท็บเดียว
          </p>
        </div>
      </div>
      <Card className="!p-0">
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary border-b-2 border-primary bg-white'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 sm:p-6">{renderTabContent()}</div>
      </Card>
    </div>
  );
};

export default FormsPage;

