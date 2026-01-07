import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Status, Assessment, Product } from '../../types';
import {
  PlusIcon,
  ListBulletIcon,
  ViewColumnsIcon,
  ArrowRightIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  JobDateIcon,
  JobTimeIcon,
} from '../../assets/icons/Icons';
import { AddAssessmentModal } from '../../components/features/assessments/AddAssessmentModal';
import { Pagination } from '../../components/common/Pagination';
import { AssessmentDetailsModal } from '../../components/features/assessments/AssessmentDetailsModal';
import { EditAssessmentModal } from '../../components/features/assessments/EditAssessmentModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { formatThaiDate } from '../../constants';
import { Input, Button } from '../../components/common/FormControls';

const AssessmentCard: React.FC<{
  assessment: Assessment;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    assessmentId: string
  ) => void;
  onViewDetails: (assessment: Assessment) => void;
}> = ({ assessment, onDropdownToggle, onViewDetails }) => {
  const appointmentDate = formatThaiDate(assessment.scheduledAt);

  const allServiceTypes = useMemo(
    () => [
      ...new Set(assessment.workAreas.flatMap((area) => area.serviceType)),
    ],
    [assessment.workAreas]
  );

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex justify-between items-start">
          <div className="pr-2 min-w-0">
            <p className="text-base font-bold text-slate-800 leading-tight truncate">
              {assessment.customerName}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {allServiceTypes.map((type) => (
                <span
                  key={type}
                  className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full"
                  title={type}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <Button
              data-assessment-id={assessment.id}
              onClick={(e) => onDropdownToggle(e, assessment.id)}
              variant="icon"
              className="-mr-1 -mt-1"
              title="ตัวเลือก"
            >
              <ManageIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <StatusBadge status={assessment.status} />
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {assessment.workAreas.length} พื้นที่
          </span>
        </div>

        <div className="mt-2 flex items-start text-sm text-slate-600">
          <MapPinIcon className="h-5 w-5 mr-3 mt-0.5 text-accent flex-shrink-0" />
          <span className="break-words" title={assessment.address}>
            {assessment.address}
          </span>
        </div>

        <div className="mt-2 flex items-center text-sm text-slate-600">
          <JobDateIcon className="h-5 w-5 mr-3 text-accent flex-shrink-0" />
          <span>{appointmentDate}</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <Button
          onClick={() => onViewDetails(assessment)}
          title="ดูรายละเอียดใบประเมิน"
          variant="outline"
          className="w-full"
        >
          <EyeIcon className="h-5 w-5" />
          <span>ดูรายละเอียด</span>
        </Button>
      </div>
    </div>
  );
};

interface AssessmentsProps {
  assessments: Assessment[];
  onCreateAssessment: (assessment: Omit<Assessment, 'id'>) => void;
  onUpdateAssessment: (assessment: Assessment) => void;
  onDeleteAssessment: (assessmentId: string) => void;
  products: Product[];
}

const Assessments: React.FC<AssessmentsProps> = ({
  assessments,
  onCreateAssessment,
  onUpdateAssessment,
  onDeleteAssessment,
  products,
}) => {
  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] =
    useState<Assessment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const reversedAssessments = useMemo(
    () => [...assessments].reverse(),
    [assessments]
  );

  const filteredAssessments = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) {
      return reversedAssessments;
    }

    return reversedAssessments.filter((assessment) => {
      const matchesCustomer =
        assessment.customerId.toLowerCase().includes(lowercasedQuery) ||
        assessment.customerName.toLowerCase().includes(lowercasedQuery);

      const matchesWorkArea = assessment.workAreas.some(
        (area) =>
          (area.buildingType &&
            area.buildingType.toLowerCase().includes(lowercasedQuery)) ||
          area.serviceType.join(' ').toLowerCase().includes(lowercasedQuery)
      );

      const matchesDate = formatThaiDate(assessment.scheduledAt).includes(
        lowercasedQuery
      );

      return matchesCustomer || matchesWorkArea || matchesDate;
    });
  }, [reversedAssessments, searchQuery]);

  const kanbanColumns: { title: Status; assessments: Assessment[] }[] = [
    {
      title: Status.Draft,
      assessments: filteredAssessments.filter((a) => a.status === Status.Draft),
    },
    {
      title: Status.PendingApproval,
      assessments: filteredAssessments.filter(
        (a) => a.status === Status.PendingApproval
      ),
    },
    {
      title: Status.Scheduled,
      assessments: filteredAssessments.filter(
        (a) => a.status === Status.Scheduled
      ),
    },
    {
      title: Status.Completed,
      assessments: filteredAssessments.filter(
        (a) => a.status === Status.Completed
      ),
    },
  ];

  const totalItems = filteredAssessments.length;
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (assessment: Assessment) => {
    setAssessmentToEdit(assessment);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (assessment: Assessment) => {
    setAssessmentToDelete(assessment);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = () => {
    if (assessmentToDelete) {
      onDeleteAssessment(assessmentToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setAssessmentToDelete(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    assessmentId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === assessmentId) {
      setOpenDropdownId(null);
      setSelectedAssessment(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedAssessment(
        assessments.find((a) => a.id === assessmentId) || null
      );
      setOpenDropdownId(assessmentId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      )
        return;
      if ((event.target as HTMLElement).closest('button[data-assessment-id]'))
        return;
      setOpenDropdownId(null);
      setSelectedAssessment(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const renderActions = () => {
    if (!selectedAssessment) return null;

    const actions: {
      label: string;
      icon: React.FC<any>;
      onClick: () => void;
      isDanger?: boolean;
    }[] = [
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        onClick: () => handleViewDetails(selectedAssessment),
      },
      {
        label: 'แก้ไข',
        icon: PencilIcon,
        onClick: () => handleEdit(selectedAssessment),
      },
    ];

    if (selectedAssessment.status === Status.Completed) {
      actions.push({
        label: 'แปลงเป็นใบเสนอราคา',
        icon: ArrowRightIcon,
        onClick: () => console.log('Convert', selectedAssessment.id),
      });
    }

    actions.push({
      label: 'ลบ',
      icon: TrashIcon,
      onClick: () => handleDelete(selectedAssessment),
      isDanger: true,
    });

    return actions.map((action) => (
      <a
        key={action.label}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          action.onClick();
          setOpenDropdownId(null);
        }}
        className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
        role="menuitem"
      >
        <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
        <span>{action.label}</span>
      </a>
    ));
  };

  const handleUpdateAndClose = (updatedAssessment: Assessment) => {
    onUpdateAssessment(updatedAssessment);
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ใบประเมิน</h1>
            <p className="mt-1 text-slate-600">
              ติดตามและจัดการใบประเมินบริการตั้งแต่ต้นจนจบ
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (ลูกค้า, ประเภท, บริการ, วันที่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                title="ค้นหาด้วย: รหัส/ชื่อลูกค้า, ประเภทสิ่งปลูกสร้าง, ประเภทบริการ, วันที่นัดหมาย"
              />
            </div>
            <div className="flex items-center rounded-lg bg-slate-200 p-1">
              <Button
                onClick={() => setView('list')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setView('kanban')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
              >
                <ViewColumnsIcon className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบประเมิน
            </Button>
          </div>
        </div>

        {view === 'kanban' ? (
          <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            {kanbanColumns.map((col) => (
              <div
                key={col.title}
                className="bg-slate-100 rounded-lg p-4 w-80 flex-shrink-0"
              >
                <h2 className="font-semibold text-slate-700 mb-4 flex items-center justify-between">
                  <span className="truncate">{col.title}</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-sky-100 text-sky-800">
                    {col.assessments.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {col.assessments.map((assessment) => (
                    <AssessmentCard
                      key={assessment.id}
                      assessment={assessment}
                      onDropdownToggle={handleDropdownToggle}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                  {col.assessments.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-sm text-slate-500 rounded-lg border-2 border-dashed border-slate-300">
                      ไม่มีใบประเมิน
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ลำดับ
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      รหัสใบประเมิน
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ลูกค้า
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      รหัสลูกค้า
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      วันที่นัดหมาย
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ประเภทสิ่งปลูกสร้าง
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ประเภทบริการ
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      สถานะ
                    </th>
                    <th className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ค่าใช้จ่ายประมาณการ
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ผู้สร้าง
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ผู้แก้ไข
                    </th>
                    <th className="relative px-4 py-2.5">
                      <span className="sr-only">จัดการ</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedAssessments.map((assessment, index) => {
                    const allServiceTypes = [
                      ...new Set(
                        assessment.workAreas.flatMap((area) => area.serviceType)
                      ),
                    ];
                    const allBuildingTypes = [
                      ...new Set(
                        assessment.workAreas
                          .map((area) => area.buildingType)
                          .filter(Boolean)
                      ),
                    ];
                    return (
                      <tr key={assessment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {assessment.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {assessment.customerName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {assessment.customerId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {formatThaiDate(assessment.scheduledAt)}
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 truncate max-w-sm"
                          title={allBuildingTypes.join(', ')}
                        >
                          {allBuildingTypes.join(', ')}
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 truncate max-w-sm"
                          title={allServiceTypes.join(', ')}
                        >
                          {allServiceTypes.join(', ')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <StatusBadge status={assessment.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                          ฿
                          {assessment.totalEstimatedCost.toLocaleString(
                            'th-TH',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {assessment.createdBy}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {assessment.updatedBy}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="inline-block text-left">
                            <Button
                              data-assessment-id={assessment.id}
                              onClick={(e) =>
                                handleDropdownToggle(e, assessment.id)
                              }
                              variant="icon"
                              title="ตัวเลือก"
                            >
                              <ManageIcon className="h-5 w-5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </Card>
        )}
      </div>
      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {renderActions()}
          </div>
        </div>
      )}
      <AddAssessmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateAssessment={onCreateAssessment}
        products={products}
      />
      <AssessmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        assessment={selectedAssessment}
      />
      <EditAssessmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        assessment={assessmentToEdit}
        onUpdateAssessment={handleUpdateAndClose}
        products={products}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบประเมินสำหรับ{' '}
            <strong>{assessmentToDelete?.customerName}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Assessments;
