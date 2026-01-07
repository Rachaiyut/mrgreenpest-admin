import React from 'react';
import { Modal } from '../../common/Modal';
import { Product } from '../../../types';

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Product | null;
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  isOpen,
  onClose,
  pkg,
}) => {
  if (!isOpen || !pkg) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดแพ็กเกจ: ${pkg.name}`}
      size="3xl"
    >
      <div className="space-y-6 text-sm">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลทั่วไป
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="font-medium text-slate-500">รหัสแพ็กเกจ</dt>
              <dd className="mt-1 text-slate-900 font-semibold">{pkg.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ชื่อแพ็กเกจ</dt>
              <dd className="mt-1 text-slate-900 font-semibold">{pkg.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">
                จำนวนครั้งที่เข้าบริการ
              </dt>
              <dd className="mt-1 text-slate-900">
                {pkg.numberOfVisits ? `${pkg.numberOfVisits} ครั้ง` : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">อายุสัญญา</dt>
              <dd className="mt-1 text-slate-900">
                {pkg.contractDuration || '-'}
              </dd>
            </div>
            {pkg.description && (
              <div className="md:col-span-2">
                <dt className="font-medium text-slate-500">หมายเหตุ</dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md">
                  {pkg.description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            เงื่อนไขราคา
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left font-medium text-slate-600">
                    พื้นที่ฯ (ตร.ม.)
                  </th>
                  <th className="p-2 text-right font-medium text-slate-600">
                    ราคาเสนอ (ไม่มีปลวก)
                  </th>
                  <th className="p-2 text-right font-medium text-slate-600">
                    ราคาเสนอ (มีปลวก)
                  </th>
                  <th className="p-2 text-right font-medium text-slate-600">
                    ราคาต่ำสุด
                  </th>
                </tr>
              </thead>
              <tbody>
                {pkg.conditions && pkg.conditions.length > 0 ? (
                  pkg.conditions.map((cond, index) => (
                    <tr
                      key={cond.id || index}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="p-2 text-slate-700">
                        ไม่เกิน {cond.maxArea}
                      </td>
                      <td className="p-2 text-right text-slate-700">
                        ฿
                        {cond.firstOfferPriceNoTermites.toLocaleString(
                          'th-TH',
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="p-2 text-right text-slate-700">
                        ฿
                        {cond.firstOfferPriceWithTermites.toLocaleString(
                          'th-TH',
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="p-2 text-right text-slate-700">
                        ฿
                        {cond.minPrice.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-500">
                      ไม่มีเงื่อนไขราคา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
