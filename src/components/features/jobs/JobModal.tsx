// src/components/features/jobs/JobModal.tsx

import React from 'react';
import { Modal } from '../../common/Modal';
import { JobForm, JobFormProps } from './JobForm';

// สร้าง Props โดยรับ properties เดียวกับ JobForm แต่เอา mode มาจัดการ Title
interface JobModalProps extends Omit<JobFormProps, 'onCancel'> {
  isOpen: boolean;
  onClose: () => void;
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  mode,
  jobToEdit,
  onSubmitJob,
  warehouses,
  initialContractId,
  initialWorkDateIso,
  contracts,
  jobs,
  users,
}) => {
  // สร้าง Title อัตโนมัติแบบเดียวกับ Contract
  const getTitle = () => {
    if (mode === 'add') return 'สร้างงานภาคสนามใหม่';
    if (mode === 'edit') return `แก้ไขงาน: ${jobToEdit?.customer_name || jobToEdit?.customerName || 'ลูกค้าไม่ระบุ'}`;
    return 'รายละเอียดงานภาคสนาม';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="5xl"
      footer={null} // 🌟 สำคัญ: เอา Footer ออกเพราะปุ่ม ถัดไป/ย้อนกลับ ไปอยู่ใน JobForm แล้ว
    >
      {isOpen && (
        <JobForm
          mode={mode}
          jobToEdit={jobToEdit}
          onSubmitJob={onSubmitJob}
          onCancel={onClose} // ส่งฟังก์ชันปิดกลับไป
          warehouses={warehouses}
          initialContractId={initialContractId}
          initialWorkDateIso={initialWorkDateIso}
          contracts={contracts}
          jobs={jobs}
          users={users}
        />
      )}
    </Modal>
  );
};