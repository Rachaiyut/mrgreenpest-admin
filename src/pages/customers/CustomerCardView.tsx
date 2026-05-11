import { Card } from 'antd';
import { CustomerType } from '@/src/types/enums/customer';
import { Customer } from '@/src/types/entity/app.interface';
import {
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
} from '../../assets/icons/Icons';
import { ActionDropdown, ActionDropdownItem } from '../../components/common/ActionDropdown';

const CustomerCardView: React.FC<{
  customers: Customer[];
  getActions: (customer: Customer) => ActionDropdownItem[];
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
}> = ({ customers, getActions, openDropdownId, setOpenDropdownId }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {customers.length === 0 ? (
      <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-16">
        <svg className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
        <p className="text-base font-medium text-slate-500">ไม่พบข้อมูลลูกค้า</p>
        <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างลูกค้าใหม่</p>
      </div>
    ) : customers.map((customer) => (
      <Card key={customer.id} className="flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                {customer.first_name} {customer.last_name}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${customer.type === CustomerType.CORPORATE ? 'bg-sky-100 text-sky-800' : 'bg-lime-100 text-lime-800'}`}
              >
                {customer.type === CustomerType.CORPORATE
                  ? 'นิติบุคคล'
                  : 'บุคคลธรรมดา'}
              </span>
            </div>
            <div className="relative -mr-2 -mt-1">
              <ActionDropdown
                actions={getActions(customer)}
                itemId={customer.id}
                openId={openDropdownId}
                onToggle={setOpenDropdownId}
              />
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
              <span>{customer.primary_phone}</span>
            </div>
            <div className="flex items-center">
              <EnvelopeIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
              <a
                href={`mailto:${customer.email}`}
                className="hover:text-primary truncate"
              >
                {customer.email}
              </a>
            </div>
            <div className="flex items-center">
              <PhoneIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
              <a href={`tel:${customer.primary_phone}`} className="hover:text-primary">
                {customer.primary_phone}
              </a>
            </div>
          </div>
        </div>
      </Card>
    ))}
  </div>
);

export default CustomerCardView;
