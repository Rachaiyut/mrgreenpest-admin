import { Contract, Invoice } from "@/src/types";
import { Button, Modal } from "../../common";
import { ContractForm } from "./ContractForm";

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'detail' | 'renew';
  initialValues?: Partial<Contract> | null;
  onSubmit: (data: any) => Promise<void>;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
}) => {
  const getTitle = () => {
    if (mode === 'create') return 'สร้างใบสัญญา';
    if (mode === 'edit') return `แก้ไขใบสัญญา ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    if (mode === 'detail') return `รายละเอียดใบสัญญา ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    if (mode === 'renew') return `เพิ่มใบสัญญา ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    return 'ใบสัญญา';
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      {mode !== 'detail' && (
        <>
          {/* บันทึกร่าง — สถานะ DRAFT แก้ไขต่อภายหลังได้ */}
          {(mode === 'create' || mode === 'renew') && (
            <Button variant="secondary" type="submit" form="contract-form" name="action" value="draft">
              บันทึกร่าง
            </Button>
          )}
          <Button variant="primary" type="submit" form="contract-form" name="action" value="save">
            บันทึก
          </Button>
        </>
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
      <ContractForm
        mode={mode}
        initialValues={initialValues || undefined}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};