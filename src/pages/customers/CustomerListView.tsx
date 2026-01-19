import { Button } from 'antd';

// Interface
import { ICustomer } from '../../../libs/common/interface/api/customer.interface'

// Icon
import { ManageIcon } from '../../assets/icons/Icons';

const CustomerListView: React.FC<{
  customers: ICustomer[];
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
          <th scope="col" className="relative px-6 py-3">
            <span className="sr-only">จัดการ</span>
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
              {customer.id}
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
              {customer.phone}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              {customer.customer_type}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                {customer.created_at}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
              <div className="inline-block text-left">
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