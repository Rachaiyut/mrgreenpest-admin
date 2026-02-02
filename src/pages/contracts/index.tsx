import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate } from '../../utils/date';
import {
	PlusIcon,
	ManageIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
	DocumentTextIcon,
	CurrencyDollarIcon,
	ClockIcon,
	CheckCircleIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { Contract } from '../../types';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { useData } from '../../contexts/DataContext';
import { ContractDetailsModal } from '../../components/features/contracts/ContractDetailsModal';

// Contract Status from API
enum ContractStatusEnum {
	DRAFT = 'DRAFT',
	PENDING = 'PENDING',
	ACTIVE = 'ACTIVE',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED',
	EXPIRED = 'EXPIRED',
}

const statusLabels: Record<ContractStatusEnum, string> = {
	[ContractStatusEnum.DRAFT]: 'ร่าง',
	[ContractStatusEnum.PENDING]: 'รอดำเนินการ',
	[ContractStatusEnum.ACTIVE]: 'ดำเนินการ',
	[ContractStatusEnum.COMPLETED]: 'เสร็จสิ้น',
	[ContractStatusEnum.CANCELLED]: 'ยกเลิก',
	[ContractStatusEnum.EXPIRED]: 'หมดอายุ',
};

interface ContractsPageProps {
	onCreateContract?: (data: Omit<Contract, 'id'>) => void;
	onUpdateContract?: (updated: Contract) => void;
	onDeleteContract?: (id: string) => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({
	onCreateContract,
	onUpdateContract,
	onDeleteContract,
}) => {
	const { contracts, customers, quotations } = useData();
	const navigate = useNavigate();

	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
	const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
	const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | ContractStatusEnum>('ทั้งหมด');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');

	// Stats calculations
	const stats = useMemo(() => {
		const total = contracts.length;
		const draft = contracts.filter(c => c.status === ContractStatusEnum.DRAFT).length;
		const active = contracts.filter(c => c.status === ContractStatusEnum.ACTIVE).length;
		const completed = contracts.filter(c => c.status === ContractStatusEnum.COMPLETED).length;
		const totalValue = contracts.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);

		return { total, draft, active, completed, totalValue };
	}, [contracts]);

	// Customer phone map
	const custPhoneMap = useMemo(
		() => new Map((customers || []).map((c) => [c.id, c.phone || ''])),
		[customers]
	);

	// Filtered contracts
	const filteredContracts = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		const start = startDate ? new Date(startDate) : null;
		const end = endDate ? new Date(endDate) : null;
		if (end) end.setHours(23, 59, 59, 999);

		let result = contracts;

		// Search filter
		if (q) {
			result = result.filter((item) => {
				const phone = custPhoneMap.get(item.customer_id) || '';
				return (
					item.id.toLowerCase().includes(q) ||
					(item.code || '').toLowerCase().includes(q) ||
					item.customer_name.toLowerCase().includes(q) ||
					phone.includes(q)
				);
			});
		}

		// Status filter
		if (statusFilter !== 'ทั้งหมด') {
			result = result.filter((item) => item.status === statusFilter);
		}

		// Date filter
		if (start || end) {
			result = result.filter((item) => {
				const d = new Date(item.created_at || item.start_date);
				return (!start || d >= start) && (!end || d <= end);
			});
		}

		return result.slice().reverse();
	}, [contracts, searchQuery, statusFilter, startDate, endDate, custPhoneMap]);

	const totalItems = filteredContracts.length;
	const paginatedContracts = useMemo(
		() => filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
		[filteredContracts, currentPage, itemsPerPage]
	);

	const handleItemsPerPageChange = (size: number) => {
		setItemsPerPage(size);
		setCurrentPage(1);
	};

	const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, contractId: string) => {
		event.stopPropagation();
		if (openDropdownId === contractId) {
			setOpenDropdownId(null);
		} else {
			const buttonRect = event.currentTarget.getBoundingClientRect();
			setSelectedContract(contracts?.find((c) => c.id === contractId) || null);
			setOpenDropdownId(contractId);
			setDropdownPosition({
				top: buttonRect.bottom + window.scrollY,
				left: buttonRect.right + window.scrollX,
			});
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!openDropdownId) return;
			if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
			if ((event.target as HTMLElement).closest('button[data-contract-id]')) return;
			setOpenDropdownId(null);
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [openDropdownId]);

	const handleViewDetails = (contract: Contract) => {
		setSelectedContract(contract);
		setIsDetailsModalOpen(true);
		setOpenDropdownId(null);
	};

	const handleEdit = (contract: Contract) => {
		navigate(`/contracts/${contract.id}/edit`);
		setOpenDropdownId(null);
	};

	const handleDeleteClick = (contract: Contract) => {
		setSelectedContract(contract);
		setIsDeleteModalOpen(true);
		setOpenDropdownId(null);
	};

	const handleConfirmDelete = async () => {
		if (selectedContract && onDeleteContract) {
			await onDeleteContract(selectedContract.id);
		}
		setIsDeleteModalOpen(false);
		setSelectedContract(null);
	};

	const handleCreateInvoice = (contract: Contract) => {
		navigate(`/billing/new?contractId=${contract.id}`);
		setOpenDropdownId(null);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">ใบสัญญา</h1>
					<p className="text-slate-500 mt-1">จัดการและติดตามใบสัญญาทั้งหมด พร้อมระบบแบ่งงวดชำระ</p>
				</div>
				<Button
					onClick={() => navigate('/contracts/new')}
					className="flex items-center gap-2"
				>
					<PlusIcon className="w-5 h-5" />
					สร้างใบสัญญา
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card className="!p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<DocumentTextIcon className="w-6 h-6 text-blue-600" />
						</div>
						<div>
							<p className="text-sm text-slate-500">สัญญาทั้งหมด</p>
							<p className="text-xl font-bold text-slate-800">{stats.total}</p>
						</div>
					</div>
				</Card>
				<Card className="!p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-slate-100 rounded-lg">
							<ClockIcon className="w-6 h-6 text-slate-600" />
						</div>
						<div>
							<p className="text-sm text-slate-500">ร่าง</p>
							<p className="text-xl font-bold text-slate-800">{stats.draft}</p>
						</div>
					</div>
				</Card>
				<Card className="!p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-amber-100 rounded-lg">
							<ClockIcon className="w-6 h-6 text-amber-600" />
						</div>
						<div>
							<p className="text-sm text-slate-500">กำลังดำเนินการ</p>
							<p className="text-xl font-bold text-amber-600">{stats.active}</p>
						</div>
					</div>
				</Card>
				<Card className="!p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-green-100 rounded-lg">
							<CheckCircleIcon className="w-6 h-6 text-green-600" />
						</div>
						<div>
							<p className="text-sm text-slate-500">เสร็จสิ้น</p>
							<p className="text-xl font-bold text-green-600">{stats.completed}</p>
						</div>
					</div>
				</Card>
				<Card className="!p-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-purple-100 rounded-lg">
							<CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
						</div>
						<div>
							<p className="text-sm text-slate-500">มูลค่ารวม</p>
							<p className="text-xl font-bold text-purple-600">
								฿{stats.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
							</p>
						</div>
					</div>
				</Card>
			</div>

			{/* Filters & Table */}
			<Card
				className="!p-0"
				actions={
					<div className="flex flex-col sm:flex-row items-center gap-3 w-full">
						<div className="w-full sm:w-64">
							<Input
								type="search"
								placeholder="ค้นหา (เลขที่, ชื่อลูกค้า, เบอร์โทร)..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setCurrentPage(1);
								}}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-40"
							/>
							<span className="text-slate-400">-</span>
							<Input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-40"
							/>
						</div>
						<div className="w-full sm:w-48">
							<Select
								value={statusFilter}
								onChange={(e) => {
									setStatusFilter(e.target.value as 'ทั้งหมด' | ContractStatusEnum);
									setCurrentPage(1);
								}}
							>
								<option value="ทั้งหมด">ทั้งหมด</option>
								{Object.values(ContractStatusEnum).map((status) => (
									<option key={status} value={status}>
										{statusLabels[status]}
									</option>
								))}
							</Select>
						</div>
					</div>
				}
			>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลำดับ</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เลขที่สัญญา</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ประเภทบริการ</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ระยะเวลา</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันเริ่มต้น</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันสิ้นสุด</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">มูลค่า</th>
								<th className="relative px-4 py-3"><span className="sr-only">จัดการ</span></th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-slate-200">
							{paginatedContracts.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-4 py-12 text-center text-slate-500">
										<DocumentTextIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
										<p className="text-lg font-medium">ไม่พบข้อมูลใบสัญญา</p>
										<p className="text-sm">ลองปรับตัวกรองหรือสร้างใบสัญญาใหม่</p>
									</td>
								</tr>
							) : (
								paginatedContracts.map((c, index) => (
									<tr key={c.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-3 text-sm text-slate-500">
											{(currentPage - 1) * itemsPerPage + index + 1}
										</td>
										<td
											className="px-4 py-3 text-sm font-medium text-primary hover:underline cursor-pointer"
											onClick={() => handleViewDetails(c)}
											title={c.id}
										>
											{c.code || `CT-${c.id.slice(0, 8).toUpperCase()}`}
										</td>
										<td className="px-4 py-3 text-sm text-slate-700 font-medium">{c.customer_name}</td>
										<td className="px-4 py-3 text-sm text-slate-500">{c.service_type || '-'}</td>
										<td className="px-4 py-3 text-sm text-slate-500">{c.contract_duration || '-'}</td>
										<td className="px-4 py-3 text-sm text-slate-500">{formatThaiDate(c.start_date)}</td>
										<td className="px-4 py-3 text-sm text-slate-500">{formatThaiDate(c.end_date)}</td>
										<td className="px-4 py-3">
											<StatusBadge status={statusLabels[c.status as ContractStatusEnum] || c.status} />
										</td>
										<td className="px-4 py-3 text-sm text-slate-700 text-right font-semibold">
											฿{(Number(c.total_amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</td>
										<td className="px-4 py-3 text-right">
											<Button
												data-contract-id={c.id}
												onClick={(e) => handleDropdownToggle(e, c.id)}
												variant="icon"
												title="ตัวเลือก"
											>
												<ManageIcon className="w-5 h-5" />
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalItems > 0 && (
					<div className="px-4 py-3 border-t border-slate-200">
						<Pagination
							currentPage={currentPage}
							totalItems={totalItems}
							itemsPerPage={itemsPerPage}
							onPageChange={setCurrentPage}
							onItemsPerPageChange={handleItemsPerPageChange}
						/>
					</div>
				)}
			</Card>

			{/* Dropdown Menu (Portal) */}
			{openDropdownId && dropdownPosition && selectedContract && (
				<div
					ref={dropdownRef}
					className="fixed z-50 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
					style={{
						top: dropdownPosition.top,
						left: dropdownPosition.left - 192,
					}}
				>
					<button
						onClick={() => handleViewDetails(selectedContract)}
						className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
					>
						<EyeIcon className="w-4 h-4" />
						ดูรายละเอียด
					</button>
					<button
						onClick={() => handleEdit(selectedContract)}
						className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
					>
						<PencilIcon className="w-4 h-4" />
						แก้ไข
					</button>
					<button
						onClick={() => handleCreateInvoice(selectedContract)}
						className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-slate-50 flex items-center gap-2"
					>
						<CurrencyDollarIcon className="w-4 h-4" />
						สร้างใบแจ้งหนี้
					</button>
					<hr className="my-1" />
					<button
						onClick={() => handleDeleteClick(selectedContract)}
						className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
					>
						<TrashIcon className="w-4 h-4" />
						ลบ
					</button>
				</div>
			)}

			{/* Details Modal */}
			{isDetailsModalOpen && selectedContract && (
				<ContractDetailsModal
					contract={selectedContract}
					customers={customers}
					quotations={quotations}
					onClose={() => {
						setIsDetailsModalOpen(false);
						setSelectedContract(null);
					}}
				/>
			)}

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={handleConfirmDelete}
				title="ลบใบสัญญา"
				message={`คุณแน่ใจหรือไม่ว่าต้องการลบใบสัญญา ${selectedContract?.code || selectedContract?.id}?`}
				confirmText="ลบ"
				confirmVariant="danger"
			/>
		</div>
	);
};

export default ContractsPage;

