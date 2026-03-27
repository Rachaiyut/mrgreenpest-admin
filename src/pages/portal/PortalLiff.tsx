import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';
import { API_CONFIG } from '../../config/api';

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || '';

const PortalLiff: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = usePortal();
  const [status, setStatus] = useState<'loading' | 'linking' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [linkToken, setLinkToken] = useState('');

  const page = searchParams.get('page') || 'dashboard';
  const validPages = ['dashboard', 'quotations', 'contracts', 'receipts', 'service-reports'];
  const targetPage = validPages.includes(page) ? page : 'dashboard';

  useEffect(() => {
    if (isAuthenticated) {
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

  const handleLink = async () => {
    if (!linkToken.trim()) return;
    setStatus('loading');

    try {
      const liff = (await import('@line/liff')).default;
      const accessToken = liff.getAccessToken();

      // First link the account via webhook would be ideal,
      // but since we're in LIFF, we can call a linking API directly
      // For now, show instructions to type in LINE chat
      setStatus('linking');
    } catch {
      setStatus('error');
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมบัญชี');
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
            <div className="mt-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-700 text-sm font-medium mb-2">
                  บัญชี LINE ของคุณยังไม่ได้เชื่อมกับระบบ
                </p>
                <p className="text-amber-600 text-xs">
                  กรุณาพิมพ์รหัสเชื่อมบัญชีที่ได้รับจากเจ้าหน้าที่ในแชท LINE ของ MrGreenPest
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-slate-700 text-sm font-bold mb-2">วิธีเชื่อมบัญชี:</p>
                <p className="text-slate-600 text-sm">1. กลับไปที่แชท LINE ของ MrGreenPest</p>
                <p className="text-slate-600 text-sm">2. พิมพ์ <span className="font-mono bg-white px-2 py-0.5 rounded border text-green-700 font-bold">LINK รหัส</span></p>
                <p className="text-slate-600 text-sm">3. กลับมากดเมนูอีกครั้ง</p>
              </div>
            </div>
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
