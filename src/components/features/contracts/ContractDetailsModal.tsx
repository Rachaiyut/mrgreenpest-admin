import React from 'react';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import { Contract, Customer, Quotation } from '../../../types';

interface ContractDetailsModalProps {
	contract: Contract;
	customers: Customer[];
	quotations: Quotation[];
	onClose: () => void;
}

const statusLabels: Record<string, string> = {
	DRAFT: 'ร่าง',
	PENDING: 'รอดำเนินการ',
	ACTIVE: 'ดำเนินการ',
	COMPLETED: 'เสร็จสิ้น',
	CANCELLED: 'ยกเลิก',
	EXPIRED: 'หมดอายุ',
};

export const ContractDetailsModal: React.FC<ContractDetailsModalProps> = ({
	contract,
	customers,
	quotations,
	onClose,
}) => {
	const customer = customers.find((c) => c.id === contract.customer_id);
	const quotation = quotations.find((q) => q.id === contract.quotation_id);

	// Mock installments - in real app, this would come from contract.installments
	const installments = [
		{ term: 1, description: 'งวดที่ 1 - ชำระเมื่อเซ็นสัญญา', percentage: 30, amount: (contract.total_amount || 0) * 0.3, due_date: contract.start_date, status: 'PAID' },
		{ term: 2, description: 'งวดที่ 2 - ชำระหลังบริการครั้งที่ 3', percentage: 35, amount: (contract.total_amount || 0) * 0.35, due_date: '', status: 'PENDING' },
		{ term: 3, description: 'งวดที่ 3 - ชำระหลังบริการครั้งสุดท้าย', percentage: 35, amount: (contract.total_amount || 0) * 0.35, due_date: contract.end_date, status: 'PENDING' },
	];

	return (
		<Modal
			isOpen={true}
			onClose={onClose}
			title={`รายละเอียดใบสัญญา: ${contract.code || contract.id.slice(0, 8)}`}
			size="xl"
		>
			<div className="space-y-6">
				{/* Contract Status */}
				<div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
					<div>
						<span className="text-sm text-slate-500">สถานะ</span>
						<div className="mt-1">
							<StatusBadge status={statusLabels[contract.status as string] || contract.status} />
						</div>
					</div>
					<div className="text-right">
						<span className="text-sm text-slate-500">มูลค่าสัญญา</span>
						<p className="text-2xl font-bold text-green-600">
							฿{(Number(contract.total_amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
						</p>
					</div>
				</div>

				{/* Basic Info */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 className="text-sm font-semibold text-slate-700 mb-2">ข้อมูลสัญญา</h4>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-slate-500">เลขที่สัญญา:</span>
								<span className="font-medium">{contract.code || contract.id.slice(0, 8)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">อ้างอิงใบเสนอราคา:</span>
								<span className="font-medium text-primary">
									{quotation ? `QT-${quotation.id.slice(0, 8)}` : '-'}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">วันเริ่มต้น:</span>
								<span className="font-medium">{formatThaiDate(contract.start_date)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">วันสิ้นสุด:</span>
								<span className="font-medium">{formatThaiDate(contract.end_date)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">ระยะเวลาสัญญา:</span>
								<span className="font-medium">{contract.contract_duration || '-'}</span>
							</div>
						</div>
					</div>

					<div>
						<h4 className="text-sm font-semibold text-slate-700 mb-2">ข้อมูลลูกค้า</h4>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-slate-500">ชื่อลูกค้า:</span>
								<span className="font-medium">{contract.customer_name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">เบอร์โทร:</span>
								<span className="font-medium">{customer?.phone || '-'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-slate-500">อีเมล:</span>
								<span className="font-medium">{customer?.email || '-'}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Service Details */}
				<div>
					<h4 className="text-sm font-semibold text-slate-700 mb-2">รายละเอียดบริการ</h4>
					<div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-slate-500">ประเภทบริการ:</span>
							<span className="font-medium">{contract.service_type || '-'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-500">ระบบที่ใช้:</span>
							<span className="font-medium">{contract.system_used || '-'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-500">จำนวนครั้งเข้าบริการ:</span>
							<span className="font-medium">{contract.service_count || '-'} ครั้ง</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-500">สถานที่ให้บริการ:</span>
							<span className="font-medium">{contract.service_location || '-'}</span>
						</div>
					</div>
				</div>

				{/* Installment Plan */}
				<div>
					<h4 className="text-sm font-semibold text-slate-700 mb-2">แผนการแบ่งชำระ</h4>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">งวด</th>
									<th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">รายละเอียด</th>
									<th className="px-4 py-2 text-center text-xs font-semibold text-slate-600">%</th>
									<th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">จำนวนเงิน</th>
									<th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">กำหนดชำระ</th>
									<th className="px-4 py-2 text-center text-xs font-semibold text-slate-600">สถานะ</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{installments.map((inst) => (
									<tr key={inst.term} className="hover:bg-slate-50">
										<td className="px-4 py-2 text-sm text-slate-700 font-medium">{inst.term}</td>
										<td className="px-4 py-2 text-sm text-slate-600">{inst.description}</td>
										<td className="px-4 py-2 text-sm text-slate-600 text-center">{inst.percentage}%</td>
										<td className="px-4 py-2 text-sm text-slate-700 text-right font-medium">
											฿{inst.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
										</td>
										<td className="px-4 py-2 text-sm text-slate-600">
											{inst.due_date ? formatThaiDate(inst.due_date) : '-'}
										</td>
										<td className="px-4 py-2 text-center">
											<StatusBadge status={inst.status === 'PAID' ? 'ชำระแล้ว' : 'รอชำระ'} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Notes */}
				{contract.notes && (
					<div>
						<h4 className="text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</h4>
						<p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
							{contract.notes}
						</p>
					</div>
				)}
			</div>
		</Modal>
	);
};

