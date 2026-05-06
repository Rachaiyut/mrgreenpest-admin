import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { TruckIcon } from '../../../assets/icons/Icons';

interface VehicleOption {
  id: string;
  name: string;
  registration: string;
  jobCount: number;
}

interface VehicleSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (vehicleId: string) => void;
  vehicles: VehicleOption[];
}

export const VehicleSelectModal: React.FC<VehicleSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  vehicles,
}) => {
  const [selected, setSelected] = useState('');

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    setSelected('');
  };

  const handleClose = () => {
    setSelected('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="เลือกรถที่ต้องการจบงาน"
      size="md"
      footer={
        <div className="flex gap-3 w-full justify-end">
          <Button variant="outline" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selected}
            className="!bg-red-600 hover:!bg-red-700 !border-red-600"
          >
            ถัดไป
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">คุณมีงานในรถหลายคัน กรุณาเลือกรถที่ต้องการจบงานรายวัน</p>
        <div className="space-y-2">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                selected === v.id
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="p-2 bg-slate-100 rounded-lg">
                <TruckIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{v.name}</p>
                {v.registration && (
                  <p className="text-xs text-slate-400">{v.registration}</p>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {v.jobCount} งาน
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
