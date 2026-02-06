import React from 'react';
import { XIcon } from '../../assets/icons/Icons';
import { Button } from './FormControls';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = '2xl',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  const maxWidthClass = sizeClasses[size];

  const renderFooter =
    footer === undefined ? (
      <Button variant="primary" type="button" onClick={onClose}>
        ปิด
      </Button>
    ) : (
      footer
    );

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity duration-300 p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.3s forwards' }}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 flex-shrink-0">
          <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
          <Button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-full p-1"
            variant="icon"
            title="ปิด"
          >
            <XIcon className="h-6 w-6" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
        {renderFooter && (
          <div className="flex justify-end items-center p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex-shrink-0">
            {renderFooter}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
            animation: fade-in-scale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
