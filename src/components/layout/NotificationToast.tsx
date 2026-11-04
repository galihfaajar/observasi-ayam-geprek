import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { NotificationState } from '../../types';

interface NotificationToastProps {
  notification: NotificationState;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  if (!notification.show) return null;

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-500 text-emerald-900',
    error: 'bg-rose-50 border-rose-500 text-rose-900',
    warning: 'bg-amber-50 border-amber-500 text-amber-900',
    info: 'bg-sky-50 border-sky-500 text-sky-900'
  }[notification.type];

  const IconComponent = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info
  }[notification.type];

  const iconColors = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    warning: 'text-amber-600',
    info: 'text-sky-600'
  }[notification.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 animate-in slide-in-from-bottom duration-300">
      <div className={`flex items-start p-4 rounded-xl shadow-lg border-l-4 ${bgStyles}`}>
        <IconComponent className={`w-5 h-5 mr-3 mt-0.5 shrink-0 ${iconColors}`} />
        <div className="flex-1 text-sm font-medium leading-relaxed">
          {notification.message}
        </div>
        <button
          onClick={onClose}
          className="ml-3 -mr-1 -mt-1 p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

