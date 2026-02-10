import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/FormControls';
import { LeftArrowIcon } from '../../assets/icons/Icons';
import { useData } from '../../contexts/DataContext';
import { InvoiceForm } from '../../components/features/invoices/AddInvoiceModal';

const CreateInvoicePage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { handlers } = useData();

	const contractIdFromUrl = searchParams.get('contractId') || undefined;

	const handleSubmit = async (data: any) => {
		try {
			await handlers.invoices.create(data);
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

            <InvoiceForm
                mode="create"
                initialContractId={contractIdFromUrl}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/billing')}
            />
		</div>
	);
};

export default CreateInvoicePage;
