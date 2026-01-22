import React, { useState, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Contract, Quotation } from '@/src/types/entity/app.interface';
import { ICustomer } from '@/src/types/entity/customer.interface';
import { StatusBadge } from '../../common/StatusBadge';
import { PlusIcon } from '../../../assets/icons/Icons';
import { AddContractModal } from '../contracts/AddContractModal';
import { formatThaiDate } from '../../../utils/date';

interface CustomerContractsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: ICustomer | null;
  contracts: Contract[];
  quotations: Quotation[];
  onCreateContract: (contractData: Omit<Contract, 'id'>) => void;
  onCreateJob?: (jobData: any) => void;
}

export const CustomerContractsListModal: React.FC<
  CustomerContractsListModalProps
> = ({
  isOpen,
  onClose,
  customer,
  contracts,
  quotations,
  onCreateContract,
  onCreateJob,
}) => {
  const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);

  if (!isOpen || !customer) return null;

  const customerContracts = useMemo(
    () => [...contracts].reverse().filter((c) => c.customerId === customer.id),
    [contracts, customer.id]
  );

  const handleCreateContractSuccess = (contractData: Omit<Contract, 'id'>) => {
    onCreateContract(contractData);
    setIsAddContractModalOpen(false); // Close add modal after creation
  };

  const handleAutoSchedule = (contract: Contract) => {
    if (!onCreateJob) return;
    if (!confirm(`ยืนยันการสร้างตารางงานอัตโนมัติสำหรับสัญญา ${contract.id}?`))
      return;

    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const jobsToCreate = [];
    let current = new Date(start);

    // Default 9:00 AM
    current.setHours(9, 0, 0, 0);

    while (current <= end) {
      const startTime = new Date(current);
      const endTime = new Date(current);
      endTime.setHours(10, 0, 0, 0);

      // Calculate next month correctly (handling day overflow if started on 31st)
      // Using simple month increment for now
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // If next month overshoot (e.g. Jan 31 -> Feb 28/29), Date object handles it but might skip Feb if we just do setMonth.
      // But let's stick to simple logic: Same day next month.

      const jobData = {
        customerId: contract.customerId,
        contractId: contract.id,
        quotationId: contract.quotationId,
        customerName: contract.customerName,
        technicians: [],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        title: `บริการ ${contract.servicePackage}`,
        description: 'Auto-scheduled via contract',
        status: 'Planned', // Hardcode or import Status
        location: {
          lat: 13.7563,
          lng: 100.5018,
          address: contract.address,
        },
      };

      onCreateJob(jobData);

      current = nextMonth;
    }
    alert('สร้างตารางงานอัตโนมัติเรียบร้อยแล้ว');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`สัญญาของ ${customer.name}`}
        size="4xl"
        footer={
          <div className="flex w-full justify-between items-center">
            <div></div>
            <Button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
              variant="outline"
            >
              ปิด
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setIsAddContractModalOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
              variant="primary"
            >
              <PlusIcon className="h-5 w-5" />
              สร้างสัญญาใหม่
            </Button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    เลขที่สัญญา
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    ที่อยู่
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    วันเริ่มต้น
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    วันสิ้นสุด
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    สถานะ
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {customerContracts.length > 0 ? (
                  customerContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {contract.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-xs">
                        {contract.address}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatThaiDate(contract.startDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatThaiDate(contract.endDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={contract.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {onCreateJob && (
                          <Button
                            variant="ghost"
                            className="text-primary hover:bg-primary/10 text-xs px-2 py-1 h-auto"
                            onClick={() => handleAutoSchedule(contract)}
                            title="สร้างตารางงานรายเดือนอัตโนมัติ"
                          >
                            สร้างตารางงาน
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-slate-500"
                    >
                      ไม่พบสัญญาสำหรับลูกค้ารายนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
      {isAddContractModalOpen && (
        <AddContractModal
          isOpen={isAddContractModalOpen}
          onClose={() => setIsAddContractModalOpen(false)}
          customer={customer}
          quotations={quotations}
          onCreateContract={handleCreateContractSuccess}
        />
      )}
    </>
  );
};


