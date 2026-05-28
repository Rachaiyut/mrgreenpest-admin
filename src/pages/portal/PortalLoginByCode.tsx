import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';
import { API_CONFIG } from '@/src/constants/config';

const PortalLoginByCode: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ page?: string }>();
  const { isAuthenticated } = usePortal();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // รับ page จาก path param ก่อน (LINE Rich Menu friendly) → fallback ไป query string เก่า
  const page = params.page || searchParams.get('page') || 'dashboard';
  const validPages = ['dashboard', 'quotations', 'contracts', 'receipts', 'service-reports', 'assessments'];
  const targetPage = validPages.includes(page) ? page : 'dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(`/portal/${targetPage}`, { replace: true });
    }
  }, [isAuthenticated, navigate, targetPage]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('กรุณากรอกรหัสลูกค้า');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/customer-portal/login-by-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.access_token) {
        localStorage.setItem('portal_token', data.data.access_token);
        localStorage.setItem('portal_customer', JSON.stringify(data.data.customer));
        // dashboard → ลบ flag (เห็นเมนูเต็ม), page อื่น ๆ → set flag (ล็อกหน้านั้น)
        if (targetPage === 'dashboard') {
          localStorage.removeItem('portal_no_menu');
        } else {
          localStorage.setItem('portal_no_menu', '1');
        }
        window.location.href = `/portal/${targetPage}`;
      } else {
        setError(data?.message || data?.data?.message || 'รหัสลูกค้าไม่ถูกต้องหรือไม่มีในระบบ');
        setSubmitting(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setSubmitting(false);
    }
  };

  // ถ้ามี ?code=xxx ใน URL → submit อัตโนมัติทันที (ใช้กับ link เฉพาะลูกค้า)
  useEffect(() => {
    const auto = searchParams.get('code');
    if (auto && !isAuthenticated) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <img src="/mrgreen1.png" alt="Mr. Green" className="w-20 h-20 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800">MrGreenPest Portal</h1>
            <p className="text-slate-500 text-sm mt-1">ดูใบเสนอราคา, สัญญา, ใบเสร็จ, รายงานบริการ</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="customer-code" className="block text-sm font-medium text-slate-700 mb-1.5">
                รหัสลูกค้า
              </label>
              <input
                id="customer-code"
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                placeholder="เช่น C690001"
                autoFocus
                disabled={submitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base disabled:bg-slate-100"
              />
              {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
              <p className="text-slate-500 text-xs mt-1.5">
                รหัสลูกค้าอยู่บนใบเสนอราคา/ใบเสร็จ — ถามได้จากเจ้าหน้าที่
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortalLoginByCode;
