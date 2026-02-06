import React, { Fragment, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { BellIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@/src/assets/icons/Icons';
import { NotificationApi, Notification } from '@/src/api/notification';
import { useNavigate } from 'react-router-dom';

export const NotificationMenu: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    const fetchNotification = async () => {
        try {
            const res = await NotificationApi.getAll({
                limit: 5,
                // We fetch all to show recent list, but count unread from meta
            });
            
            if (res && res.data) {
                setNotifications(res.data);
                // The backend adds unread_count to meta
                // @ts-ignore
                const meta = res.meta;
                if (meta && typeof meta.unread_count === 'number') {
                    setUnreadCount(meta.unread_count);
                } else {
                    // Fallback
                    setUnreadCount(res.data.filter(n => !n.is_read).length);
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotification();
        const interval = setInterval(fetchNotification, 60000); // Polling every minute
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (notification: Notification) => {
        if (!notification.is_read) {
            try {
                await NotificationApi.markAsRead(notification.id);
                // Update local state to reflect read status immediately
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Failed to mark as read", error);
            }
        }
    };

    const handleClick = (notification: Notification, close: () => void) => {
        handleMarkAsRead(notification);
        close();

        // Navigate based on type
        if (notification.related_entity_type === 'WITHDRAWAL') {
            navigate(`/inventory/withdrawals`); // Or specific detail modal if possible
        } else if (notification.related_entity_type === 'ASSESSMENT') {
            navigate(`/assessments`);
        } else {
             // Default fallback
        }
    };
    
    const handleMarkAllRead = async () => {
        try {
            await NotificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    }

    return (
        <Popover className="relative">
            <Popover.Button className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 relative focus:outline-none">
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white transform translate-x-1/4 -translate-y-1/4"></span>
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
                <Popover.Panel className="absolute right-0 z-20 mt-2 w-96 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[80vh] overflow-y-auto">
                    {({ close }) => (
                        <div className="px-4 py-3">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-slate-900">การแจ้งเตือน</h3>
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
                                                notification.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50 hover:bg-blue-100'
                                            }`}
                                        >
                                            <div className="flex-shrink-0 mt-1">
                                                {notification.type.includes('OVER_LIMIT') ? (
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                                                ) : (
                                                    <BellIcon className="w-5 h-5 text-blue-500" />
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-sm ${notification.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                                                        {notification.title}
                                                    </span>
                                                    {!notification.is_read && (
                                                        <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 mt-2">
                                                    {new Date(notification.created_at).toLocaleString('th-TH')}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">ไม่มีการแจ้งเตือนใหม่</p>
                                )}
                            </div>
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
    );
};
