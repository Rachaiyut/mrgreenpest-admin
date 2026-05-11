import { FC, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ManageIcon } from '../../assets/icons/Icons';

export interface ActionDropdownItem {
  label: string;
  icon: FC<{ className?: string }>;
  onClick: () => void;
  isDanger?: boolean;
  isPrimary?: boolean;
  hidden?: boolean;
}

interface ActionDropdownProps {
  actions: ActionDropdownItem[];
  itemId: string;
  openId: string | null;
  onToggle: (id: string | null) => void;
}

export const ActionDropdown: FC<ActionDropdownProps> = ({
  actions,
  itemId,
  openId,
  onToggle,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; bottom: number; left: number; isBottom: boolean } | null>(null);

  const isOpen = openId === itemId;

  const close = useCallback(() => {
    onToggle(null);
  }, [onToggle]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isOpen) {
      close();
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isBottom = spaceBelow < 280 && spaceAbove > spaceBelow;
      setPosition({ top: rect.bottom, bottom: window.innerHeight - rect.top, left: rect.right, isBottom });
      onToggle(itemId);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      close();
    };

    const handleScroll = () => close();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, close]);

  const visibleActions = actions.filter((a) => !a.hidden);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ManageIcon className="h-5 w-5" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            ...(position.isBottom
              ? { bottom: position.bottom + 4, top: 'auto' }
              : { top: position.top + 4, bottom: 'auto' }),
            left: position.left,
            transform: 'translateX(-100%)',
          }}
          className="z-[100] w-52 rounded-2xl shadow-xl bg-white ring-1 ring-black/5 overflow-x-hidden overflow-y-auto max-h-[80vh]"
          role="menu"
        >
          <div className="py-2" role="none">
            {visibleActions.map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.onClick();
                }}
                className={`flex items-center w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                  action.isDanger
                    ? 'text-red-600 hover:bg-red-50'
                    : action.isPrimary
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                role="menuitem"
              >
                <action.icon
                  className={`mr-3 h-5 w-5 ${
                    action.isDanger
                      ? 'text-red-400'
                      : action.isPrimary
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                  }`}
                />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
