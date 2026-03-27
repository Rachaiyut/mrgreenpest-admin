import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Customer } from '@/src/types/entity/customer.interface';
import { Job } from '@/src/types/entity/job.interface';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import { JobApi } from '@/src/api/job';
import { LoadingIcon } from '../../../assets/icons/Icons';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      const fetchJobs = async () => {
        setLoading(true);
        try {
          const response = await JobApi.getAll({
            limit: 100,
            customer_id: customer.id,
          } as any);
          setJobs(response.data || []);
        } catch (error) {
          console.error('Error fetching jobs:', error);
          setJobs([]);
        } finally {
          setLoading(false);
        }
      };
      fetchJobs();
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ประวัติการบริการ (${customer.first_name} ${customer.last_name || ''})`}
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
            <p className="text-sm">กำลังโหลดประวัติการบริการ...</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    วันเริ่มต้น
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    วันสิ้นสุด
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    ช่างเทคนิค
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    หมายเหตุ
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {jobs.length > 0 ? (
                  jobs.map((job, index) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {job.start_date ? formatThaiDate(job.start_date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {job.end_date ? formatThaiDate(job.end_date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {job.primary_technician
                          ? `${job.primary_technician.first_name || ''} ${job.primary_technician.last_name || ''}`.trim()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                        {job.remark || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <StatusBadge status={job.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-slate-500"
                    >
                      ไม่พบประวัติการบริการสำหรับลูกค้ารายนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
