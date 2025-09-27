import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationsContext';

export default function NotificationBadge({ user, onClick }) {
  const { notifications } = useNotifications();

  if (!user || user.accountType !== 'verifier') return null;

  const count = notifications.length;

  return (
    <button onClick={onClick} className="relative p-2 rounded-lg hover:bg-carbon-100 transition-colors">
      <BellIcon className="w-6 h-6 text-carbon-600" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}