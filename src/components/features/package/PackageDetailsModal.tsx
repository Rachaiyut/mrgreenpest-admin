import React from 'react';
import { Modal } from '../../common/Modal';
import { Package } from '@/src/types/entity/package.interface';

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
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
              <dd className="mt-1 text-slate-900 font-semibold">{pkg.code || pkg.id}</dd>
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
                {pkg.visit_limit ? `${pkg.visit_limit} ครั้ง` : '-'}
              </dd>
            </div>
            {/* Contract duration not in interface, so omitting or checking if it's in remark? 
                Just omitting for now as it's not in the data structure provided. 
            */}
            <div>
              <dt className="font-medium text-slate-500">หมายเหตุ</dt>
              <dd className="mt-1 text-slate-900 whitespace-pre-wrap">
                {pkg.remark || '-'}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            เงื่อนไขราคา
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    พื้นที่ฯ (ตร.ม.)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ราคาเสนอ (ไม่มีปลวก)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ราคาเสนอ (มีปลวก)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ราคาต่ำสุด
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pkg.package_price && pkg.package_price.length > 0 ? (
                  pkg.package_price.map((cond, index) => (
                    <tr
                      key={cond.id || index}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-900">
                        ไม่เกิน {cond.area_range}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">
                        ฿
                        {cond.price_no_termite.toLocaleString(
                          'th-TH',
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">
                        ฿
                        {cond.price_with_termite.toLocaleString(
                          'th-TH',
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">
                        ฿
                        {cond.minimum_price.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
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
