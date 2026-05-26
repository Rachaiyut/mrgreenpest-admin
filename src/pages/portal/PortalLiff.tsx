import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';
import { API_CONFIG } from '@/src/constants/config';

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || '';

/**
 * Lock layout เป็น single-page (ซ่อน sidebar) ถ้า target ไม่ใช่ dashboard
 *   - dashboard → ลบ flag (เห็นเมนูเต็ม เพื่อ navigate ได้)
 *   - quotations / contracts / receipts / service-reports → set flag (ล็อกหน้านั้น)
 */
const applyNoMenuFlag = (targetPage: string) => {
  if (targetPage === 'dashboard') {
    localStorage.removeItem('portal_no_menu');
  } else {
    localStorage.setItem('portal_no_menu', '1');
  }
};

const PortalLiff: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = usePortal();
  const [status, setStatus] = useState<'loading' | 'linking' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // LIFF เอา query string ของ LIFF URL (เช่น ?page=quotations) ห่อใส่ `liff.state`
  // เป็น `?liff.state=%3Fpage%3Dquotations` แล้ว redirect มาที่ endpoint URL
  // → ต้อง decode liff.state เพื่อดึง page ที่แท้จริง
  const resolvePageParam = (): string => {
    const direct = searchParams.get('page');
    if (direct) return direct;
    const liffState = searchParams.get('liff.state');
    if (liffState) {
      try {
        const inner = liffState.startsWith('?') ? liffState.slice(1) : liffState;
        const innerParams = new URLSearchParams(inner);
        const fromState = innerParams.get('page');
        if (fromState) return fromState;
      } catch {
        // ignore parse error
      }
    }
    return 'dashboard';
  };
  const page = resolvePageParam();
  const validPages = ['dashboard', 'quotations', 'contracts', 'receipts', 'service-reports', 'assessments'];
  const targetPage = validPages.includes(page) ? page : 'dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      applyNoMenuFlag(targetPage);
      navigate(`/portal/${targetPage}`, { replace: true });
      return;
    }

    initLiff();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const initLiff = async () => {
    try {
      // Dynamically import LIFF SDK
      const liff = (await import('@line/liff')).default;

      await liff.init({ liffId: LIFF_ID });

      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        setStatus('error');
        setErrorMsg('ไม่สามารถดึง LINE access token ได้');
        return;
      }

      // Call line-login API
      const res = await fetch(`${API_CONFIG.baseUrl}/customer-portal/line-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_access_token: accessToken }),
      });

      const data = await res.json();

      if (data.success && data.data?.linked) {
        // Store JWT and customer info (same as portal login flow)
        localStorage.setItem('portal_token', data.data.access_token);
        localStorage.setItem('portal_customer', JSON.stringify(data.data.customer));
        // Lock layout: dashboard เห็นเมนูเต็ม, page อื่น ๆ ซ่อนเมนู (เข้าตรงๆ จาก Rich Menu)
        applyNoMenuFlag(targetPage);
        // Force page reload to pick up new auth state
        window.location.href = `/portal/${targetPage}`;
      } else {
        // Not linked — show linking UI
        setStatus('linking');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = customerCode.trim();
    if (!code) {
      setLinkError('กรุณากรอกรหัสลูกค้า');
      return;
    }
    setLinkError('');
    setSubmitting(true);

    try {
      const liff = (await import('@line/liff')).default;
      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        setLinkError('ไม่สามารถดึง LINE access token ได้');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_CONFIG.baseUrl}/customer-portal/line-link-by-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_access_token: accessToken, customer_code: code }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.data?.access_token) {
        localStorage.setItem('portal_token', data.data.access_token);
        localStorage.setItem('portal_customer', JSON.stringify(data.data.customer));
        applyNoMenuFlag(targetPage);
        window.location.href = `/portal/${targetPage}`;
      } else {
        setLinkError(data?.message || data?.data?.message || 'รหัสลูกค้าไม่ถูกต้องหรือไม่มีในระบบ');
        setSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมบัญชี';
      setLinkError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">MG</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">MrGreenPest Portal</h1>

          {status === 'loading' && (
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
              <p className="text-slate-600">กำลังเข้าสู่ระบบผ่าน LINE...</p>
            </div>
          )}

          {status === 'linking' && (
            <form onSubmit={handleLink} className="mt-6 space-y-4 text-left">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-amber-700 text-sm font-medium">
                  เชื่อมบัญชี LINE กับลูกค้าครั้งแรก
                </p>
                <p className="text-amber-600 text-xs mt-1">
                  หลังเชื่อมแล้ว ครั้งถัดไปจะเข้าระบบอัตโนมัติ
                </p>
              </div>
              <div>
                <label htmlFor="customer-code" className="block text-sm font-medium text-slate-700 mb-1.5">
                  รหัสลูกค้า
                </label>
                <input
                  id="customer-code"
                  type="text"
                  value={customerCode}
                  onChange={(e) => { setCustomerCode(e.target.value); setLinkError(''); }}
                  placeholder="เช่น C690001"
                  autoFocus
                  disabled={submitting}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base disabled:bg-slate-100"
                />
                {linkError && (
                  <p className="text-red-600 text-xs mt-1.5">{linkError}</p>
                )}
                <p className="text-slate-500 text-xs mt-1.5">
                  รหัสลูกค้าอยู่บนใบเสนอราคา/ใบเสร็จ — ถามได้จากเจ้าหน้าที่
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting || !customerCode.trim()}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    กำลังเชื่อมบัญชี...
                  </>
                ) : (
                  'เชื่อมบัญชีและเข้าสู่ระบบ'
                )}
              </button>
            </form>
          )}

          {status === 'error' && (
            <div className="mt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{errorMsg}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                ลองอีกครั้ง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalLiff;
