import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import {
  User,
  UserRole,
  WalletTransaction,
} from '@/src/types/entity/app.interface';
import {
  PlusIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  WalletIcon,
  LoadingIcon,
  DocumentCheckIcon,
} from '../../assets/icons/Icons';
import { RoleModal } from '../../components/features/users/RoleModal';
import { AddUserModal } from '../../components/features/users/AddUserModal';
import { Pagination } from '../../components/common/Pagination';
import { UserDetailsModal } from '../../components/features/users/UserDetailsModal';
import { RoleDetailsModal } from '../../components/features/users/RoleDetailsModal'; // Keep for now or remove?
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { EditUserModal } from '../../components/features/users/EditUserModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { UserWalletModal } from '../../components/features/users/UserWalletModal';
import { RoleApi, Role } from '../../api/role';
import { UserApi } from '../../api/user';
import Swal from '@/src/utils/swal';

const ROLE_NAME_MAPPING: Record<string, string> = {};

const RoleBadge: React.FC<{
  role: UserRole | { id: string; name: string } | string;
}> = ({ role }) => {
  // Handle role as object or string
  let roleNameRaw: string = '-';
  if (typeof role === 'string') {
    roleNameRaw = role;
  } else if (typeof role === 'object' && role !== null) {
    const r = role as Record<string, unknown>;
    if (typeof r.name === 'string') {
      roleNameRaw = r.name;
    } else if (typeof r.name === 'object' && r.name !== null) {
      roleNameRaw = (r.name as Record<string, string>).name || JSON.stringify(r.name);
    } else {
      roleNameRaw = JSON.stringify(role);
    }
  }

  const normalizedName =
    typeof roleNameRaw === 'string' ? roleNameRaw : String(roleNameRaw);
  const roleName =
    ROLE_NAME_MAPPING[normalizedName.toLowerCase()] || normalizedName;

  const roleColors: Record<string, string> = {
    MANAGEMENT: 'bg-purple-100 text-purple-700',
    EXECUTIVE: 'bg-indigo-100 text-indigo-700',
    FIELD_LEAD: 'bg-sky-100 text-sky-700',
    FIELD_TECH: 'bg-teal-100 text-teal-700',
  };

  const roleType = typeof role === 'object' && role !== null
    ? (role as Record<string, string>).role_type || ''
    : '';
  const colorClass =
    roleColors[roleType] ||
    roleColors[roleType.toUpperCase()] ||
    'bg-slate-100 text-slate-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {roleName}
    </span>
  );
};

interface UsersProps {
  onCreateUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  defaultView?: 'users' | 'roles';
  onCreateWalletTransaction: (
    userId: string,
    transactionData: Omit<WalletTransaction, 'id'>
  ) => void;
}

const Users: React.FC<UsersProps> = ({
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  defaultView = 'users',
  onCreateWalletTransaction,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'users' | 'roles'>(defaultView);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDetailsModalOpen, setIsRoleDetailsModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Role Management
  const [roles, setRoles] = useState<Role[]>([]);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [roleToEditId, setRoleToEditId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [roleCurrentPage, setRoleCurrentPage] = useState(1);
  const [roleItemsPerPage, setRoleItemsPerPage] = useState(10);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedUserForWallet, setSelectedUserForWallet] =
    useState<User | null>(null);

  const fetchRoles = async () => {
    try {
      const res = await RoleApi.getAll();
      setRoles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchUsers = async (search?: string, role_type?: string, page?: number, limit?: number) => {
    try {
      const res = await UserApi.getAll({
        limit: limit || itemsPerPage,
        page: page || currentPage,
        sort_by: 'created_at',
        sort_order: 'DESC',
        ...(search ? { search } : {}),
        ...(role_type && role_type !== 'all' ? { role_type } : {}),
      });
      setUsers(res.data || []);
      setTotalItems(res.meta?.total || res.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRoles(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  useEffect(() => {
    setCurrentPage(1);
    fetchUsers(searchQuery || undefined, roleFilter, 1, itemsPerPage);
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers(searchQuery || undefined, roleFilter, currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  const paginatedUsers = users;

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleCreateUser = async (data: any): Promise<User> => {
    try {
      const newUser = await UserApi.create(data);
      fetchUsers();
      return newUser;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  // แก้ไขฟังก์ชัน handleUpdateUser
  const handleUpdateUser = async (data: any) => {
    try {
      if (data.id) {
        // 1. รอให้อัปเดตข้อมูลเสร็จ
        await UserApi.update(data.id, data);
        
        // 2. รอให้ Fetch ข้อมูลใหม่จนเสร็จ
        await fetchUsers(); 
        
        // 3. (สำคัญมาก) เรียก prop onUpdateUser ที่รับมาจาก Component แม่ เผื่อแม่ต้องใช้ทำอะไรต่อ
        if (typeof onUpdateUser === 'function') {
          onUpdateUser(data);
        }
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleViewRoleDetails = (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsRoleDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (user: User) => {
    setUserToEdit(user);
    setIsEditUserModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      try {
        await UserApi.delete(userToDelete.id);
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleEditRole = (roleId: string) => {
    setRoleToEditId(roleId);
    setIsEditRoleModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteRoleModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDeleteRole = async () => {
    if (roleToDelete) {
      try {
        await RoleApi.delete(roleToDelete.id);
        await fetchRoles();
        Swal.fire({
          icon: 'success',
          title: 'ลบบทบาทแล้ว',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        const errMsg = (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        Swal.fire(
          'ไม่สามารถลบบทบาทได้',
          errMsg || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
          'error',
        );
      }
    }
    setIsDeleteRoleModalOpen(false);
    setRoleToDelete(null);
  };

  const handleOpenWallet = (user: User) => {
    setSelectedUserForWallet(user);
    setIsWalletModalOpen(true);
    setOpenDropdownId(null);
  };

  // Calculate user counts per role dynamically
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    roles.forEach((r) => (counts[r.id] = (r as unknown as Record<string, unknown>).user_count as number || 0));
    return counts;
  }, [roles]);

  const userActions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon },
    { label: 'แก้ไข', icon: PencilIcon },
    { label: 'กระเป๋าเงิน', icon: WalletIcon },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(id);
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
      ) {
        return;
      }
      if (
        (event.target as HTMLElement).closest(
          'button[data-user-id], button[data-role-id]'
        )
      ) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        {view === 'users' && (
          <>
            <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">ผู้ใช้งาน</h1>
                <p className="mt-1 text-slate-600">จัดการบัญชีผู้ใช้ในระบบ</p>
              </div>
              <Button onClick={() => setIsAddUserModalOpen(true)}>
                <PlusIcon className="h-5 w-5" />
                  สร้างผู้ใช้งาน
              </Button>
            </div>

            {/* Toolbar */}
            <Card className="!p-4 mb-4 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative w-full sm:w-80 flex-shrink-0">
                  <Input
                    type="search"
                    placeholder="ค้นหาชื่อ-นามสกุล, อีเมล, โทรศัพท์"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="w-full sm:w-44 flex-shrink-0">
                  <DropdownSelect
                    value={roleFilter}
                    onChange={(val) => {
                      setRoleFilter(val);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
                    placeholder="ทุกประเภทบทบาท"
                    options={[
                      { value: 'all', label: 'ทุกประเภทบทบาท' },
                      ...[...new Map(roles.map((r) => [r.role_type || r.name, r])).values()].map((role) => {
                        const rt = role.role_type || role.name;
                        const labels: Record<string, string> = {
                          MANAGEMENT: 'ผู้บริหาร/จัดการ',
                          EXECUTIVE: 'ผู้บริหารระดับสูง',
                          FIELD_LEAD: 'หัวหน้าทีมช่าง',
                          FIELD_TECH: 'ช่างปฏิบัติงาน',
                        };
                        return { value: rt, label: labels[rt] || rt };
                      }),
                    ]}
                  />
                </div>
              </div>
            </Card>

            {loading ? (
              <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                  <p className="text-base font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
                </div>
              </Card>
            ) : (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
              <div className="overflow-x-auto border-b border-slate-200 flex-1">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">ชื่อจริง - นามสกุล</th>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">ชื่อเล่น</th>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">อีเมล</th>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">โทรศัพท์</th>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">บทบาท</th>
                        <th scope="col" className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b-0 h-0">
                            <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                              <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                              <p className="text-lg font-medium">ไม่พบข้อมูลผู้ใช้งาน</p>
                              <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างผู้ใช้งานใหม่</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {paginatedUsers.map((user, index) => (
                        <tr key={user.id} className="hover:bg-slate-50 border-b border-slate-200 [&>td]:text-center [&>td]:align-middle">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {user.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {user.nick_name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {user.email || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {(() => {
                              const raw = (user.phone || '').replace(/\D/g, '');
                              if (raw.length === 10) return `${raw.slice(0,3)}-${raw.slice(3,6)}-${raw.slice(6)}`;
                              if (raw.length === 9) return `${raw.slice(0,2)}-${raw.slice(2,5)}-${raw.slice(5)}`;
                              return user.phone || '-';
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-right text-sm font-medium">
                            <div className="inline-block text-left">
                              <Button
                                variant="icon"
                                data-user-id={user.id}
                                onClick={(e) => handleDropdownToggle(e, user.id)}
                              >
                                <span className="sr-only">Open options</span>
                                <ManageIcon className="h-5 w-5" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              <div className="mt-auto border-t border-slate-200">
                <Pagination
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </div>
            </div>
            )}
          </>
        )}

        {view === 'roles' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  จัดการบทบาท
                </h1>
                <p className="mt-1 text-slate-600">
                  สร้างและแก้ไขบทบาทผู้ใช้งานในระบบ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsAddRoleModalOpen(true)}
                  variant="primary"
                >
                  <PlusIcon className="h-5 w-5" />
                  สร้างบทบาท
                </Button>
              </div>
            </div>

            {loading ? (
              <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                  <p className="text-base font-medium">กำลังโหลดข้อมูลบทบาท...</p>
                </div>
              </Card>
            ) : (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
              <div className="overflow-x-auto border-b border-slate-200 flex-1">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap w-16"
                      >
                        ลำดับ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap"
                      >
                        ชื่อบทบาท
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase"
                      >
                        รายละเอียด
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap"
                      >
                        จำนวนผู้ใช้งาน
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase whitespace-nowrap"
                      >
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {roles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-0 border-b-0 h-0">
                          <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                            <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                            <p className="text-lg font-medium">ไม่พบข้อมูลบทบาทในระบบ</p>
                            <p className="text-sm mt-1">ลองสร้างบทบาทใหม่เพื่อใช้งาน</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {roles
                      .slice(
                        (roleCurrentPage - 1) * roleItemsPerPage,
                        roleCurrentPage * roleItemsPerPage,
                      )
                      .map((role, idx) => (
                      <tr
                        key={role.id}
                        className="hover:bg-slate-50 border-b border-slate-200 [&>td]:align-middle [&>td]:text-center"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                          {(roleCurrentPage - 1) * roleItemsPerPage + idx + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {(() => {
                            const rName = role.name;
                            const safeName =
                              typeof rName === 'string' ? rName : 'Unknown';
                            return (
                              ROLE_NAME_MAPPING[safeName.toLowerCase()] ||
                              safeName
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-xl break-words whitespace-normal !text-left">
                          {role.description || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                          {roleCounts[role.id] || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-sm font-medium">
                          <Button
                            data-role-id={role.id}
                            onClick={(e) => handleDropdownToggle(e, role.id)}
                            variant="icon"
                            title="ตัวเลือก"
                          >
                            <span className="sr-only">Open options</span>
                            <ManageIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-auto border-t border-slate-200">
                <Pagination
                  currentPage={roleCurrentPage}
                  itemsPerPage={roleItemsPerPage}
                  totalItems={roles.length}
                  onPageChange={setRoleCurrentPage}
                  onItemsPerPageChange={(size) => {
                    setRoleItemsPerPage(size);
                    setRoleCurrentPage(1);
                  }}
                />
              </div>
            </div>
            )}
          </>
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {view === 'users' &&
              userActions.map((action) => (
                <a
                  key={action.label}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const user = users.find((u) => u.id === openDropdownId);
                    if (!user) {
                      setOpenDropdownId(null);
                      return;
                    }
                    if (action.label === 'ดูรายละเอียด') {
                      handleViewDetails(user);
                    } else if (action.label === 'แก้ไข') {
                      handleEdit(user);
                    } else if (action.label === 'กระเป๋าเงิน') {
                      handleOpenWallet(user);
                    } else if (action.label === 'ลบ') {
                      handleDelete(user);
                    } else {
                      setOpenDropdownId(null);
                    }
                  }}
                  className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                  role="menuitem"
                >
                  <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                  <span>{action.label}</span>
                </a>
              ))}
            {view === 'roles' && (
              <>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleViewRoleDetails(openDropdownId!);
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                >
                  <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                  <span>ดูรายละเอียด</span>
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditRole(openDropdownId!);
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                >
                  <PencilIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                  <span>แก้ไข</span>
                </a>
                {(() => {
                  const hasUsers = roleCounts[openDropdownId || ''] > 0;
                  return (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasUsers) return;
                        const role = roles.find((r) => r.id === openDropdownId);
                        if (role) handleDeleteRole(role);
                      }}
                      aria-disabled={hasUsers}
                      title={
                        hasUsers
                          ? 'ไม่สามารถลบบทบาทที่มีผู้ใช้งานได้'
                          : 'ลบบทบาท'
                      }
                      className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                        hasUsers
                          ? 'text-slate-400 cursor-not-allowed pointer-events-none'
                          : 'text-red-700 hover:bg-red-50'
                      }`}
                      role="menuitem"
                    >
                      <TrashIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                      <span>ลบ</span>
                    </a>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
      <RoleModal
        isOpen={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
        mode="create"
        onSuccess={() => fetchRoles()}
      />
      <RoleModal
        isOpen={isEditRoleModalOpen}
        onClose={() => setIsEditRoleModalOpen(false)}
        mode="edit"
        roleId={roleToEditId}
        onSuccess={() => fetchRoles()}
      />
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onCreateUser={handleCreateUser}
        onUpdateUser={handleUpdateUser}
        roles={roles as { id: string; name: string }[]}
      />
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        user={userToEdit}
        onUpdateUser={handleUpdateUser}
        roles={roles as { id: string; name: string }[]}
      />
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUser}
      />
      <RoleDetailsModal
        isOpen={isRoleDetailsModalOpen}
        onClose={() => setIsRoleDetailsModalOpen(false)}
        roleId={selectedRoleId}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน{' '}
            <strong>{userToDelete?.name}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
      <ConfirmationModal
        isOpen={isDeleteRoleModalOpen}
        onClose={() => setIsDeleteRoleModalOpen(false)}
        onConfirm={handleConfirmDeleteRole}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบผู้บทบาท{' '}
            <strong>{roleToDelete?.name}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
      <UserWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        user={selectedUserForWallet}
      />
    </div>
  );
};

export default Users;
