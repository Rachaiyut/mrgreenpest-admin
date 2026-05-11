import { Invoice } from "@/src/types";
import { Button, Modal } from "../../common";
import { InvoiceForm } from "./InvoiceForm";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'detail';
  initialValues?: Partial<Invoice> | null;
  onSubmit: (data: any) => Promise<void>;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
}) => {
  const getTitle = () => {
    if (mode === 'create')
      return 'สร้างใบแจ้งหนี้';
    if (mode === 'edit')
      return `แก้ไขใบแจ้งหนี้ ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    if (mode === 'detail')
      return `รายละเอียดใบแจ้งหนี้ ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    return 'ใบแจ้งหนี้';
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        {mode === 'detail' ? 'ปิด' : 'ยกเลิก'}
      </Button>
      {mode !== 'detail' && (
        <Button variant="primary" type="submit" form="invoice-form">
          บันทึก
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="6xl"
      footer={footer} 
    >
      <InvoiceForm
        mode={mode}
        initialValues={initialValues || undefined}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};