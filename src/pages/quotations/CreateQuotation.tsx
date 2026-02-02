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
import { Status } from '../../types/entity/core.interface';

interface QuotationItem {
	id: string;
	productId: string;
	description: string;
	quantity: number;
	unit: string;
	unitPrice: number;
	amount: number;
}

const CreateQuotationPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { customers, products, assessments, handlers } = useData();

	// Assessment reference
	const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

	// Quotation info
	const [quotationDate, setQuotationDate] = useState('');
	const [validityDays, setValidityDays] = useState(30);
	const [expiresAt, setExpiresAt] = useState('');

	// Customer info
	const [selectedCustomerId, setSelectedCustomerId] = useState('');

	// Service info
	const [serviceLocation, setServiceLocation] = useState('');
	const [serviceArea, setServiceArea] = useState('');
	const [systemUsed, setSystemUsed] = useState('');
	const [serviceType, setServiceType] = useState('');
	const [paymentTerms, setPaymentTerms] = useState('ชำระเมื่อเข้าปฏิบัติงานครั้งแรกเสร็จเรียบร้อย');
	const [notes, setNotes] = useState('');
	const [contractDuration, setContractDuration] = useState('1 ปี');
	const [serviceCount, setServiceCount] = useState('7 ครั้ง');

	// Line items
	const [items, setItems] = useState<QuotationItem[]>([
		{
			id: crypto.randomUUID(),
			productId: '',
			description: '',
			quantity: 1,
			unit: 'ครั้ง',
			unitPrice: 0,
			amount: 0,
		},
	]);

	// Product options for dropdown
	const productOptions = useMemo(() => {
		return products.map((p) => ({
			value: p.id,
			label: `${p.code} - ${p.name}`,
			description: p.unit?.name || '',
		}));
	}, [products]);

	// Assessment options for dropdown
	const assessmentOptions = useMemo(() => {
		return (assessments || [])
			.filter((a) => a.status === 'APPROVED' || a.status === 'PENDING')
			.map((a) => ({
				value: a.id,
				label: `${a.code} - ${a.customer?.name || 'ไม่ระบุลูกค้า'}`,
				description: a.address || '',
			}));
	}, [assessments]);

	// Selected assessment details
	const selectedAssessment = useMemo(() => {
		return assessments?.find((a) => a.id === selectedAssessmentId);
	}, [assessments, selectedAssessmentId]);

	// VAT settings
	const [includeVat, setIncludeVat] = useState(true);
	const vatRate = 0.07;

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

	// Initialize dates and check URL params for assessmentId
	useEffect(() => {
		const today = new Date();
		const expiry = new Date();
		expiry.setDate(today.getDate() + validityDays);

		setQuotationDate(today.toISOString().substring(0, 10));
		setExpiresAt(expiry.toISOString().substring(0, 10));

		// Check for assessmentId in URL params
		const assessmentIdFromUrl = searchParams.get('assessmentId');
		if (assessmentIdFromUrl) {
			setSelectedAssessmentId(assessmentIdFromUrl);
		}
	}, [searchParams]);

	// Auto-fill from assessment when selected
	useEffect(() => {
		if (selectedAssessment) {
			// Set customer
			if (selectedAssessment.customer_id) {
				setSelectedCustomerId(selectedAssessment.customer_id);
			}
			// Set service location
			const address = [
				selectedAssessment.address,
				selectedAssessment.sub_district,
				selectedAssessment.district,
				selectedAssessment.province,
				selectedAssessment.zipcode,
			]
				.filter(Boolean)
				.join(' ');
			setServiceLocation(address);

			// Auto-fill items from assessment work areas
			if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
				const newItems: QuotationItem[] = selectedAssessment.assessment_areas.map((area) => ({
					id: crypto.randomUUID(),
					productId: '',
					description: `${area.area_name} - ${area.building_type}`,
					quantity: 1,
					unit: 'พื้นที่',
					unitPrice: Number(area.total_price) || 0,
					amount: Number(area.total_price) || 0,
				}));
				setItems(newItems.length > 0 ? newItems : items);
			}
		}
	}, [selectedAssessment]);

	// Update expiry date when validity days change
	useEffect(() => {
		if (quotationDate) {
			const date = new Date(quotationDate);
			date.setDate(date.getDate() + validityDays);
			setExpiresAt(date.toISOString().substring(0, 10));
		}
	}, [quotationDate, validityDays]);

	// Auto-fill customer info
	useEffect(() => {
		if (selectedCustomer) {
			const address = [
				selectedCustomer.address_house_no,
				selectedCustomer.road_line,
				selectedCustomer.sub_district,
				selectedCustomer.district,
				selectedCustomer.province,
				selectedCustomer.postal_code,
			]
				.filter(Boolean)
				.join(' ');
			setServiceLocation(address);
		} else {
			setServiceLocation('');
		}
	}, [selectedCustomer]);

	// Handle item changes
	const handleItemChange = (
		id: string,
		field: keyof QuotationItem,
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

	// Handle product selection
	const handleProductSelect = (itemId: string, productId: string) => {
		const product = products.find((p) => p.id === productId);
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== itemId) return item;

				if (product) {
					const unitPrice = parseFloat(product.cost_price) || 0;
					return {
						...item,
						productId: productId,
						description: product.name,
						unit: product.unit?.name || 'ครั้ง',
						unitPrice: unitPrice,
						amount: item.quantity * unitPrice,
					};
				} else {
					return {
						...item,
						productId: '',
						description: '',
						unit: 'ครั้ง',
						unitPrice: 0,
						amount: 0,
					};
				}
			})
		);
	};

	const addItem = () => {
		setItems((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				productId: '',
				description: '',
				quantity: 1,
				unit: 'ครั้ง',
				unitPrice: 0,
				amount: 0,
			},
		]);
	};

	const removeItem = (id: string) => {
		if (items.length <= 1) return;
		setItems((prev) => prev.filter((item) => item.id !== id));
	};

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
			const quotationData = {
				assessment_id: selectedAssessmentId || undefined,
				customer_id: selectedCustomerId,
				customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
				created_at: quotationDate,
				expires_at: expiresAt,
				status: Status.Draft,
				total: netTotal,
				revision: 1,
				google_map_link: selectedCustomer.google_map_link || '',
				payment_terms: paymentTerms,
				// Extended fields for service details
				service_location: serviceLocation,
				service_area: serviceArea,
				system_used: systemUsed,
				service_type: serviceType,
				notes: notes,
				contract_duration: contractDuration,
				service_count: serviceCount,
				subtotal: subtotal,
				vat_amount: vatAmount,
				include_vat: includeVat,
				items: items.map((item, index) => ({
					sequence: index + 1,
					product_id: item.productId || null,
					description: item.description,
					quantity: item.quantity,
					unit: item.unit,
					unit_price: item.unitPrice,
					amount: item.amount,
				})),
			};

			await handlers.quotations.create(quotationData);
			navigate('/quotations');
		} catch (error) {
			console.error('Failed to create quotation:', error);
			alert('เกิดข้อผิดพลาดในการสร้างใบเสนอราคา');
		}
	};

	return (
		<div className="p-4 sm:p-6 lg:p-8 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" onClick={() => navigate('/quotations')}>
					<LeftArrowIcon className="w-6 h-6" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold text-slate-800">
						สร้างใบเสนอราคาใหม่
					</h1>
					<p className="text-slate-600 text-sm mt-1">
						กรอกข้อมูลเพื่อสร้างใบเสนอราคาค่าบริการ
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Quotation Details */}
				<Card title="ข้อมูลใบเสนอราคา">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<FormField label="วันที่" htmlFor="quotation-date">
							<Input
								id="quotation-date"
								type="date"
								value={quotationDate}
								onChange={(e) => setQuotationDate(e.target.value)}
								required
							/>
						</FormField>

						<FormField label="กำหนดยืนราคา (วัน)" htmlFor="validity-days">
							<Input
								id="validity-days"
								type="number"
								value={validityDays}
								onChange={(e) => setValidityDays(Number(e.target.value))}
								min={1}
								required
							/>
						</FormField>

						<FormField label="หมดอายุวันที่" htmlFor="expires-at">
							<Input
								id="expires-at"
								type="date"
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
								required
							/>
						</FormField>
					</div>
				</Card>

				{/* Assessment Reference */}
				<Card title="อ้างอิงใบประเมิน (ถ้ามี)">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="เลือกใบประเมิน" htmlFor="assessment-select">
							<SearchableSelect
								value={selectedAssessmentId}
								onChange={(value) => setSelectedAssessmentId(value)}
								placeholder="-- เลือกใบประเมิน (ไม่บังคับ) --"
								options={assessmentOptions}
							/>
						</FormField>

						{selectedAssessment && (
							<div className="flex items-center">
								<div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
									<span className="text-green-700 font-medium">
										✓ เชื่อมกับใบประเมิน: {selectedAssessment.code}
									</span>
								</div>
							</div>
						)}
					</div>

					{selectedAssessment && (
						<div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<h4 className="text-sm font-medium text-blue-700 mb-2">
								ข้อมูลจากใบประเมิน
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
								<div>
									<span className="text-slate-500">รหัส:</span>{' '}
									<span className="font-medium">{selectedAssessment.code}</span>
								</div>
								<div>
									<span className="text-slate-500">ลูกค้า:</span>{' '}
									<span className="font-medium">
										{selectedAssessment.customer?.name || selectedAssessment.customer?.first_name || 'ไม่ระบุ'}
									</span>
								</div>
								<div className="md:col-span-2">
									<span className="text-slate-500">ที่อยู่:</span>{' '}
									<span className="font-medium">{selectedAssessment.address}</span>
								</div>
								<div>
									<span className="text-slate-500">มูลค่ารวม:</span>{' '}
									<span className="font-medium text-green-600">
										฿{Number(selectedAssessment.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
									<span className="text-slate-500">ประเภท:</span>{' '}
									<span className="font-medium">{selectedCustomer.type}</span>
								</div>
								<div>
									<span className="text-slate-500">อีเมล:</span>{' '}
									<span className="font-medium">
										{selectedCustomer.email || '-'}
									</span>
								</div>
								<div>
									<span className="text-slate-500">เลขประจำตัวผู้เสียภาษี:</span>{' '}
									<span className="font-medium">
										{selectedCustomer.tax_id || '-'}
									</span>
								</div>
							</div>
						</div>
					)}
				</Card>

				{/* Service Details */}
				<Card title="รายละเอียดบริการ">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="สถานที่ให้บริการ" htmlFor="service-location">
							<Textarea
								id="service-location"
								value={serviceLocation}
								onChange={(e) => setServiceLocation(e.target.value)}
								rows={2}
								placeholder="ที่อยู่สถานที่ให้บริการ"
							/>
						</FormField>

						<FormField label="พื้นที่ให้บริการ (ตร.ม.)" htmlFor="service-area">
							<Input
								id="service-area"
								type="text"
								value={serviceArea}
								onChange={(e) => setServiceArea(e.target.value)}
								placeholder="เช่น 100 ตร.ม."
							/>
						</FormField>

						<FormField label="ประเภทบริการ" htmlFor="service-type">
							<Select
								id="service-type"
								value={serviceType}
								onChange={(e) => setServiceType(e.target.value)}
							>
								<option value="">-- เลือกประเภทบริการ --</option>
								<option value="ปลวก">ควบคุมป้องกันกำจัดปลวก</option>
								<option value="มด">ควบคุมป้องกันกำจัดมด</option>
								<option value="แมลงสาบ">ควบคุมป้องกันกำจัดแมลงสาบ</option>
								<option value="หนู">ควบคุมป้องกันกำจัดหนู</option>
								<option value="รวม">ควบคุมป้องกันกำจัดปลวก มด แมลงสาบ หนู</option>
							</Select>
						</FormField>

						<FormField label="ระบบที่ใช้" htmlFor="system-used">
							<Select
								id="system-used"
								value={systemUsed}
								onChange={(e) => setSystemUsed(e.target.value)}
							>
								<option value="">-- เลือกระบบ --</option>
								<option value="ระบบเหยื่อ">ระบบเหยื่อ</option>
								<option value="ระบบสารเคมีกึ่งชีวภาพ">ระบบสารเคมีกึ่งชีวภาพ</option>
								<option value="ระบบเหยื่อ และสารเคมีกึ่งชีวภาพ">
									ระบบเหยื่อ และสารเคมีกึ่งชีวภาพ
								</option>
								<option value="ระบบฉีดพ่น">ระบบฉีดพ่น</option>
							</Select>
						</FormField>

						<FormField label="ระยะเวลาสัญญา" htmlFor="contract-duration">
							<Select
								id="contract-duration"
								value={contractDuration}
								onChange={(e) => setContractDuration(e.target.value)}
							>
								<option value="1 ปี">สัญญา 1 ปี</option>
								<option value="6 เดือน">สัญญา 6 เดือน</option>
								<option value="ครั้งเดียว">ครั้งเดียว</option>
							</Select>
						</FormField>

						<FormField label="จำนวนครั้งเข้าบริการ" htmlFor="service-count">
							<Select
								id="service-count"
								value={serviceCount}
								onChange={(e) => setServiceCount(e.target.value)}
							>
								<option value="1 ครั้ง">1 ครั้ง</option>
								<option value="3 ครั้ง">3 ครั้ง</option>
								<option value="5 ครั้ง">5 ครั้ง</option>
								<option value="7 ครั้ง">7 ครั้ง</option>
								<option value="12 ครั้ง">12 ครั้ง</option>
							</Select>
						</FormField>

						<div className="md:col-span-2">
							<FormField label="เงื่อนไขการชำระเงิน" htmlFor="payment-terms">
								<Textarea
									id="payment-terms"
									value={paymentTerms}
									onChange={(e) => setPaymentTerms(e.target.value)}
									rows={2}
									placeholder="เงื่อนไขการชำระเงิน"
								/>
							</FormField>
						</div>

						<div className="md:col-span-2">
							<FormField label="หมายเหตุ" htmlFor="notes">
								<Textarea
									id="notes"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									rows={3}
									placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
								/>
							</FormField>
						</div>
					</div>
				</Card>

				{/* Line Items */}
				<Card title="รายการสินค้า/บริการ">
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
										<td className="px-3 py-2 min-w-[300px]">
											<SearchableSelect
												value={item.productId}
												onChange={(value) => handleProductSelect(item.id, value)}
												placeholder="-- เลือกสินค้า/บริการ --"
												options={productOptions}
											/>
											{item.productId && (
												<div className="mt-1 text-xs text-slate-500">
													{item.description}
												</div>
											)}
										</td>
										<td className="px-3 py-2">
											<Input
												type="number"
												value={item.quantity}
												onChange={(e) =>
													handleItemChange(item.id, 'quantity', Number(e.target.value))
												}
												min={1}
												className="text-sm text-center"
											/>
										</td>
										<td className="px-3 py-2 text-center text-sm text-slate-600">
											{item.unit || '-'}
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
												className="text-sm text-right"
											/>
										</td>
										<td className="px-3 py-2 text-right text-sm font-medium text-slate-700">
											{item.amount.toLocaleString('th-TH', {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-3 py-2">
											{items.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													onClick={() => removeItem(item.id)}
													className="text-red-500 hover:text-red-700 hover:bg-red-50"
												>
													<TrashIcon className="w-4 h-4" />
												</Button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="mt-4">
						<Button
							type="button"
							variant="outline"
							onClick={addItem}
							className="w-full border-dashed"
						>
							<PlusIcon className="w-4 h-4 mr-2" />
							เพิ่มรายการ
						</Button>
					</div>

					{/* Totals */}
					<div className="mt-6 border-t pt-4">
						<div className="flex justify-end">
							<div className="w-full max-w-xs space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-sm text-slate-600">รวมเงิน (TOTAL)</span>
									<span className="text-base font-semibold text-slate-700">
										฿{subtotal.toLocaleString('th-TH', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>

								<div className="flex justify-between items-center">
									<label className="flex items-center gap-2 text-sm text-slate-600">
										<input
											type="checkbox"
											checked={includeVat}
											onChange={(e) => setIncludeVat(e.target.checked)}
											className="rounded border-slate-300 text-primary focus:ring-primary"
										/>
										ภาษีมูลค่าเพิ่ม (VAT 7%)
									</label>
									<span className="text-base font-semibold text-slate-700">
										฿{vatAmount.toLocaleString('th-TH', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>

								<div className="flex justify-between items-center pt-3 border-t border-slate-200">
									<span className="text-base font-bold text-slate-800">
										ยอดเงินสุทธิ (NET)
									</span>
									<span className="text-xl font-bold text-primary">
										฿{netTotal.toLocaleString('th-TH', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
							</div>
						</div>
					</div>
				</Card>

				{/* Actions */}
				<div className="flex justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate('/quotations')}
						className="px-6"
					>
						ยกเลิก
					</Button>
					<Button type="submit" variant="primary" className="px-6">
						สร้างใบเสนอราคา
					</Button>
				</div>
			</form>
		</div>
	);
};

export default CreateQuotationPage;

