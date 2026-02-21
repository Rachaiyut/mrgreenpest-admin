import { Button } from 'antd';

// Interface
import { Customer } from '@/src/types/entity/customer.interface';

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
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-50">
        <tr>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            ลำดับ
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            รหัสลูกค้า
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            ชื่อ-นามสกุล
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            ชื่อเล่น
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            เบอร์โทรศัพท์
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            ประเภทลูกค้า
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            ระยะเวลา
          </th>
          <th
            scope="col"
            className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap"
          >
            จัดการ
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-200">
        {customers.map((customer, index) => (
          <tr key={customer.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              {(currentPage - 1) * itemsPerPage + index + 1}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
              {customer.code}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="text-sm font-medium text-slate-900">
                {customer.first_name} {customer.last_name}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              {customer.nickname || '-'}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              {formatPhoneNumber(customer.phone)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              {customer.type === CustomerType.CORPORATE
                ? 'นิติบุคคล'
                : 'บุคคลธรรมดา'}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                title={`สร้างเมื่อ: ${formatThaiDate(customer.created_at)}`}
              >
                {calculateDuration(customer.created_at)}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
              <div className="inline-block">
                <Button
                  data-customer-id={customer.id}
                  onClick={(e) => handleDropdownToggle(e, customer.id)}
                  title="ตัวเลือก"
                >
                  <span className="sr-only">Open options</span>
                  <ManageIcon className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CustomerListView;
