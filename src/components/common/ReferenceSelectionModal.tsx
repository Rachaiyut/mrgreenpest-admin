import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './Modal';
import { Input, Button } from './FormControls';
import { FieldJob } from '../../types';
import { formatThaiDate } from '../../constants';

interface ReferenceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddReferences: (jobIds: string[]) => void;
    jobs: FieldJob[];
    allUsedReferenceIds: string[];
    currentSelection: string[];
}

export const ReferenceSelectionModal: React.FC<ReferenceSelectionModalProps> = ({ isOpen, onClose, onAddReferences, jobs, allUsedReferenceIds, currentSelection }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(currentSelection));
            setSearchTerm('');
        }
    }, [isOpen, currentSelection]);

    const availableJobs = useMemo(() => {
        const usedIdsSet = new Set(allUsedReferenceIds);
        return jobs.filter(job =>
            !usedIdsSet.has(job.id) &&
            (job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                formatThaiDate(job.startTime).includes(searchTerm))
        );
    }, [jobs, allUsedReferenceIds, searchTerm]);

    const handleToggleSelection = (jobId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        onAddReferences(Array.from(selectedIds));
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="เลือกรายการอ้างอิง (งานบริการ)"
            size="3xl"
            footer={
                <div className="flex gap-2">
                    <Button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300" variant="outline">
                        ยกเลิก
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                        variant="primary"
                    >
                        เพิ่มรายการที่เลือก ({selectedIds.size})
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <Input
                    type="search"
                    placeholder="ค้นหา (รหัสงาน, ชื่อลูกค้า, วันที่)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th scope="col" className="w-12 px-4 py-3">
                                    <span className="sr-only">Select</span>
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">รหัสงาน</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ลูกค้า</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">วันที่</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {availableJobs.map(job => (
                                <tr key={job.id} className={`cursor-pointer hover:bg-slate-50 ${selectedIds.has(job.id) ? 'bg-primary/10' : ''}`} onClick={() => handleToggleSelection(job.id)}>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(job.id)}
                                            readOnly
                                            className="pointer-events-none"
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{job.id}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{job.customerName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatThaiDate(job.startTime)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {availableJobs.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            ไม่พบงานที่สามารถอ้างอิงได้
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
