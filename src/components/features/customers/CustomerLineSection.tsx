import React, { useState } from 'react';
import { Button } from '../../common/FormControls';
import { API_CONFIG } from '../../../constants/config';

interface CustomerLineSectionProps {
  customerId: string;
  lineUserId?: string | null;
  customerName: string;
  onUpdate?: () => void;
}

const authHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const CustomerLineSection: React.FC<CustomerLineSectionProps> = ({
  customerId,
  lineUserId,
  customerName,
  onUpdate,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendPage, setSendPage] = useState('dashboard');
  const [message, setMessage] = useState('');

  const isLinked = !!lineUserId;

  const handleGenerateLinkToken = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/customer/${customerId}/line-link-token`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setLinkToken(data.data.token);
        setLinkExpiry(new Date(data.data.expires_at).toLocaleTimeString('th-TH'));
      }
    } catch (err) {
      console.error('Failed to generate link token', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('ยืนยันยกเลิกการเชื่อม LINE?')) return;
    setLoading(true);
    try {
      await fetch(`${API_CONFIG.baseUrl}/customer/${customerId}/line-unlink`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      onUpdate?.();
    } catch (err) {
      console.error('Failed to unlink', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPortalLink = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/line/send-portal-link`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          customer_id: customerId,
          page: sendPage,
          message: message || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('');
        alert('ส่งลิงก์ผ่าน LINE สำเร็จ');
      } else {
        alert(data.data?.message || 'ส่งลิงก์ไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Failed to send portal link', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-slate-500">สถานะ:</span>
        {isLinked ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500" /> เชื่อมแล้ว
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> ยังไม่เชื่อม
          </span>
        )}
        {isLinked && (
          <span className="font-mono text-xs text-slate-400 ml-auto">
            ID: {lineUserId!.substring(0, 8)}...{lineUserId!.substring(lineUserId!.length - 4)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!isLinked ? (
          <>
            <Button
              variant="outline"
              type="button"
              onClick={handleGenerateLinkToken}
              disabled={loading}
              className="text-sm px-4 py-2 border-green-300 text-green-700 hover:bg-green-50"
            >
              สร้างรหัสเชื่อมบัญชี
            </Button>

            {linkToken && (
              <div className="w-full mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-slate-700">
                  ให้ลูกค้าพิมพ์ในแชท LINE OA:
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-green-700 bg-white px-3 py-1 rounded border border-green-200 inline-block">
                  LINK {linkToken}
                </p>
                <p className="text-xs text-slate-500 mt-1">หมดอายุเวลา {linkExpiry}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <Button
              variant="outline"
              type="button"
              onClick={handleUnlink}
              disabled={loading}
              className="text-sm px-4 py-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              ยกเลิกการเชื่อม
            </Button>

            <div className="w-full mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-700">ส่งลิงก์ Portal ผ่าน LINE</p>
              <div className="flex gap-2">
                <select
                  value={sendPage}
                  onChange={(e) => setSendPage(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="quotations">ใบเสนอราคา</option>
                  <option value="contracts">สัญญา</option>
                  <option value="receipts">ใบเสร็จ</option>
                  <option value="service-reports">รายงานบริการ</option>
                </select>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ข้อความ (ไม่บังคับ)"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                />
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleSendPortalLink}
                  disabled={loading}
                  className="text-sm px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ส่ง
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
