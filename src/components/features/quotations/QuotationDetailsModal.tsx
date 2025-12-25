import { useMemo } from 'react';
import type { FC } from 'react';
import { Modal } from '../../common/Modal';
import { Quotation, InstallmentPlan, Status } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../constants';
import { SectionTitle, DetailsList, DetailsItem } from '../../common/FormControls';

interface QuotationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  allQuotations?: Quotation[];
  onCreateInvoice?: (installment: InstallmentPlan) => void;
}

export const QuotationDetailsModal: FC<QuotationDetailsModalProps> = ({ isOpen, onClose, quotation, allQuotations = [], onCreateInvoice }) => {
  const revisionHistory = useMemo(() => {
    if (!quotation || !allQuotations) return [];
    const baseId = quotation.id.split('-')[0];
    return allQuotations
      .filter(q => q.id.startsWith(baseId))
      .sort((a, b) => b.revision - a.revision);
  }, [quotation, allQuotations]);

  if (!isOpen || !quotation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบเสนอราคา: ${quotation.id}`}
      size="2xl"
    >
      <div className="space-y-4 text-sm">
        <SectionTitle>รายละเอียดใบเสนอราคา</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label="เลขที่ใบเสนอราคา" valueClassName="font-semibold">{quotation.id}</DetailsItem>
          <DetailsItem label="สถานะ"><StatusBadge status={quotation.status} /></DetailsItem>
          <DetailsItem label="ลูกค้า" valueClassName="font-semibold">{quotation.customerName}</DetailsItem>
          <DetailsItem label="อ้างอิงใบประเมิน">{quotation.assessmentId || '-'}</DetailsItem>
          <DetailsItem label="วันที่สร้าง">{formatThaiDate(quotation.createdAt)}</DetailsItem>
          <DetailsItem label="หมดอายุวันที่">{formatThaiDate(quotation.expiresAt)}</DetailsItem>
          {quotation.googleMapLink && (
            <DetailsItem label="Link Google Map">
              <a href={quotation.googleMapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                {quotation.googleMapLink}
              </a>
            </DetailsItem>
          )}
        </DetailsList>
        <div className="pt-2 border-t mt-2">
          <SectionTitle>ยอดรวม</SectionTitle>
          <DetailsList>
            <DetailsItem label="จำนวน" valueClassName="text-2xl font-bold text-primary">฿{quotation.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</DetailsItem>
          </DetailsList>
        </div>

        {quotation.installments && quotation.installments.length > 0 && (
          <div className="pt-4 border-t mt-4">
            <SectionTitle>แผนการชำระเงิน (Payment Plan)</SectionTitle>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">งวดที่</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">รายละเอียด</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">%</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">จำนวนเงิน</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {quotation.installments.map((inst) => (
                    <tr key={inst.id}>
                      <td className="px-3 py-2 text-sm text-slate-900">{inst.term}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{inst.description}</td>
                      <td className="px-3 py-2 text-sm text-right text-slate-500">{inst.percentage}%</td>
                      <td className="px-3 py-2 text-sm text-right text-slate-900 font-medium">฿{inst.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-sm text-center">
                        <StatusBadge status={inst.status} />
                      </td>
                      <td className="px-3 py-2 text-sm text-center">
                        {inst.status === Status.Pending ? (
                          <button
                            onClick={() => onCreateInvoice && onCreateInvoice(inst)}
                            className="text-primary hover:text-primary-dark text-xs font-medium underline"
                          >
                            สร้างใบแจ้งหนี้
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {revisionHistory.length > 0 && (
          <div className="pt-4 border-t mt-4">
            <SectionTitle>ประวัติการแก้ไข (Version History)</SectionTitle>
            <div className="mt-3 flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-200">
                {revisionHistory.map((item) => (
                  <li key={item.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${item.id === quotation.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="text-xs font-medium">{item.revision}</span>
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.id}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {formatThaiDate(item.createdAt)}
                        </p>
                      </div>
                      <div>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
