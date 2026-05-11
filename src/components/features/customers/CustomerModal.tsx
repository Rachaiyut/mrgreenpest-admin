import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Customer } from '@/src/types/entity/customer.interface';
import { CustomerForm } from './CustomerForm';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Customer | null;
  onSubmit: (data: Omit<Customer, 'id' | 'code'> | Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
}) => {
  const getTitle = () => {
    if (mode === 'create') return 'สร้างลูกค้าใหม่';
    if (mode === 'edit') {
      const name = initialValues ? `${initialValues.first_name} ${initialValues.last_name || ''}`.trim() : '';
      return `แก้ไขข้อมูลลูกค้า ${name ? `(${name})` : ''}`;
    }
    return 'ข้อมูลลูกค้า';
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      <Button variant="primary" type="submit" form="customer-form">
        {mode === 'create' ? 'สร้างลูกค้า' : 'บันทึกการเปลี่ยนแปลง'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="4xl"
      footer={footer}
      closeOnOutsideClick={false}
    >
      <CustomerForm
        mode={mode}
        initialValues={initialValues}
        onSubmit={onSubmit}
      />
    </Modal>
  );
};