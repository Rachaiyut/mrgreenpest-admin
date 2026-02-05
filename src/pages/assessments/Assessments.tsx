import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Enum
import { AsessmentStatus } from '@/src/types/enums/assessment';
import {
  Assessment,
  Product,
  Customer,
  Package,
  Category,
} from '@/src/types/entity/app.interface';

// Component
import AssessmentCard from './AssessmentCard';
import { Button, Input } from '@/src/components/common/FormControls';
import {
  PlusIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
  ArrowRightIcon,
  TrashIcon,
  ManageIcon,
} from '@/src/assets/icons/Icons';
import { Pagination } from '@/src/components/common/Pagination';
import { formatThaiDate } from '@/src/utils/date';
import { AddAssessmentModal } from '@/src/components/features/assessments/AddAssessmentModal';
import { EditAssessmentModal } from '@/src/components/features/assessments/EditAssessmentModal';
import { AssessmentDetailsModal } from '@/src/components/features/assessments/AssessmentDetailsModal';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { Card } from '@/src/components/common/Card';
import { ConfirmationModal } from '@/src/components/common';
import { AssessmentApi, CustomerApi, PackageApi, ProductApi, CategoryApi } from '@/src/api';
import { CategoryType } from '@/src/types';

const Assessments: React.FC = () => {
  const location = useLocation();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams(location.search);
      const statusParam = searchParams.get('status');

      const filter: any = { limit: 10 };
      if (statusParam) {
        filter.status = statusParam;
        // If filtering by status, ensure we get enough items
        filter.limit = 100;
        // Also ensure current page is reset if needed, but here we just fetch
      }

      const [assessmentsRes, customersRes, productsRes, packagesRes, categoriesRes] = await Promise.all([
        AssessmentApi.getAll(filter),
        CustomerApi.getCustomers({ limit: 10 }),
        ProductApi.getProducts({ limit: 10 }),
        PackageApi.getPackages({ limit: 10 }),
        CategoryApi.getCategories({ limit: 100, type: CategoryType.SERVICE })
      ]);
      setAssessments(assessmentsRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setPackages(packagesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((c) => [c.id, `${c.first_name} ${c.last_name}`])
    );
  }, [customers]);

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
      const customerName = customerMap.get(assessment.customer_id) || '';
      const matchesCustomer =
        assessment.customer_id.toLowerCase().includes(lowercasedQuery) ||
        customerName.toLowerCase().includes(lowercasedQuery);

      const matchesWorkArea = assessment.assessment_areas.some(
        (area) =>
          (area.building_type &&
            area.building_type.toLowerCase().includes(lowercasedQuery)) ||
          (area.category_services || []).some(
            (service) => service.name.toLowerCase().includes(lowercasedQuery)
          )
      );

      const matchesDate = formatThaiDate(new Date(assessment.appointment_date).toDateString()).includes(
        lowercasedQuery
      );

      return matchesCustomer || matchesWorkArea || matchesDate;
    });
  }, [reversedAssessments, searchQuery, customerMap]);

  const kanbanColumns: {
    title: AsessmentStatus;
    assessments: Assessment[];
  }[] = [
      {
        title: AsessmentStatus.DRAFT,
        assessments: filteredAssessments.filter(
          (a) => a.status === AsessmentStatus.DRAFT
        ),
      },
      {
        title: AsessmentStatus.APPOINTMENT,
        assessments: filteredAssessments.filter(
          (a) => a.status === AsessmentStatus.APPOINTMENT
        ),
      },
      {
        title: AsessmentStatus.PENDING,
        assessments: filteredAssessments.filter(
          (a) => a.status === AsessmentStatus.PENDING
        ),
      },
      {
        title: AsessmentStatus.COMPLETE,
        assessments: filteredAssessments.filter(
          (a) => a.status === AsessmentStatus.COMPLETE
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

  const handleCreateAssessment = async (
    assessmentData: Omit<Assessment, 'id'>
  ) => {
    try {
      await AssessmentApi.create(assessmentData);
      fetchData();
    } catch (error) {
      console.error('Error creating assessment:', error);
    }
  };

  const handleUpdateAssessment = async (assessment: Assessment) => {
    try {
      await AssessmentApi.update(assessment.id, assessment);
      fetchData();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating assessment:', error);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      await AssessmentApi.delete(assessmentId);
      fetchData();
    } catch (error) {
      console.error('Error deleting assessment:', error);
    }
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

  const handleConfirmDelete = async () => {
    if (assessmentToDelete) {
      await handleDeleteAssessment(assessmentToDelete.id);
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

    if (selectedAssessment.status === AsessmentStatus.COMPLETE) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kanbanColumns.map((col) => (
              <div
                key={col.title}
                className="bg-slate-100 rounded-lg p-4 h-fit"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-700 truncate">
                    {col.title}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-sky-100 text-sky-800">
                    {col.assessments.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {col.assessments.map((assessment) => (
                    <AssessmentCard
                      key={assessment.id}
                      assessment={assessment}
                      customerName={customerMap.get(assessment.customer_id)}
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
                        assessment.assessment_areas.flatMap(
                          (area) => area.category_services || []
                        )
                      ),
                    ];
                    const allBuildingTypes = [
                      ...new Set(
                        assessment.assessment_areas
                          .map((area) => area.building_type)
                          .filter(Boolean)
                      ),
                    ];
                    return (
                      <tr key={assessment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {assessment.code || assessment.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {customerMap.get(assessment.customer_id) || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {assessment.customer_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {2026}
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
                          <StatusBadge status={assessment.status as any} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                          ฿
                          {assessment.total_price.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {assessment.created_by}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {assessment.updated_by}
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
        onCreateAssessment={handleCreateAssessment}
      />
      {isDetailsModalOpen && (
        <AssessmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          assessment={selectedAssessment}
          products={products}
          customers={customers}
        // packages={packages} // Comment out if causing issues or update type
        />
      )}
      <EditAssessmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setAssessmentToEdit(null);
        }}
        assessment={assessmentToEdit}
        onUpdateAssessment={handleUpdateAssessment}
        products={products}
        packages={packages}
        customers={customers}
        categories={categories}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบประเมินนี้?
            <br />
            {assessmentToDelete &&
              `รหัส: ${assessmentToDelete.code || assessmentToDelete.id}`}
            <br />
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
