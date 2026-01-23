import { PAGE_PATH } from '@/src/constants/route';
import { Page } from '@/src/types/page';
import { NavigationItem } from '@/src/types/nav';
import { FC, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

interface SidebarFlyoutProps {
  groupName: string;
  items: NavigationItem[];
  position: { top: number; left: number };
  currentPage: Page;
  onClose: () => void;
  onEnter: () => void;
  onLeave: () => void;
  anchorEl: HTMLElement | null;
}

export const SidebarFlyout: FC<SidebarFlyoutProps> = ({
  groupName,
  items,
  position,
  currentPage,
  onClose,
  onEnter,
  onLeave,
  anchorEl,
}) => {
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!flyoutRef.current) return;
      if (flyoutRef.current.contains(e.target as Node)) return;
      if (anchorEl && anchorEl.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
    };
  }, [anchorEl, onClose]);

  const group = items.find((i) => i.type === 'group' && i.name === groupName);

  if (!group || !('subItems' in group)) return null;

  return (
    <div
      ref={flyoutRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
      }}
      className="z-50 bg-white text-slate-800 shadow-xl rounded-md border border-slate-200 min-w-[220px]"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="py-2">
        {group.subItems.map((subItem: any) => {
          const isActive = currentPage === subItem.name;
          return (
            <Link
              key={subItem.name}
              to={`/${PAGE_PATH[subItem.name as Page]}`}
              onClick={onClose}
              className={`flex items-center w-full px-4 py-2 text-sm ${
                isActive ? 'bg-slate-100 text-primary' : 'hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{subItem.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

