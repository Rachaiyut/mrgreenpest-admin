import React, { Fragment, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@/src/assets/icons/Icons';
import type { Notification } from '@/src/api/notification';
import { NotificationApi } from '@/src/api/notification';
import { useNavigate } from 'react-router-dom';
import { socket } from '@/src/config/socket';

export const NotificationMenu: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial load from backend
    (async () => {
      try {
        const res = await NotificationApi.getAll({ page: 0, limit: 20 });
        const items = Array.isArray(res.data) ? res.data : [];
        setNotifications(items);

        if (typeof res.unread_count === 'number') {
          setUnreadCount(res.unread_count);
        } else {
          const count = items.filter((n) => !n.is_read).length;
          setUnreadCount(count);
        }
      } catch (e) {
        console.error('Failed to load notifications', e);
      }
    })();

    // Listen for connection confirmation
    function onConnect() {
      console.log('NotificationMenu: Socket connected!');
    }
    socket.on('connect', onConnect);

    // Listen for incoming notifications via socket (real-time push)
    function onNewNotification(newNotification: Notification) {
      console.log('Received new notification:', newNotification);
      setNotifications((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.some((n) => n.id === newNotification.id);
        if (exists) return safePrev;
        return [newNotification, ...safePrev];
      });
      setUnreadCount((prev) => (typeof prev === 'number' ? prev + 1 : 1));
    }
    socket.on('notification', onNewNotification);

    return () => {
      socket.off('connect', onConnect);
      socket.off('notification', onNewNotification);
    };
  }, []);

  const handleClick = async (notification: Notification, close: () => void) => {
    try {
      if (!notification.is_read) {
        await NotificationApi.markAsRead(notification.id);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }

    close();

    // Navigate based on type — append focus query param so the target page
    // can auto-open the relevant approval modal for that record.
    // Note: sub-item paths register as top-level in createRoutes (no parent prefix)
    const focusId = notification.related_entity_id;
    const inferCategory = (type: string): string | null => {
      if (type.includes('STOCK')) return 'STOCK';
      if (type.includes('EXPENSE')) return 'EXPENSE';
      return null;
    };
    const buildPath = (path: string) => {
      if (!focusId) return path;
      const params = new URLSearchParams();
      params.set('focus', focusId);
      params.set('action', 'approve');
      const cat = inferCategory(notification.type || '');
      if (cat) params.set('category', cat);
      return `${path}?${params.toString()}`;
    };

    if (notification.related_entity_type === 'ISSUE_NOTE') {
      navigate(buildPath('/withdraw-vehicle'));
    } else if (notification.related_entity_type === 'ISSUE_SUMMARY') {
      navigate(buildPath('/withdrawals'));
    } else if (notification.related_entity_type === 'WITHDRAWAL') {
      navigate(buildPath('/withdraw-vehicle'));
    } else if (notification.related_entity_type === 'ASSESSMENT') {
      navigate(buildPath('/assessments'));
    } else if (notification.related_entity_type === 'QUOTATION') {
      navigate(buildPath('/quotations'));
    } else if (notification.related_entity_type === 'JOB') {
      navigate(buildPath('/field-operations'));
    } else if (notification.related_entity_type === 'INVOICE') {
      navigate(buildPath('/invoice'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 relative focus:outline-none">
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 ring-2 ring-white text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute right-0 z-[9999] mt-2 w-96 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[80vh] overflow-y-auto">
          {({ close }) => (
            <div className="px-4 py-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  การแจ้งเตือน
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    อ่านทั้งหมด
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleClick(notification, close)}
                      className={`flex gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                        notification.is_read
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {notification.type.includes('OVER_LIMIT') || notification.type.includes('STOCK_LIMIT') ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                        ) : notification.type.includes('PRICE_ALERT') || notification.type.includes('QUOTATION_PRICE') ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        ) : notification.type.includes('PENDING_APPROVAL') || notification.type.includes('VERIFIED') ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <BellIcon className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex justify-between items-start">
                          <span
                            className={`text-sm ${notification.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}
                          >
                            {notification.title}
                          </span>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap break-words">
                          {notification.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-2">
                          {new Date(notification.created_at).toLocaleString(
                            'th-TH'
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    ไม่มีการแจ้งเตือนใหม่
                  </p>
                )}
              </div>
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};
