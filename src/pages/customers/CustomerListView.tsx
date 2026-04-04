import { Button } from 'antd';

// Interface
import { Customer } from '@/src/types/entity/customer.interface';

// Component
import { TruncateText } from '../../components/common/TruncateText';
import { StatusBadge } from '../../components/common/StatusBadge';

// Icon
import { ManageIcon } from '../../assets/icons/Icons';
import { CustomerType } from '@/src/types';
import { formatThaiDate } from '@/src/utils/date';
import { formatPhoneNumber } from '@/src/utils/format';

// Helper function to calculate duration
const calculateDuration = (createdAt: string): string => {
  if (!createdAt) return '-';

  const created = new Date(createdAt);
  const now = new Date();

  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'วันนี้';
  if (diffDays < 30) return `${diffDays} วัน`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} เดือน`;

  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;

  if (remainingMonths === 0) return `${diffYears} ปี`;
  return `${diffYears} ปี ${remainingMonths} เดือน`;
};

const TH = (v: string) => (
  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
    {v}
  </th>
);

const CustomerListView: React.FC<{
  customers: Customer[];
  handleDropdownToggle: (
    event: React.MouseEvent<HTMLElement>,
    customerId: string
  ) => void;
  currentPage: number;
  itemsPerPage: number;
}> = ({ customers, handleDropdownToggle, currentPage, itemsPerPage }) => (
  <div className="overflow-x-auto">
    <table className="min-w-[1200px] w-full divide-y divide-slate-200">
      <thead className="bg-slate-50">
        <tr>
          {TH('ลำดับ')}
          {TH('รหัสลูกค้า')}
          {TH('ชื่อ-นามสกุล')}
          {TH('ชื่อเล่น')}
          {TH('เบอร์โทรศัพท์')}
          {TH('ประเภท')}
          <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">
            สัญญา
          </th>
          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">
            บริการล่าสุด
          </th>
          <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">
            บริการถัดไป
          </th>
          <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">
            ยอดค้างชำระ
          </th>
          {TH('ระยะเวลา')}
          <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
            สถานะ
          </th>
          <th scope="col" className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">
            จัดการ
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-200">
        {customers.map((customer: any, index) => {
          const activeContracts = Number(customer.active_contracts_count) || 0;
          const outstandingAmount = Number(customer.outstanding_amount) || 0;
          const expiringContracts = Number(customer.expiring_contracts_count) || 0;

          return (
            <tr key={customer.id} className="hover:bg-slate-50 cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) handleDropdownToggle(e as React.MouseEvent<HTMLElement>, customer.id); }}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                {customer.code}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <TruncateText text={`${customer.first_name} ${customer.last_name || ''}`.trim()} maxWidth={160} className="font-medium text-slate-900" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                {customer.nickname || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                {formatPhoneNumber(customer.primary_phone)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.type === CustomerType.CORPORATE ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {customer.type === CustomerType.CORPORATE ? 'นิติบุคคล' : 'บุคคลธรรมดา'}
                </span>
              </td>
              {/* สัญญา */}
              <td className="px-4 py-3 whitespace-nowrap text-center bg-green-50/50">
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-sm font-semibold ${activeContracts > 0 ? 'text-green-700' : 'text-slate-400'}`}>
                    {activeContracts}
                  </span>
                  {expiringContracts > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title={`${expiringContracts} สัญญาใกล้หมดอายุ`}>
                      !{expiringContracts}
                    </span>
                  )}
                </div>
              </td>
              {/* บริการล่าสุด */}
              <td className="px-4 py-3 whitespace-nowrap text-sm bg-blue-50/50">
                {customer.last_service_date ? formatThaiDate(customer.last_service_date) : <span className="text-slate-400">-</span>}
              </td>
              {/* บริการถัดไป */}
              <td className="px-4 py-3 whitespace-nowrap text-sm bg-blue-50/50">
                {customer.next_service_date ? formatThaiDate(customer.next_service_date) : <span className="text-slate-400">-</span>}
              </td>
              {/* ยอดค้างชำระ */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium bg-red-50/50">
                {outstandingAmount > 0 ? (
                  <span className="text-red-600">
                    ฿{outstandingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-green-600">-</span>
                )}
              </td>
              {/* ระยะเวลา */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                  title={`สร้างเมื่อ: ${formatThaiDate(customer.created_at)}`}
                >
                  {calculateDuration(customer.created_at)}
                </span>
              </td>
              {/* สถานะ */}
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <StatusBadge status={customer.status || 'ACTIVE'} />
              </td>
              {/* จัดการ */}
              <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                <button
                  data-customer-id={customer.id}
                  onClick={(e) => handleDropdownToggle(e, customer.id)}
                  title="ตัวเลือก"
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <ManageIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default CustomerListView;
