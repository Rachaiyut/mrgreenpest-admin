import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import { Contract, Customer, Quotation } from '../../../types';
import {
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon,
  CalendarDaysIcon,
  PhoneIcon,
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
										<p className="font-medium text-slate-900">{contract.customer_name}</p>
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
							{quotation && (
								<div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex items-center gap-2">
									<DocumentTextIcon className="w-4 h-4 text-slate-500" />
									<span className="text-sm text-slate-600">อ้างอิงใบเสนอราคา: <span className="font-medium text-slate-900">{quotation.code || `QT-${quotation.id.slice(0, 8)}`}</span></span>
								</div>
							)}
						</div>
					</div>

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

