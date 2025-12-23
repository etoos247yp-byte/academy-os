import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../contexts/StudentContext';
import { 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead,
  NOTIFICATION_TYPES 
} from '../../lib/notificationService';
import { formatRelativeTime } from '../../lib/utils';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { student } = useStudent();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!student?.id) return;

    const unsubscribe = subscribeToNotifications(student.id, (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [student?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    if (student?.id && unreadCount > 0) {
      await markAllAsRead(student.id);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/student/notifications');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.APPROVAL:
        return <Check className="w-4 h-4 text-green-600" />;
      case NOTIFICATION_TYPES.REJECTION:
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getNotificationStyle = (type, isRead) => {
    const baseStyle = isRead ? 'bg-white' : 'bg-slate-50';
    switch (type) {
      case NOTIFICATION_TYPES.APPROVAL:
        return `${baseStyle} border-l-4 border-l-green-500`;
      case NOTIFICATION_TYPES.REJECTION:
        return `${baseStyle} border-l-4 border-l-red-500`;
      default:
        return `${baseStyle} border-l-4 border-l-blue-500`;
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        title="알림"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-gray-100">
            <h3 className="font-semibold text-slate-900">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-[#00b6b2] hover:text-[#009996] font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                모두 읽음
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">알림이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${getNotificationStyle(notification.type, notification.read)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        notification.type === NOTIFICATION_TYPES.APPROVAL 
                          ? 'bg-green-100' 
                          : notification.type === NOTIFICATION_TYPES.REJECTION 
                            ? 'bg-red-100' 
                            : 'bg-blue-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#00b6b2] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={handleViewAll}
                className="w-full px-4 py-3 text-sm font-medium text-[#00b6b2] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
              >
                전체 알림 보기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
