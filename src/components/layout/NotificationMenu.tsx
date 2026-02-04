import React, { Fragment, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { BellIcon } from '@/src/assets/icons/Icons';
import { AssessmentApi } from '@/src/api';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { useNavigate } from 'react-router-dom';

export const NotificationMenu: React.FC = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const navigate = useNavigate();

    const fetchNotification = async () => {
        try {
            // Using existing API that should now support filtering
            const res = await AssessmentApi.getAll({
                limit: 1,
                // @ts-ignore - The type definition on frontend might not be updated yet
                status: AsessmentStatus.PENDING
            });
            // The response count should be the total count matching the filter
            if (res && typeof res.total_items === 'number') {
                setPendingCount(res.total_items);
            } else {
                // Fallback if total_items is not reliable or different structure
                setPendingCount(res.data.length);
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

    const handleClick = (close?: () => void) => {
        navigate('/assessments?status=PENDING');
        if (close) close();
    };

    return (
        <Popover className="relative">
            <Popover.Button className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 relative focus:outline-none">
                <BellIcon className="h-6 w-6" />
                {pendingCount > 0 && (
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
                <Popover.Panel className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {({ close }) => (
                        <div className="px-4 py-3">
                            <h3 className="text-sm font-semibold text-slate-900">การแจ้งเตือน</h3>
                            <div className="mt-3 space-y-2">
                                {pendingCount > 0 ? (
                                    <div
                                        onClick={() => handleClick(close)}
                                        className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800">รออนุมัติราคา</span>
                                            <span className="text-xs text-slate-500">มีใบประเมินที่ราคาต่ำกว่าเกณฑ์</span>
                                        </div>
                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                            {pendingCount}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">ไม่มีการแจ้งเตือนใหม่</p>
                                )}
                            </div>
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
    );
};
