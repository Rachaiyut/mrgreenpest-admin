import { Button, Card } from 'antd';

// Enum
import { CustomerType } from '@/src/types/enums/customer';

// Interface
import { Customer } from '@/src/types/entity/app.interface';

// Icon
import {
  ManageIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
} from '../../assets/icons/Icons';

const CustomerCardView: React.FC<{
  customers: Customer[];
  handleDropdownToggle: (
    event: React.MouseEvent<HTMLElement>,
    customerId: string
  ) => void;
}> = ({ customers, handleDropdownToggle }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {customers.map((customer) => (
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
                  : 'บุคคล'}
              </span>
            </div>
            <div className="relative">
              <Button
                data-customer-id={customer.id}
                onClick={(e) => handleDropdownToggle(e, customer.id)}
                className="-mr-2 -mt-1"
                title="ตัวเลือก"
              >
                <span className="sr-only">Open options</span>
                <ManageIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
              <span>{customer.phone}</span>
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
              <a href={`tel:${customer.phone}`} className="hover:text-primary">
                {customer.phone}
              </a>
            </div>
          </div>
        </div>
        {/* {customer.contractUntil && (
          <div className="mt-4 pt-4 border-t border-slate-200 text-xs">
            <p className="text-slate-500">
              <span className="font-semibold">สัญญาถึง:</span>{' '}
              {formatThaiDate(customer.contractUntil)}
            </p>
          </div>
        )} */}
      </Card>
    ))}
  </div>
);

export default CustomerCardView;
