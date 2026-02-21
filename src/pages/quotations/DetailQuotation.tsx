import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/FormControls';
import { LeftArrowIcon } from '../../assets/icons/Icons';
import { useData } from '../../contexts/DataContext';
import { Quotation } from '../../types/entity/financial.interface';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate } from '../../utils/date';
import {
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon,
  CalendarDaysIcon,
  PhoneIcon,
  PencilIcon,
} from '../../assets/icons/Icons';
import {
  QuotationItem as IQuotationItem,
  Status,
} from '@/src/types/entity/app.interface';

const DetailQuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { quotations, handlers } = useData();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  // Fetch quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      if (!id) return;

      // First try to find in context
      const found = quotations?.find((q) => q.id === id);
      if (found) {
        setQuotation(found);
        setLoading(false);
        return;
      }

      // If not in context, could try API call if needed, but for now behave like EditPage
      setLoading(false);
    };
    fetchQuotation();
  }, [id, quotations]);

  const revisionHistory = useMemo(() => {
    if (!quotation || !quotations) return [];
    const baseId = quotation.original_id || quotation.id.split('-')[0];
    return quotations
      .filter((q) => q.original_id === baseId || q.id.startsWith(baseId))
      .sort((a, b) => b.revision - a.revision);
  }, [quotation, quotations]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">ไม่พบข้อมูลใบเสนอราคา</p>
        <Button onClick={() => navigate('/quotations')}>ย้อนกลับ</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/quotations')}>
            <LeftArrowIcon className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายละเอียดใบเสนอราคา
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              รหัส: {quotation.code || quotation.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </div>
      </div>

      {/* Content Card (Similar to Modal Inner) */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">
                {quotation.code || quotation.id}
              </h2>
              <StatusBadge status={quotation.status} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Rev. {quotation.revision}
              </span>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <CalendarDaysIcon className="w-4 h-4" />
                สร้าง: {formatThaiDate(quotation.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4" />
                หมดอายุ: {formatThaiDate(quotation.expires_at)}
              </span>
            </p>
          </div>

          <div className="mt-4 md:mt-0 text-right">
            <p className="text-sm text-slate-500 mb-1">ยอดสุทธิ (Net Total)</p>
            <p className="text-3xl font-bold text-primary">
              ฿
              {quotation.total.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Customer & Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2">
                ข้อมูลลูกค้า
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {quotation.customer_name}
                    </p>
                    {/* @ts-ignore */}
                    {quotation['contact_phone'] && (
                      <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                        <PhoneIcon className="w-3 h-3" />{' '}
                        {quotation['contact_phone']}
                      </p>
                    )}
                  </div>
                </div>
                {quotation.service_location && (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {quotation.service_location}
                      </p>
                      {quotation.google_map_link && (
                        <a
                          href={quotation.google_map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 block"
                        >
                          ดูแผนที่ Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2">
                ข้อมูลงาน
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">ประเภทบริการ</p>
                  <p className="text-sm font-medium text-slate-800">
                    {quotation.service_type || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">ระบบที่ใช้</p>
                  <p className="text-sm font-medium text-slate-800">
                    {quotation.system_used || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">ระยะเวลาสัญญา</p>
                  <p className="text-sm font-medium text-slate-800">
                    {quotation.contract_duration || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    จำนวนครั้งเข้าบริการ
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {quotation.service_count || '-'}
                  </p>
                </div>
              </div>
              {quotation.assessment_id && (
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">
                    อ้างอิงใบประเมิน:{' '}
                    <span className="font-medium text-slate-900">
                      {quotation.assessment_id}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    รายการ (Description)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24"
                  >
                    จำนวน
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32"
                  >
                    ราคา/หน่วย
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32"
                  >
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {quotation.items && quotation.items.length > 0 ? (
                  quotation.items.map((item: IQuotationItem, index: number) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        <div className="font-medium">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                        {item.unit_price.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                        {item.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500 italic"
                    >
                      ไม่พบรายการสินค้า/บริการ
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-3 text-right text-sm font-medium text-slate-600"
                  >
                    รวมเป็นเงิน (Subtotal)
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-slate-800">
                    {quotation.subtotal
                      ? quotation.subtotal.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-3 text-right text-sm font-medium text-slate-600"
                  >
                    ภาษีมูลค่าเพิ่ม (VAT 7%)
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-red-600">
                    {quotation.vat_amount
                      ? quotation.vat_amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-right text-base font-bold text-slate-800"
                  >
                    จำนวนเงินรวมทั้งสิ้น (Grand Total)
                  </td>
                  <td className="px-6 py-4 text-right text-base font-bold text-primary">
                    {quotation.total.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                การชำระเงิน (Installments)
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                ประวัติการแก้ไข ({revisionHistory.length})
              </button>
            </nav>
          </div>

          {/* Tab Panels */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {quotation.payment_terms && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-md">
                  <h4 className="text-sm font-semibold text-orange-800 mb-1">
                    เงื่อนไขการชำระเงิน
                  </h4>
                  <p className="text-sm text-orange-700">
                    {quotation.payment_terms}
                  </p>
                </div>
              )}

              {quotation.installments && quotation.installments.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          งวดที่
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          รายละเอียด
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          %
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          ยอดชำระ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {quotation.installments.map((inst) => (
                        <tr key={inst.id}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            #{inst.term}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {inst.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-600">
                            {inst.percentage}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                            ฿
                            {inst.amount.toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  ไม่มีข้อมูลงวดการชำระเงิน
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {revisionHistory.length > 0 ? (
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {revisionHistory.map((item, itemIdx) => (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {itemIdx !== revisionHistory.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span
                                className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                  item.id === quotation.id
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <span className="text-xs font-bold">
                                  {item.revision}
                                </span>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {item.code || item.id}
                                  {item.id === quotation.id && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Current
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-slate-500">
                                  แก้ไขเมื่อ {formatThaiDate(item.created_at)}
                                </p>
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-slate-500">
                                <StatusBadge status={item.status} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  ไม่มีประวัติการแก้ไข
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailQuotationPage;
