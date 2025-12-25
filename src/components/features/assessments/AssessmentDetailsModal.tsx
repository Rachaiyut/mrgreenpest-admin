import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Assessment, AssessmentWorkArea } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';
import { MOCK_PRODUCTS, formatThaiDate } from '../../../constants';
import { GoogleMapIcon } from '../../../assets/icons/Icons';

interface AssessmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
}

const WorkAreaDetails: React.FC<{ area: AssessmentWorkArea }> = ({ area }) => {
    const productMap = new Map(MOCK_PRODUCTS.map(p => [p.id, p]));
    const selectedPackage = MOCK_PRODUCTS.find(p => p.id === area.packageId);
    const selectedCondition = selectedPackage?.conditions?.find(c => c.id === area.selectedConditionId);

    return (
        <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
            <h5 className="text-md font-bold text-primary">{area.name}</h5>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                <div><dt className="font-medium text-slate-500">ประเภทสิ่งปลูกสร้าง</dt><dd className="mt-1 text-slate-900">{area.buildingType || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">พื้นที่ (ตร.ม.)</dt><dd className="mt-1 text-slate-900">{area.areaSize}</dd></div>
                <div><dt className="font-medium text-slate-500">ประเภทบริการ</dt><dd className="mt-1 text-slate-900">{area.serviceType.join(', ')}</dd></div>
                <div><dt className="font-medium text-slate-500">ระบบที่ใช้</dt><dd className="mt-1 text-slate-900">{area.serviceSystem || '-'}</dd></div>
            </dl>
             
            { (area.packageId || (area.items && area.items.length > 0)) && (
                <div className="pt-4 border-t">
                    <h6 className="font-semibold text-slate-700 mb-2">รายการและราคาสำหรับพื้นที่นี้</h6>
                    {area.packageId && selectedPackage && (
                        <div className="mb-2">
                             <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                <div><dt className="font-medium text-slate-500">แพ็กเกจ</dt><dd className="mt-1 text-slate-900">{selectedPackage.name}</dd></div>
                                <div><dt className="font-medium text-slate-500">เงื่อนไข</dt><dd className="mt-1 text-slate-900">{selectedCondition ? `ไม่เกิน ${selectedCondition.maxArea} ตร.ม.` : '-'}</dd></div>
                            </dl>
                        </div>
                    )}

                    {area.items && area.items.length > 0 && (
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="p-2 text-left font-medium text-slate-600">สินค้า/บริการเพิ่มเติม</th>
                                        <th className="p-2 text-center font-medium text-slate-600">จำนวน</th>
                                        <th className="p-2 text-right font-medium text-slate-600">ราคา/หน่วย</th>
                                        <th className="p-2 text-right font-medium text-slate-600">ราคารวม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {area.items.map((item, index) => {
                                        const product = productMap.get(item.productId);
                                        return (
                                            <tr key={index} className="border-b border-slate-200 last:border-b-0">
                                                <td className="p-2 font-medium text-slate-800">{product?.name || 'N/A'}</td>
                                                <td className="p-2 text-center">{item.quantity}</td>
                                                <td className="p-2 text-right">฿{item.price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="p-2 text-right">฿{(item.price * item.quantity).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
             <div className="text-right font-semibold text-slate-800 pt-2 border-t">
                ยอดรวมพื้นที่นี้: ฿{area.estimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>
    );
};


export const AssessmentDetailsModal: React.FC<AssessmentDetailsModalProps> = ({ isOpen, onClose, assessment }) => {
  if (!isOpen || !assessment) return null;

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`รายละเอียดใบประเมิน: ${assessment.id}`}
        size="5xl"
        footer={
            <div className="flex w-full items-center justify-between">
                <p className="text-lg font-semibold text-slate-800">ยอดรวมทั้งหมด: <span className="text-primary">฿{assessment.totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                <Button type="button" onClick={onClose} variant="primary">ปิด</Button>
            </div>
        }
    >
      <div className="space-y-6 text-sm">
        <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3">ข้อมูลทั่วไป</h4>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                <div>
                    <dt className="font-medium text-slate-500">รหัสใบประเมิน</dt>
                    <dd className="mt-1 text-slate-900 font-semibold">{assessment.id}</dd>
                </div>
                <div>
                    <dt className="font-medium text-slate-500">ลูกค้า</dt>
                    <dd className="mt-1 text-slate-900 font-semibold">{assessment.customerName}</dd>
                </div>
                <div>
                    <dt className="font-medium text-slate-500">สถานะ</dt>
                    <dd className="mt-1"><StatusBadge status={assessment.status} /></dd>
                </div>
                <div>
                    <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
                    <dd className="mt-1 text-slate-900">{formatThaiDate(assessment.createdAt)}</dd>
                </div>
                 <div>
                    <dt className="font-medium text-slate-500">วันที่นัดหมาย</dt>
                    <dd className="mt-1 text-slate-900">{formatThaiDate(assessment.scheduledAt)}</dd>
                </div>
                 <div>
                    <dt className="font-medium text-slate-500">เงื่อนไขการชำระเงิน</dt>
                    <dd className="mt-1 text-slate-900">{assessment.paymentConditions || '-'}</dd>
                </div>
                 <div>
                    <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
                    <dd className="mt-1 text-slate-900">{assessment.createdBy}</dd>
                </div>
                 <div>
                    <dt className="font-medium text-slate-500">ผู้แก้ไขล่าสุด</dt>
                    <dd className="mt-1 text-slate-900">{assessment.updatedBy}</dd>
                </div>
            </dl>
        </div>
        <hr/>
        <div>
             <h4 className="text-base font-semibold text-slate-800 mb-3">ข้อมูลที่อยู่</h4>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                <div className="md:col-span-3"><dt className="font-medium text-slate-500">ที่อยู่</dt><dd className="mt-1 text-slate-900">{assessment.address || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">แขวง/ตำบล</dt><dd className="mt-1 text-slate-900">{assessment.subdistrict || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">เขต/อำเภอ</dt><dd className="mt-1 text-slate-900">{assessment.district || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">จังหวัด</dt><dd className="mt-1 text-slate-900">{assessment.province || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">รหัสไปรษณีย์</dt><dd className="mt-1 text-slate-900">{assessment.postalCode || '-'}</dd></div>
              </dl>
               {assessment.googleMapLink && (
                <dl className="mt-4">
                    <div>
                        <dt className="font-medium text-slate-500">Link Google Map</dt>
                        <dd className="mt-1 text-slate-900">
                            <a href={assessment.googleMapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline truncate">
                                <GoogleMapIcon className="h-4 w-4" />
                                <span>{assessment.googleMapLink}</span>
                            </a>
                        </dd>
                    </div>
                </dl>
             )}
        </div>
         <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3 mt-4 pt-4 border-t">กลุ่มเส้นทาง/พื้นที่บริการ</h4>
            <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4">
                <div><dt className="font-medium text-slate-500">เขต (พื้นที่บริการ)</dt><dd className="mt-1 text-slate-900">{assessment.zone || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">Group</dt><dd className="mt-1 text-slate-900">{assessment.group || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">สายถนนที่</dt><dd className="mt-1 text-slate-900">{assessment.roadLine || '-'}</dd></div>
                <div><dt className="font-medium text-slate-500">ลำดับที่</dt><dd className="mt-1 text-slate-900">{assessment.sequence || '-'}</dd></div>
            </dl>
        </div>
        <hr/>
        <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3">รายละเอียดพื้นที่ประเมิน</h4>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 -mr-2">
                {assessment.workAreas.map(area => (
                    <WorkAreaDetails key={area.id} area={area} />
                ))}
            </div>
        </div>
      </div>
    </Modal>
  );
};
