import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, UserWallet } from '@/src/types/entity/app.interface';
import { FormField, Input, Button } from '../../common/FormControls';
import { formatThaiDateTime } from '../../../utils/date';
import { PlusIcon, PencilIcon } from '../../../assets/icons/Icons';
import { UserApi } from '../../../api/user';

interface UserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserWalletModal: React.FC<UserWalletModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');

  const [showLimitForm, setShowLimitForm] = useState(false);
  const [limitAmount, setLimitAmount] = useState<number | ''>('');

  const [wallet, setWallet] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchWallet();
    }
  }, [isOpen, user]);

  const fetchWallet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await UserApi.getWallet(user.id);
      setWallet(data);
      setLimitAmount(data.expense_limit || 0);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const balance = useMemo(() => {
    if (wallet && 'balance' in wallet) {
      return wallet.expense_limit;
    }
    return 0;
  }, [wallet]);

  const sortedTransactions = useMemo(() => {
    if (!wallet || !wallet.transactions) return [];
    return [...wallet.transactions].sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [wallet]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && description && Number(amount) > 0) {
      try {
        await UserApi.createExpense(user.id, {
          description,
          amount: Number(amount),
        });

        // Refresh wallet
        await fetchWallet();

        // Reset form
        setDescription('');
        setAmount('');
        setShowForm(false);
      } catch (error: any) {
        console.error('Failed to create expense:', error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          alert(error.response.data.message);
        } else {
          alert('ไม่สามารถบันทึกรายการได้');
        }
      }
    }
  };

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      try {
        await UserApi.update(user.id, {
          expense_limit: Number(limitAmount),
        });

        // Refresh wallet
        await fetchWallet();
        setShowLimitForm(false);
      } catch (error) {
        console.error('Failed to update limit:', error);
      }
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`กระเป๋าเงิน: ${user.name}`}
      size="3xl"
      footer={
        <Button
          type="button"
          onClick={onClose}
          className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          variant="primary"
        >
          ปิด
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="p-4 bg-primary/10 rounded-lg text-center relative">
          <p className="text-sm font-medium text-primary/80">วงเงินการเบิก</p>
          <p className="text-4xl font-bold text-primary">
            ฿
            {balance.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          <button
            onClick={() => setShowLimitForm(!showLimitForm)}
            className="absolute top-4 right-4 text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium"
          >
            <PencilIcon className="w-4 h-4" />
            แก้ไขวงเงิน
          </button>
        </div>

        {showLimitForm && (
          <form
            onSubmit={handleUpdateLimit}
            className="p-4 border rounded-lg bg-slate-50 space-y-4"
          >
            <h3 className="font-semibold text-slate-800">แก้ไขวงเงินอนุมัติ</h3>
            <FormField label="วงเงิน (บาท)" htmlFor="limit-amount">
              <Input
                id="limit-amount"
                type="number"
                value={limitAmount}
                onChange={(e) =>
                  setLimitAmount(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                min="0"
                step="0.01"
                required
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setShowLimitForm(false)}
                className="py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
                variant="secondary"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold"
                variant="primary"
              >
                บันทึกวงเงิน
              </Button>
            </div>
          </form>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
            variant="accent"
          >
            <PlusIcon className="h-5 w-5" />
            {showForm ? 'ซ่อนฟอร์ม' : 'เพิ่มรายการจ่าย'}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddTransaction}
            className="p-4 border rounded-lg bg-slate-50 space-y-4"
          >
            <h3 className="font-semibold text-slate-800">
              เพิ่มรายการจ่ายใหม่
            </h3>
            <FormField label="ชื่อรายการ" htmlFor="txn-description">
              <Input
                id="txn-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </FormField>
            <FormField label="จำนวนเงิน" htmlFor="txn-amount">
              <Input
                id="txn-amount"
                type="number"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                min="0.01"
                step="0.01"
                required
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
                variant="secondary"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold"
                variant="primary"
              >
                บันทึกรายการ
              </Button>
            </div>
          </form>
        )}

        <div>
          <h3 className="font-semibold text-slate-800 mb-2">ประวัติรายการ</h3>
          <div className="border rounded-lg max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 uppercase">
                    รายละเอียด
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-slate-600 uppercase">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {sortedTransactions.length > 0 ? (
                  sortedTransactions.map((txn: any) => (
                    <tr key={txn.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {formatThaiDateTime(txn.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {txn.description}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${
                          txn.type === 'รายรับ'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {txn.type === 'รายรับ' ? '+' : '-'}
                        {txn.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-center py-10 text-slate-500"
                    >
                      {loading ? 'กำลังโหลด...' : 'ยังไม่มีรายการ'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
