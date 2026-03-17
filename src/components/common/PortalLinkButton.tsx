import React, { useState } from 'react';
import { CustomerApi } from '@/src/api/customer';

interface PortalLinkButtonProps {
  customerId: string;
  buttonText?: string;
  className?: string;
}

export const PortalLinkButton: React.FC<PortalLinkButtonProps> = ({
  customerId,
  buttonText = 'คัดลอก Link Portal',
  className = '',
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await CustomerApi.generatePortalToken(customerId);
      const portalUrl = `${window.location.origin}/portal?token=${response.data.token}`;

      await navigator.clipboard.writeText(portalUrl);

      // Simple alert - can be replaced with toast/notification
      alert('คัดลอกลิงก์ Portal สำเร็จ!');
    } catch (error) {
      console.error('Error generating portal token:', error);
      alert('เกิดข้อผิดพลาดในการสร้างลิงก์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      {loading ? 'กำลังสร้าง...' : buttonText}
    </button>
  );
};
