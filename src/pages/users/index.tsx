import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import {
  User,
  UserRole,
  UserWallet,
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
} from '../../assets/icons/Icons';
import { AddRoleModal } from '../../components/features/users/AddRoleModal';
import { AddUserModal } from '../../components/features/users/AddUserModal';
import { Pagination } from '../../components/common/Pagination';
import { UserDetailsModal } from '../../components/features/users/UserDetailsModal';
import { RoleDetailsModal } from '../../components/features/users/RoleDetailsModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { EditUserModal } from '../../components/features/users/EditUserModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { UserWalletModal } from '../../components/features/users/UserWalletModal';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const roleColors: Record<UserRole, string> = {
    [UserRole.Admin]: 'bg-purple-100 text-purple-700',
    [UserRole.Sales]: 'bg-blue-100 text-blue-700',
    [UserRole.Accounting]: 'bg-green-100 text-green-700',
    [UserRole.Warehouse]: 'bg-orange-100 text-orange-700',
    [UserRole.Dispatcher]: 'bg-yellow-100 text-yellow-700',
    [UserRole.Technician]: 'bg-sky-100 text-sky-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role]}`}
    >
      {role}
    </span>
  );
};

import { useData } from '../../contexts/DataContext';

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
  const { users, userWallets } = useData();
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDetailsModalOpen, setIsRoleDetailsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedUserForWallet, setSelectedUserForWallet] =
    useState<User | null>(null);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const filteredUsers = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    return [...users].reverse().filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesSearch =
        !searchQuery ||
        user.nationalId.toLowerCase().includes(lowercasedQuery) ||
        user.name.toLowerCase().includes(lowercasedQuery) ||
        user.nickname.toLowerCase().includes(lowercasedQuery) ||
        user.email?.toLowerCase().includes(lowercasedQuery);
      return matchesRole && matchesSearch;
    });
  }, [users, searchQuery, roleFilter]);

  const totalItems = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
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

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleViewRoleDetails = (role: UserRole) => {
    setSelectedRole(role);
    setIsRoleDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleOpenWallet = (user: User) => {
    setSelectedUserForWallet(user);
    setIsWalletModalOpen(true);
    setOpenDropdownId(null);
  };

  const roleCounts = Object.values(UserRole).reduce(
    (acc, role) => {
      // FIX: Use users prop for calculation
      acc[role] = users.filter((user) => user.role === role).length;
      return acc;
    },
    {} as Record<UserRole, number>
  );

  const userActions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon },
    { label: 'แก้ไข', icon: PencilIcon },
    { label: 'กระเป๋าเงิน', icon: WalletIcon },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

  const roleActions = [
    { label: 'แก้ไข', icon: PencilIcon },
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
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {view === 'users' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">ผู้ใช้งาน</h1>
                <p className="mt-1 text-slate-600">จัดการบัญชีผู้ใช้ในระบบ</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-64">
                  <Input
                    type="search"
                    placeholder="ค้นหา (เลขบัตร, ชื่อ, ชื่อเล่น)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    title="ค้นหาด้วย: เลขบัตรประชาชน, ชื่อ-นามสกุล, ชื่อเล่น, อีเมล"
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">ทุกบทบาท</option>
                    {Object.values(UserRole).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button onClick={() => setIsAddUserModalOpen(true)}>
                  <PlusIcon className="h-5 w-5" />
                  สร้างผู้ใช้งาน
                </Button>
              </div>
            </div>

            <Card className="!p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        ลำดับ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        ชื่อ
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        อีเมล
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        โทรศัพท์
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        บทบาท
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">จัดการ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedUsers.map((user, index) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={user.avatarUrl}
                                alt=""
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900">
                                {user.name} ({user.nickname})
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {user.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {user.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="inline-block text-left">
                            <Button
                              variant="icon"
                              data-user-id={user.id}
                              onClick={(e) => handleDropdownToggle(e, user.id)}
                            >
                              <span className="sr-only">Open options</span>
                              <ManageIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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

            <Card className="!p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        ชื่อบทบาท
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap"
                      >
                        จำนวนผู้ใช้งาน
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">จัดการ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {Object.values(UserRole).map((role) => (
                      <tr key={role} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {role}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {roleCounts[role]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="inline-block text-left">
                            <Button
                              data-role-id={role}
                              onClick={(e) => handleDropdownToggle(e, role)}
                              variant="icon"
                              title="ตัวเลือก"
                            >
                              <span className="sr-only">Open options</span>
                              <ManageIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
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
                    handleViewRoleDetails(openDropdownId as UserRole);
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
                    setOpenDropdownId(null);
                    setIsAddRoleModalOpen(true);
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                >
                  <PencilIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                  <span>แก้ไข</span>
                </a>
                <Button
                  onClick={() => setOpenDropdownId(null)}
                  disabled={roleCounts[openDropdownId as UserRole] > 0}
                  title={
                    roleCounts[openDropdownId as UserRole] > 0
                      ? 'ไม่สามารถลบบทบาทที่มีผู้ใช้งานได้'
                      : 'ลบบทบาท'
                  }
                  className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                    roleCounts[openDropdownId as UserRole] > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                  role="menuitem"
                  variant="ghost"
                >
                  <TrashIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                  <span>ลบ</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      <AddRoleModal
        isOpen={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
      />
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onCreateUser={onCreateUser}
      />
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        user={userToEdit}
        onUpdateUser={onUpdateUser}
      />
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUser}
      />
      <RoleDetailsModal
        isOpen={isRoleDetailsModalOpen}
        onClose={() => setIsRoleDetailsModalOpen(false)}
        role={selectedRole}
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
      <UserWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        user={selectedUserForWallet}
        wallet={
          userWallets.find((w) => w.userId === selectedUserForWallet?.id) || {
            userId: selectedUserForWallet?.id || '',
            transactions: [],
          }
        }
        onCreateTransaction={onCreateWalletTransaction}
      />
    </>
  );
};

export default Users;
