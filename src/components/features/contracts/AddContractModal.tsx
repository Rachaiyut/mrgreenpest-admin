import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
import { Customer, Quotation, Contract, Status } from '../../../types';

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  quotations: Quotation[];
  onCreateContract: (contractData: Omit<Contract, 'id'>) => void;
}

export const AddContractModal: React.FC<AddContractModalProps> = ({ isOpen, onClose, customer, quotations, onCreateContract }) => {
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');
  const [servicePackage, setServicePackage] = useState('');

  const approvedQuotations = useMemo(() => 
    quotations.filter(q => q.customerId === customer.id && q.status === Status.Approved),
    [quotations, customer]
  );

  const selectedQuotation = useMemo(() => 
    quotations.find(q => q.id === selectedQuotationId),
    [quotations, selectedQuotationId]
  );
  
  useEffect(() => {
    if (isOpen) {
        setSelectedQuotationId('');
        setStartDate(new Date().toISOString().substring(0, 10));
        setEndDate('');
        setServicePackage('');
        const fullAddress = customer.address
            ? `${customer.address.street}, ${customer.address.subdistrict}, ${customer.address.district}, ${customer.address.province} ${customer.address.postalcode}`
            : '';
        setAddress(fullAddress);
    }
  }, [isOpen, customer]);
  
  const createContractObject = (status: Status): Omit<Contract, 'id'> | null => {
    if (!selectedQuotation) return null;
    return {
        customerId: customer.id,
        customerName: customer.name,
        quotationId: selectedQuotation.id,
        address: address,
        startDate: startDate,
        endDate: endDate,
        servicePackage: servicePackage,
        status: status,
        totalAmount: selectedQuotation.total,
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contractData = createContractObject(Status.InProgress);
    if(contractData) {
        onCreateContract(contractData);
        onClose();
    }
  };
  
  const handleSaveDraft = () => {
    const contractData = createContractObject(Status.Draft);
    if(contractData) {
        onCreateContract(contractData);
        onClose();
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`สร้างสัญญาใหม่สำหรับ ${customer.name}`}
      size="3xl"
      footer={
        <div className="flex gap-2">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300">ยกเลิก</button>
            <button type="button" onClick={handleSaveDraft} className="py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold">
                บันทึกฉบับร่าง
            </button>
            <button type="submit" form="add-contract-form" className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">สร้างสัญญา</button>
        </div>
      }
    >
        <form id="add-contract-form" onSubmit={handleSubmit} className="space-y-4">
            <FormField label="อ้างอิงใบเสนอราคาที่อนุมัติแล้ว" htmlFor="quotation-select">
                <Select id="quotation-select" value={selectedQuotationId} onChange={e => setSelectedQuotationId(e.target.value)} required>
                    <option value="">-- เลือกใบเสนอราคา --</option>
                    {approvedQuotations.map(q => (
                        <option key={q.id} value={q.id}>{q.id} (ยอดรวม: ฿{q.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>
                    ))}
                </Select>
                 {approvedQuotations.length === 0 && <p className="text-sm text-amber-600 mt-2">ไม่พบใบเสนอราคาที่อนุมัติแล้วสำหรับลูกค้ารายนี้</p>}
            </FormField>

            <FormField label="ชื่อแพ็กเกจ/บริการ" htmlFor="service-package">
                <Input 
                    id="service-package" 
                    value={servicePackage} 
                    onChange={e => setServicePackage(e.target.value)} 
                    required 
                    placeholder="เช่น แพ็กเกจกำจัดปลวกรายปี"
                />
            </FormField>

            <FormField label="ที่อยู่สำหรับสัญญา" htmlFor="contract-address">
                <Textarea id="contract-address" value={address} onChange={e => setAddress(e.target.value)} required />
            </FormField>

            {customer.googleMapLink && (
                <FormField label="Link Google Map" htmlFor="google-map-link-display">
                    <a 
                        href={customer.googleMapLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate block mt-1 text-sm p-2 bg-slate-50 rounded-md"
                    >
                        {customer.googleMapLink}
                    </a>
                </FormField>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="วันเริ่มต้นสัญญา" htmlFor="start-date">
                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </FormField>
                <FormField label="วันสิ้นสุดสัญญา" htmlFor="end-date">
                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </FormField>
            </div>
            {selectedQuotation && (
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-base font-semibold text-slate-800 mb-2">ข้อมูลจากใบเสนอราคา</h4>
                    <p className="text-sm text-slate-600"><strong>ยอดรวม:</strong> ฿{selectedQuotation.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            )}
        </form>
    </Modal>
  );
};
