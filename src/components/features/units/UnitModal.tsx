import { FC, useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Button } from '../../common/FormControls';
import { IUnit } from '@/src/types/entity/unit.interface';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: IUnit | null;
  onSubmit: (data: Partial<IUnit>) => void | Promise<void>;
}

export const UnitModal: FC<UnitModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialValues) {
        setName(initialValues.name || '');
        setSymbol(initialValues.symbol || '');
      } else {
        setName('');
        setSymbol('');
      }
    }
  }, [isOpen, mode, initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), symbol: symbol.trim() });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'สร้างหน่วยนับ' : 'แก้ไขหน่วยนับ'}
      size="md"
      footer={
        <div className="flex items-center gap-3 w-full justify-end">
          <Button variant="outline" onClick={onClose} className="px-6">
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="px-6 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="ชื่อหน่วยนับ *" htmlFor="unit-name">
          <Input
            id="unit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ตารางเมตร, เมตร, กิโลกรัม"
            maxLength={100}
            required
          />
        </FormField>
        <FormField label="สัญลักษณ์ *" htmlFor="unit-symbol">
          <Input
            id="unit-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="เช่น ตร.ม., ม., กก."
            maxLength={5}
            required
          />
        </FormField>
      </form>
    </Modal>
  );
};
