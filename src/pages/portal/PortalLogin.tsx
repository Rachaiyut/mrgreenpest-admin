import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';

const PortalLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = usePortal();
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal/dashboard', { replace: true });
      return;
    }

    if (!token) {
      setError('ไม่พบ Token กรุณาใช้ลิงก์ที่ได้รับจากผู้ดูแลระบบ');
      return;
    }

    const verify = async () => {
      const success = await login(token);
      if (success) {
        navigate('/portal/dashboard', { replace: true });
      } else {
        setError('Token ไม่ถูกต้องหรือหมดอายุ กรุณาติดต่อผู้ดูแลระบบ');
      }
    };

    verify();
  }, [token, login, navigate, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">MG</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">MrGreenPest Portal</h1>

          {loading && (
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
              <p className="text-slate-600">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
            </div>
          )}

          {error && (
            <div className="mt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !token && (
            <p className="mt-4 text-slate-500 text-sm">
              กรุณาใช้ลิงก์ที่ได้รับจากผู้ดูแลระบบเพื่อเข้าสู่ระบบ
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
