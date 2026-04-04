import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Contract } from '@/src/types/entity/financial.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import { ContractApi } from '@/src/api/contract';
import { LoadingIcon, RenewIcon } from '../../../assets/icons/Icons';
import { ContractModal } from '../contracts/ContractModal';

interface CustomerContractsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  contracts?: Contract[];
  onCreateContract?: (contractData: Omit<Contract, 'id'>) => void;
  onCreateJob?: (jobData: any) => void;
}

export const CustomerContractsListModal: React.FC<
  CustomerContractsListModalProps
> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [customerContracts, setCustomerContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const fetchContracts = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const response = await ContractApi.getAll({
        limit: 100,
        customer_id: customer.id,
      } as Record<string, unknown>);
      setCustomerContracts(response.data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setCustomerContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      fetchContracts();
    }
  }, [isOpen, customer]);

  const handleRenewClick = async (contract: Contract) => {
    try {
      const response: any = await ContractApi.getById(contract.id);
      const fullContract = response?.data || response;
      setSelectedContract(fullContract);
      setIsRenewModalOpen(true);
    } catch {
      setSelectedContract(contract);
      setIsRenewModalOpen(true);
    }
  };

  const handleRenewSubmit = async (data: any) => {
    if (!selectedContract) return;
    try {
      await ContractApi.renew(selectedContract.id, data);
      setIsRenewModalOpen(false);
      setSelectedContract(null);
      Swal.fire({ icon: 'success', title: 'ต่อสัญญาสำเร็จ', timer: 1500, showConfirmButton: false });
      fetchContracts();
    } catch (error) {
      console.error('Error renewing contract:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถต่อสัญญาได้' });
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !isRenewModalOpen}
        onClose={onClose}
        title={`รายการสัญญา (${customer.first_name} ${customer.last_name || ''})`}
        size="4xl"
        footer={
          <div className="flex w-full justify-end">
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <LoadingIcon className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">กำลังโหลดข้อมูลสัญญา...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      เลขที่สัญญา
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      ยอดสัญญา
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      วันเริ่มต้น
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      วันสิ้นสุด
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      สถานะ
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {customerContracts.length > 0 ? (
                    customerContracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          {contract.code || contract.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {Number(contract.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatThaiDate(contract.start_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatThaiDate(contract.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={contract.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => handleRenewClick(contract)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                            title="ต่อสัญญา"
                          >
                            <RenewIcon className="w-4 h-4" />
                            ต่อสัญญา
                          </button>
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
          )}
        </div>
      </Modal>

      <ContractModal
        isOpen={isRenewModalOpen}
        onClose={() => {
          setIsRenewModalOpen(false);
          setSelectedContract(null);
        }}
        mode="renew"
        initialValues={selectedContract}
        onSubmit={handleRenewSubmit}
      />
    </>
  );
};
