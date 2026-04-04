import React from 'react';
import { Modal } from '../../common';
import { Package } from '@/src/types';
import { CurrencyDollarIcon } from '../../../assets/icons/Icons';

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
}

const fmt = (n: number) => `฿${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  isOpen,
  onClose,
  pkg,
}) => {
  if (!isOpen || !pkg) return null;

  const prices = pkg.package_prices || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`รายละเอียดแพ็กเกจ`} size="4xl">
      <div className="space-y-6">
        {/* Section 1: ข้อมูลทั่วไป */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">ข้อมูลแพ็กเกจ</h3>
          </div>
          <div className="p-6">
            {/* ชื่อแพ็กเกจ - แถวแรก เต็มความกว้าง */}
            <div className="mb-4">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">ชื่อแพ็กเกจ</span>
              <span className="text-lg font-bold text-slate-800">{pkg.name}</span>
            </div>
            {/* รหัส + หมวดหมู่ + จำนวนครั้ง */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">รหัสแพ็กเกจ</span>
                <span className="text-base font-bold text-primary font-mono">{pkg.code || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">หมวดหมู่</span>
                <span className="text-base text-slate-700">{(pkg as unknown as Record<string, Record<string, string>>).category?.name || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">จำนวนครั้งเข้าบริการ</span>
                <span className="text-base font-semibold text-slate-800">{pkg.visit_limit ? `${pkg.visit_limit} ครั้ง` : '-'}</span>
              </div>
            </div>
            {pkg.remark && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">หมายเหตุ</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{pkg.remark}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: เงื่อนไขราคา */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                <CurrencyDollarIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-800 text-lg">เงื่อนไขราคาตามพื้นที่</h3>
            </div>
            <span className="text-sm text-slate-500">{prices.length} เงื่อนไข</span>
          </div>
          <div className="p-6 space-y-4">
            {prices.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 bg-slate-50">
                <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ไม่มีเงื่อนไขราคา</p>
              </div>
            ) : (
              prices
                .sort((a, b) => (a.area_range || 0) - (b.area_range || 0))
                .map((cond, idx) => (
                <div key={cond.id || idx} className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">{idx + 1}</span>
                      <span className="text-sm font-semibold text-slate-700">พื้นที่ไม่เกิน {cond.area_range} {(cond as unknown as Record<string, Record<string, string>>).unit?.name || 'ตร.ม.'}</span>
                    </div>
                  </div>
                  {/* Body: 2 กลุ่ม */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* มีปลวก */}
                      <div className="rounded-lg border border-blue-200 overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                          <span className="text-sm font-bold text-blue-700">มีปลวก</span>
                        </div>
                        <div className="p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">ราคาเสนอ</span>
                            <span className="text-base font-bold text-slate-800">{fmt(cond.price_with_termite)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">ราคาต่ำสุด</span>
                            <span className="text-base font-semibold text-amber-600">{fmt(cond.min_price_with_termite)}</span>
                          </div>
                        </div>
                      </div>
                      {/* ไม่มีปลวก */}
                      <div className="rounded-lg border border-emerald-200 overflow-hidden">
                        <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
                          <span className="text-sm font-bold text-emerald-700">ไม่มีปลวก</span>
                        </div>
                        <div className="p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">ราคาเสนอ</span>
                            <span className="text-base font-bold text-slate-800">{fmt(cond.price_without_termite)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">ราคาต่ำสุด</span>
                            <span className="text-base font-semibold text-amber-600">{fmt(cond.min_price_without_termite)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
