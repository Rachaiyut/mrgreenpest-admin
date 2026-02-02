import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import {
	FormField,
	Input,
	Select,
	Button,
	Textarea,
} from '../../components/common/FormControls';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { LeftArrowIcon, PlusIcon, TrashIcon } from '../../assets/icons/Icons';
import { useData } from '../../contexts/DataContext';

interface InvoiceItem {
	id: string;
	description: string;
	quantity: number;
	unit: string;
	unitPrice: number;
	amount: number;
}

const CreateInvoicePage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { customers, contracts, quotations, handlers } = useData();

	// Invoice info
	const [invoiceCode, setInvoiceCode] = useState('');
	const [issuedDate, setIssuedDate] = useState('');
	const [dueDate, setDueDate] = useState('');

	// References
	const [selectedContractId, setSelectedContractId] = useState('');
	const [selectedInstallmentTerm, setSelectedInstallmentTerm] = useState<number | null>(null);
	const [selectedCustomerId, setSelectedCustomerId] = useState('');

	// Items
	const [items, setItems] = useState<InvoiceItem[]>([
		{
			id: crypto.randomUUID(),
			description: '',
			quantity: 1,
			unit: 'รายการ',
			unitPrice: 0,
			amount: 0,
		},
	]);

	// VAT settings
	const [includeVat, setIncludeVat] = useState(true);
	const vatRate = 0.07;
	const [notes, setNotes] = useState('');

	// Contract options for dropdown
	const contractOptions = useMemo(() => {
		return (contracts || [])
			.filter((c) => c.status === 'ACTIVE')
			.map((c) => ({
				value: c.id,
				label: `${c.code || `CT-${c.id.slice(0, 8)}`} - ${c.customer_name}`,
				description: `฿${Number(c.total_amount).toLocaleString('th-TH')}`,
			}));
	}, [contracts]);

	// Selected contract details
	const selectedContract = useMemo(() => {
		return contracts?.find((c) => c.id === selectedContractId);
	}, [contracts, selectedContractId]);

	// Mock installments from contract (in real app, this would come from contract.installments)
	const contractInstallments = useMemo(() => {
		if (!selectedContract) return [];
		const total = Number(selectedContract.total_amount) || 0;
		return [
			{ term: 1, description: 'งวดที่ 1 - ชำระเมื่อเซ็นสัญญา', percentage: 30, amount: total * 0.3, status: 'PENDING' },
			{ term: 2, description: 'งวดที่ 2 - ชำระหลังบริการครั้งที่ 3', percentage: 35, amount: total * 0.35, status: 'PENDING' },
			{ term: 3, description: 'งวดที่ 3 - ชำระหลังบริการครั้งสุดท้าย', percentage: 35, amount: total * 0.35, status: 'PENDING' },
		];
	}, [selectedContract]);

	// Selected customer details
	const selectedCustomer = useMemo(() => {
		return customers.find((c) => c.id === selectedCustomerId);
	}, [customers, selectedCustomerId]);

	// Calculate totals
	const subtotal = useMemo(() => {
		return items.reduce((sum, item) => sum + item.amount, 0);
	}, [items]);

	const vatAmount = useMemo(() => {
		return includeVat ? subtotal * vatRate : 0;
	}, [subtotal, includeVat]);

	const netTotal = useMemo(() => {
		return subtotal + vatAmount;
	}, [subtotal, vatAmount]);

	// Initialize from URL params
	useEffect(() => {
		const contractIdFromUrl = searchParams.get('contractId');
		if (contractIdFromUrl) {
			setSelectedContractId(contractIdFromUrl);
		}

		// Generate invoice code
		const now = new Date();
		const code = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
		setInvoiceCode(code);

		// Set default dates
		setIssuedDate(now.toISOString().substring(0, 10));
		const dueDateObj = new Date(now);
		dueDateObj.setDate(dueDateObj.getDate() + 30);
		setDueDate(dueDateObj.toISOString().substring(0, 10));
	}, [searchParams]);

	// Auto-fill from contract when selected
	useEffect(() => {
		if (selectedContract) {
			setSelectedCustomerId(selectedContract.customer_id);
		}
	}, [selectedContract]);

	// Auto-fill from installment when selected
	useEffect(() => {
		if (selectedInstallmentTerm && contractInstallments.length > 0) {
			const inst = contractInstallments.find((i) => i.term === selectedInstallmentTerm);
			if (inst) {
				setItems([
					{
						id: crypto.randomUUID(),
						description: inst.description,
						quantity: 1,
						unit: 'งวด',
						unitPrice: inst.amount,
						amount: inst.amount,
					},
				]);
			}
		}
	}, [selectedInstallmentTerm, contractInstallments]);

	// Handle item changes
	const handleItemChange = (
		id: string,
		field: keyof InvoiceItem,
		value: string | number
	) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== id) return item;

				const updated = { ...item, [field]: value };

				// Recalculate amount
				if (field === 'quantity' || field === 'unitPrice') {
					updated.amount = updated.quantity * updated.unitPrice;
				}

				return updated;
			})
		);
	};

	const addItem = () => {
		setItems((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				description: '',
				quantity: 1,
				unit: 'รายการ',
				unitPrice: 0,
				amount: 0,
			},
		]);
	};

	const removeItem = (id: string) => {
		if (items.length <= 1) return;
		setItems((prev) => prev.filter((item) => item.id !== id));
	};

	// Handle submit
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedCustomerId || !selectedCustomer) {
			alert('กรุณาเลือกลูกค้า');
			return;
		}

		if (items.every((item) => !item.description || item.amount === 0)) {
			alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
			return;
		}

		try {
			const invoiceData = {
				code: invoiceCode,
				contract_id: selectedContractId || undefined,
				installment_term: selectedInstallmentTerm || undefined,
				customer_id: selectedCustomerId,
				customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
				issued_at: issuedDate,
				due_at: dueDate,
				subtotal: subtotal,
				vat_amount: vatAmount,
				include_vat: includeVat,
				total: netTotal,
				status: 'DRAFT',
				notes: notes,
				items: items.map((item, index) => ({
					sequence: index + 1,
					description: item.description,
					quantity: item.quantity,
					unit: item.unit,
					unit_price: item.unitPrice,
					amount: item.amount,
				})),
			};

			await handlers.invoices.create(invoiceData);
			navigate('/billing');
		} catch (error) {
			console.error('Error creating invoice:', error);
			alert('เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					onClick={() => navigate('/billing')}
					className="!p-2"
				>
					<LeftArrowIcon className="w-5 h-5" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold text-slate-800">สร้างใบแจ้งหนี้ใหม่</h1>
					<p className="text-slate-500 mt-1">
						สร้างใบแจ้งหนี้จากสัญญาหรือสร้างใหม่
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Invoice Details */}
				<Card title="ข้อมูลใบแจ้งหนี้">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<FormField label="เลขที่ใบแจ้งหนี้" htmlFor="invoice-code">
							<Input
								id="invoice-code"
								type="text"
								value={invoiceCode}
								onChange={(e) => setInvoiceCode(e.target.value)}
								required
							/>
						</FormField>

						<FormField label="วันที่ออกใบแจ้งหนี้" htmlFor="issued-date">
							<Input
								id="issued-date"
								type="date"
								value={issuedDate}
								onChange={(e) => setIssuedDate(e.target.value)}
								required
							/>
						</FormField>

						<FormField label="วันครบกำหนดชำระ" htmlFor="due-date">
							<Input
								id="due-date"
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								required
							/>
						</FormField>
					</div>
				</Card>

				{/* Contract Reference */}
				<Card title="อ้างอิงสัญญา (ถ้ามี)">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="เลือกสัญญา" htmlFor="contract-select">
							<SearchableSelect
								value={selectedContractId}
								onChange={(value) => {
									setSelectedContractId(value);
									setSelectedInstallmentTerm(null);
								}}
								placeholder="-- เลือกสัญญา (ไม่บังคับ) --"
								options={contractOptions}
							/>
						</FormField>

						{selectedContract && (
							<FormField label="เลือกงวดชำระ" htmlFor="installment-select">
								<Select
									id="installment-select"
									value={selectedInstallmentTerm || ''}
									onChange={(e) => setSelectedInstallmentTerm(e.target.value ? Number(e.target.value) : null)}
								>
									<option value="">-- เลือกงวดชำระ --</option>
									{contractInstallments.map((inst) => (
										<option key={inst.term} value={inst.term}>
											{inst.description} - ฿{inst.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
										</option>
									))}
								</Select>
							</FormField>
						)}
					</div>

					{selectedContract && (
						<div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<h4 className="text-sm font-medium text-blue-700 mb-2">
								ข้อมูลจากสัญญา
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
								<div>
									<span className="text-slate-500">เลขที่สัญญา:</span>{' '}
									<span className="font-medium">{selectedContract.code || `CT-${selectedContract.id.slice(0, 8)}`}</span>
								</div>
								<div>
									<span className="text-slate-500">ลูกค้า:</span>{' '}
									<span className="font-medium">{selectedContract.customer_name}</span>
								</div>
								<div>
									<span className="text-slate-500">มูลค่าสัญญา:</span>{' '}
									<span className="font-medium text-green-600">
										฿{Number(selectedContract.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
									</span>
								</div>
							</div>
						</div>
					)}
				</Card>

				{/* Customer Selection */}
				<Card title="ข้อมูลลูกค้า">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="เลือกลูกค้า" htmlFor="customer-select">
							<SearchableSelect
								value={selectedCustomerId}
								onChange={setSelectedCustomerId}
								placeholder="-- เลือกลูกค้า --"
								required
								options={customers.map((c) => ({
									value: c.id,
									label: `${c.code} - ${c.first_name} ${c.last_name}`,
									description: c.phone || '',
								}))}
							/>
						</FormField>

						<FormField label="เบอร์ติดต่อ" htmlFor="customer-phone">
							<Input
								id="customer-phone"
								type="text"
								value={selectedCustomer?.phone || ''}
								disabled
								className="bg-slate-50"
							/>
						</FormField>
					</div>

					{selectedCustomer && (
						<div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
							<h4 className="text-sm font-medium text-slate-700 mb-2">
								ข้อมูลลูกค้า
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
								<div>
									<span className="text-slate-500">ชื่อ:</span>{' '}
									<span className="font-medium">
										{selectedCustomer.first_name} {selectedCustomer.last_name}
									</span>
								</div>
								<div>
									<span className="text-slate-500">อีเมล:</span>{' '}
									<span className="font-medium">
										{selectedCustomer.email || '-'}
									</span>
								</div>
								<div className="md:col-span-2">
									<span className="text-slate-500">ที่อยู่:</span>{' '}
									<span className="font-medium">
										{[
											selectedCustomer.address_house_no,
											selectedCustomer.road_line,
											selectedCustomer.sub_district,
											selectedCustomer.district,
											selectedCustomer.province,
											selectedCustomer.postal_code,
										]
											.filter(Boolean)
											.join(' ') || '-'}
									</span>
								</div>
							</div>
						</div>
					)}
				</Card>

				{/* Line Items */}
				<Card title="รายการ">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16">
										ลำดับ
									</th>
									<th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
										รายการ
									</th>
									<th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-24">
										จำนวน
									</th>
									<th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-24">
										หน่วย
									</th>
									<th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-32">
										ราคา/หน่วย
									</th>
									<th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-32">
										จำนวนเงิน
									</th>
									<th className="px-3 py-3 w-12"></th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-200">
								{items.map((item, index) => (
									<tr key={item.id} className="hover:bg-slate-50">
										<td className="px-3 py-2 text-center text-sm text-slate-500">
											{index + 1}
										</td>
										<td className="px-3 py-2">
											<Input
												type="text"
												value={item.description}
												onChange={(e) =>
													handleItemChange(item.id, 'description', e.target.value)
												}
												placeholder="รายละเอียด"
												className="!py-1"
											/>
										</td>
										<td className="px-3 py-2">
											<Input
												type="number"
												value={item.quantity}
												onChange={(e) =>
													handleItemChange(item.id, 'quantity', Number(e.target.value))
												}
												min={1}
												className="!py-1 text-center"
											/>
										</td>
										<td className="px-3 py-2">
											<Input
												type="text"
												value={item.unit}
												onChange={(e) =>
													handleItemChange(item.id, 'unit', e.target.value)
												}
												className="!py-1 text-center"
											/>
										</td>
										<td className="px-3 py-2">
											<Input
												type="number"
												value={item.unitPrice}
												onChange={(e) =>
													handleItemChange(item.id, 'unitPrice', Number(e.target.value))
												}
												min={0}
												step={0.01}
												className="!py-1 text-right"
											/>
										</td>
										<td className="px-3 py-2 text-right text-sm text-slate-700 font-medium">
											฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
										</td>
										<td className="px-3 py-2">
											<Button
												type="button"
												variant="ghost"
												onClick={() => removeItem(item.id)}
												className="!p-1 text-red-500 hover:text-red-700"
												disabled={items.length <= 1}
											>
												<TrashIcon className="w-4 h-4" />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex justify-center mt-4 border-t border-slate-200 pt-4">
						<Button
							type="button"
							variant="ghost"
							onClick={addItem}
							className="flex items-center gap-2 text-primary"
						>
							<PlusIcon className="w-4 h-4" />
							เพิ่มรายการ
						</Button>
					</div>

					{/* Totals */}
					<div className="mt-6 flex justify-end">
						<div className="w-full max-w-sm space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-slate-500">ยอดรวมก่อน VAT</span>
								<span className="font-medium">
									฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between items-center text-sm">
								<label className="flex items-center gap-2 text-slate-500">
									<input
										type="checkbox"
										checked={includeVat}
										onChange={(e) => setIncludeVat(e.target.checked)}
										className="rounded border-slate-300"
									/>
									VAT 7%
								</label>
								<span className="font-medium">
									฿{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-3">
								<span>ยอดรวมสุทธิ</span>
								<span className="text-green-600">
									฿{netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
								</span>
							</div>
						</div>
					</div>
				</Card>

				{/* Notes */}
				<Card title="หมายเหตุ">
					<FormField label="หมายเหตุ" htmlFor="notes">
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
						/>
					</FormField>
				</Card>

				{/* Submit */}
				<div className="flex justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate('/billing')}
					>
						ยกเลิก
					</Button>
					<Button type="submit">
						สร้างใบแจ้งหนี้
					</Button>
				</div>
			</form>
		</div>
	);
};

export default CreateInvoicePage;

