import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import { Contract, Customer, Quotation, CategoryType } from '../../../types';
import { QuotationApi } from '../../../api/quotation';
import { CategoryApi } from '../../../api/category';
import {
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon,
  CalendarDaysIcon,
  PhoneIcon,
  ClipboardDocumentListIcon
} from '../../../assets/icons/Icons';

interface ContractDetailsModalProps {
	contract: Contract;
	customers: Customer[];
	quotations: Quotation[];
	onClose: () => void;
}

export const ContractDetailsModal: React.FC<ContractDetailsModalProps> = ({
	contract,
	customers,
	quotations,
	onClose,
}) => {
	const [activeTab, setActiveTab] = useState<'installments'>('installments');
	const customer = customers.find((c) => c.id === contract.customer_id);
	const quotation = quotations.find((q) => q.id === contract.quotation_id);

	const installments = contract.installments || [];
    
    const [fullQuotation, setFullQuotation] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (contract.quotation_id) {
            QuotationApi.getById(contract.quotation_id).then(res => {
                setFullQuotation((res as any).data || res);
            }).catch(console.error);
        }
        CategoryApi.getCategories({ type: CategoryType.SERVICE }).then(res => {
             if (res && res.data) setCategories(res.data);
        }).catch(console.error);
    }, [contract.quotation_id]);

    const serviceTypeOptions = useMemo(() => {
        return categories
            .filter((c: any) => c.type === 'SERVICE')
            .map((c: any) => ({
                value: c.name,
                label: c.name,
                id: c.id
            }));
    }, [categories]);

	return (
		<Modal
			isOpen={true}
			onClose={onClose}
			title="รายละเอียดใบสัญญา"
			size="4xl"
		>
			<div className="bg-white">
				{/* Header Section */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-slate-100 bg-slate-50/50">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h2 className="text-2xl font-bold text-slate-800">{contract.code || contract.id.slice(0, 8)}</h2>
							<StatusBadge status={contract.status} />
						</div>
						<p className="text-slate-500 text-sm flex items-center gap-4 flex-wrap">
							<span className="flex items-center gap-1.5">
								<CalendarDaysIcon className="w-4 h-4" />
								เริ่ม: {formatThaiDate(contract.start_date)}
							</span>
							<span className="flex items-center gap-1.5">
								<ClockIcon className="w-4 h-4" />
								สิ้นสุด: {formatThaiDate(contract.end_date)}
							</span>
						</p>
					</div>

					<div className="mt-4 md:mt-0 text-right">
						<p className="text-sm text-slate-500 mb-1">มูลค่าสัญญา (Total Amount)</p>
						<p className="text-3xl font-bold text-green-600">
							฿{(Number(contract.total_amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
						</p>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					{/* Customer & Contract Info */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
						<div className="space-y-4">
							<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2">ข้อมูลลูกค้า</h3>
							<div className="space-y-3">
								<div className="flex items-start gap-3">
									<UserIcon className="w-5 h-5 text-slate-400 mt-0.5" />
									<div>
										<p className="font-medium text-slate-900">
                                            {customer 
                                                ? `${customer.first_name} ${customer.last_name || ''}`.trim() 
                                                : contract.customer_name}
                                        </p>
										{customer?.phone && (
											<p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
												<PhoneIcon className="w-3 h-3" /> {customer.phone}
											</p>
										)}
										{customer?.email && (
											<p className="text-sm text-slate-500 mt-0.5">
												{customer.email}
											</p>
										)}
									</div>
								</div>
								{contract.service_location && (
									<div className="flex items-start gap-3">
										<MapPinIcon className="w-5 h-5 text-slate-400 mt-0.5" />
										<div>
											<p className="text-sm text-slate-600 leading-relaxed">{contract.service_location}</p>
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2">รายละเอียดสัญญา</h3>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs text-slate-500 mb-1">ประเภทบริการ</p>
									<p className="text-sm font-medium text-slate-800">{contract.service_type || '-'}</p>
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-1">ระบบที่ใช้</p>
									<p className="text-sm font-medium text-slate-800">{contract.system_used || '-'}</p>
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-1">ระยะเวลาสัญญา</p>
									<p className="text-sm font-medium text-slate-800">{contract.contract_duration || '-'}</p>
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-1">จำนวนครั้งเข้าบริการ</p>
									<p className="text-sm font-medium text-slate-800">{contract.service_count ? `${contract.service_count} ครั้ง` : '-'}</p>
								</div>
							</div>
							{(quotation || fullQuotation) && (
								<div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex items-center gap-2">
									<DocumentTextIcon className="w-4 h-4 text-slate-500" />
									<span className="text-sm text-slate-600">อ้างอิงใบเสนอราคา: <span className="font-medium text-slate-900">{(quotation || fullQuotation).code || `QT-${(quotation || fullQuotation).id.slice(0, 8)}`}</span></span>
								</div>
							)}
						</div>
					</div>

                    {/* Area Breakdown */}
                    {(() => {
                        const areasToDisplay = fullQuotation?.quotation_areas?.length > 0
                            ? fullQuotation.quotation_areas
                            : fullQuotation?.assessment?.assessment_areas;

                        if (!areasToDisplay || areasToDisplay.length === 0) return null;

                        return (
                            <div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
                                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <ClipboardDocumentListIcon className="w-5 h-5 text-slate-600" />
                                    <h3 className="text-sm font-semibold text-slate-700">รายละเอียดพื้นที่ (Area Breakdown)</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    {areasToDisplay.map((area: any, index: number) => {
                                        const itemsTotal = area.items?.reduce((sum: number, item: any) => sum + (Number(item.total_price || item.amount) || 0), 0) || 0;
                                        const basePrice = (Number(area.total_price) || 0) - itemsTotal;
                                        return (
                                            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                                                        <h4 className="font-semibold text-slate-800">{area.area_name}</h4>
                                                    </div>
                                                    <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm">
                                                        ฿{Number(area.total_price || 0).toLocaleString()}
                                                    </div>
                                                </div>

                                                <div className="p-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div>
                                                            <div className="text-xs text-slate-500 mb-1">ประเภทสิ่งปลูกสร้าง</div>
                                                            <div className="font-medium text-slate-800">{area.building_type || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500 mb-1">พื้นที่ (ตร.ม.)</div>
                                                            <div className="font-medium text-slate-800">{Number(area.area_size || 0).toLocaleString()}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500 mb-1">ระบบที่ใช้</div>
                                                            <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                                {area.service_system === 'PREY' ? 'เหยื่อ' : area.service_system === 'CHEMICAL' ? 'สารเคมี' : area.service_system || '-'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500 mb-1">ราคาบริการหลัก</div>
                                                            <div className="font-medium text-slate-800">฿{Number(basePrice).toLocaleString()}</div>
                                                        </div>
                                                    </div>

                                                    {/* Package Information */}
                                                    {area.packagePriceRelation && (
                                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                <div className="text-sm font-semibold text-blue-900">แพ็กเกจที่เลือก</div>
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                <div>
                                                                    <div className="text-xs text-blue-600 mb-1">ชื่อแพ็กเกจ</div>
                                                                    <div className="font-medium text-blue-900">
                                                                        {area.packagePriceRelation.package?.name || area.packagePriceRelation.name || '-'}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-blue-600 mb-1">จำนวนครั้งบริการ</div>
                                                                    <div className="font-medium text-blue-900">
                                                                        {area.packagePriceRelation.package?.visit_limit || '-'} ครั้ง
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-blue-600 mb-1">ระยะเวลาสัญญา</div>
                                                                    <div className="font-medium text-blue-900">
                                                                        {area.packagePriceRelation.package?.contract_period
                                                                            ? `${area.packagePriceRelation.package.contract_period >= 12
                                                                                ? (area.packagePriceRelation.package.contract_period / 12) + ' ปี'
                                                                                : area.packagePriceRelation.package.contract_period + ' เดือน'}`
                                                                            : '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mb-4">
                                                        <label className="block text-xs text-slate-500 mb-2">
                                                            ประเภทบริการ
                                                        </label>
                                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                                {serviceTypeOptions.map((option) => {
                                                                    const isChecked = area.category_services?.some((cat: any) => {
                                                                        const matchId = (cat.category_id && cat.category_id === option.id) ||
                                                                            (cat.category?.id && cat.category.id === option.id);
                                                                        const matchName = (cat.name && cat.name === option.value) ||
                                                                            (cat.category?.name && cat.category.name === option.value);
                                                                        return matchId || matchName;
                                                                    });

                                                                    return (
                                                                        <label key={option.id} className="flex items-center gap-2 cursor-default">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                disabled={true}
                                                                                className="rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:opacity-100 bg-white"
                                                                                readOnly
                                                                            />
                                                                            <span className={`text-sm ${isChecked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                                                                {option.label}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {area.items && area.items.length > 0 && (
                                                        <div className="mt-4 border rounded-lg overflow-hidden">
                                                            <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
                                                                สินค้า/บริการเพิ่มเติม
                                                            </div>
                                                            <table className="w-full text-sm text-left">
                                                                <thead className="text-xs text-slate-500 bg-white border-b">
                                                                    <tr>
                                                                        <th className="px-4 py-2 font-medium">รายการ</th>
                                                                        <th className="px-4 py-2 font-medium text-center w-20">จำนวน</th>
                                                                        <th className="px-4 py-2 font-medium text-right w-32">ราคา/หน่วย</th>
                                                                        <th className="px-4 py-2 font-medium text-right w-32">รวม</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {area.items.map((item: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-2 text-slate-800">{item.product_name || item.description}</td>
                                                                            <td className="px-4 py-2 text-center text-slate-600">{item.quantity}</td>
                                                                            <td className="px-4 py-2 text-right text-slate-600">{Number(item.product_price || item.unit_price).toLocaleString()}</td>
                                                                            <td className="px-4 py-2 text-right font-medium text-slate-800">{Number(item.total_price || item.amount).toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })()}

					{/* Items Table (From Quotation) */}
					{quotation && quotation.items && quotation.items.length > 0 && (
						<div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
							<div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
								<h3 className="text-sm font-semibold text-slate-700">รายการบริการ (Services)</h3>
							</div>
							<table className="min-w-full divide-y divide-slate-200">
								<thead className="bg-slate-50">
									<tr>
										<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">#</th>
										<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">รายการ (Description)</th>
										<th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">จำนวน</th>
										<th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">ราคา/หน่วย</th>
										<th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">รวม</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-slate-200">
									{quotation.items.map((item, index) => (
										<tr key={item.id || index} className="hover:bg-slate-50/50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{index + 1}</td>
											<td className="px-6 py-4 text-sm text-slate-900">
												<div className="font-medium">{item.description}</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
												{item.quantity} {item.unit}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
												{item.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
												{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-slate-50">
									<tr>
										<td colSpan={4} className="px-6 py-3 text-right text-sm font-medium text-slate-600">รวมเป็นเงิน (Subtotal)</td>
										<td className="px-6 py-3 text-right text-sm font-bold text-slate-800">
											{quotation.subtotal ? quotation.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
										</td>
									</tr>
									<tr>
										<td colSpan={4} className="px-6 py-3 text-right text-sm font-medium text-slate-600">ภาษีมูลค่าเพิ่ม (VAT 7%)</td>
										<td className="px-6 py-3 text-right text-sm font-bold text-red-600">
											{quotation.vat_amount ? quotation.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
										</td>
									</tr>
									<tr>
										<td colSpan={4} className="px-6 py-4 text-right text-base font-bold text-slate-800">จำนวนเงินรวมทั้งสิ้น (Grand Total)</td>
										<td className="px-6 py-4 text-right text-base font-bold text-green-600">
											{quotation.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					)}

					{/* Tabs */}
					<div className="border-b border-slate-200 mb-6">
						<nav className="flex space-x-8" aria-label="Tabs">
							<button
								onClick={() => setActiveTab('installments')}
								className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'installments'
									? 'border-primary text-primary'
									: 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
									}`}
							>
								แผนการแบ่งชำระ (Payment Plan)
							</button>
						</nav>
					</div>

					{/* Tab Panels */}
					{activeTab === 'installments' && (
						<div className="space-y-4">
							{quotation && quotation.payment_terms && (
								<div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-md">
									<h4 className="text-sm font-semibold text-orange-800 mb-1">เงื่อนไขการชำระเงิน</h4>
									<p className="text-sm text-orange-700">{quotation.payment_terms}</p>
								</div>
							)}

							{installments.length > 0 ? (
								<div className="overflow-hidden rounded-lg border border-slate-200">
									<table className="min-w-full divide-y divide-slate-200">
										<thead className="bg-slate-50">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">งวดที่</th>
												<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">รายละเอียด</th>
												<th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">%</th>
												<th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">ยอดชำระ</th>
												<th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">กำหนดชำระ</th>
												<th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-slate-200">
											{installments.map((inst) => (
												<tr key={inst.id || inst.term}>
													<td className="px-4 py-3 text-sm font-medium text-slate-900">#{inst.term}</td>
													<td className="px-4 py-3 text-sm text-slate-600">{inst.description}</td>
													<td className="px-4 py-3 text-sm text-right text-slate-600">{inst.percentage}%</td>
													<td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
														฿{Number(inst.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
													</td>
													<td className="px-4 py-3 text-sm text-center text-slate-600">
														{inst.due_date ? formatThaiDate(inst.due_date) : '-'}
													</td>
													<td className="px-4 py-3 text-center">
														<StatusBadge status={inst.status} />
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
									ไม่มีข้อมูลแผนการชำระเงิน
								</div>
							)}
						</div>
					)}

					{/* Notes */}
					{contract.notes && (
						<div className="mt-8 pt-6 border-t border-slate-100">
							<h4 className="text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</h4>
							<p className="text-sm text-slate-600 p-4 bg-slate-50 rounded-lg border border-slate-200">
								{contract.notes}
							</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="bg-slate-50 p-4 border-t flex justify-end">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
					>
						ปิดหน้าต่าง
					</button>
				</div>
			</div>
		</Modal>
	);
};

