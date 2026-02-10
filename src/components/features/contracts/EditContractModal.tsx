import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { ContractForm } from './ContractForm';
import { useData } from '../../../contexts/DataContext';
import { Contract } from '../../../types/entity/financial.interface';

interface EditContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    contract: Contract | null;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    contract,
}) => {
    const { handlers } = useData();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            const payload = { ...data, id: contract?.id };
            await handlers.contracts.update(payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating contract:', error);
            alert('เกิดข้อผิดพลาดในการแก้ไขใบสัญญา');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !contract) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`แก้ไขใบสัญญา: ${contract.code}`}
            size="7xl"
            footer={null}
        >
            <ContractForm
                mode="edit"
                initialValues={contract}
                onSubmit={handleSubmit}
                onCancel={onClose}
                isSaving={isSaving}
            />
        </Modal>
    );
};
