import { useState, useEffect, useMemo } from 'react';
import { Bell, Check, X, Info, CheckCheck, Filter } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import { 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead,
  NOTIFICATION_TYPES 
} from '../../lib/notificationService';
import { formatRelativeTime, formatDateTime } from '../../lib/utils';
import LoadingSpinner from '../common/LoadingSpinner';

const FILTER_OPTIONS = [
  { id: 'all', label: '전체' },
  { id: NOTIFICATION_TYPES.APPROVAL, label: '승인' },
  { id: NOTIFICATION_TYPES.REJECTION, label: '반려' },
  { id: NOTIFICATION_TYPES.INFO, label: '안내' },
];

export default function NotificationsPage() {
  const { student } = useStudent();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!student?.id) return;

    const unsubscribe = subscribeToNotifications(student.id, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [student?.id]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  // Count by type
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      [NOTIFICATION_TYPES.APPROVAL]: notifications.filter(n => n.type === NOTIFICATION_TYPES.APPROVAL).length,
      [NOTIFICATION_TYPES.REJECTION]: notifications.filter(n => n.type === NOTIFICATION_TYPES.REJECTION).length,
      [NOTIFICATION_TYPES.INFO]: notifications.filter(n => n.type === NOTIFICATION_TYPES.INFO).length,
    };
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setExpandedId(expandedId === notification.id ? null : notification.id);
  };

  const handleMarkAllAsRead = async () => {
    if (student?.id && unreadCount > 0) {
      await markAllAsRead(student.id);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.APPROVAL:
        return <Check className="w-5 h-5 text-green-600" />;
      case NOTIFICATION_TYPES.REJECTION:
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationStyle = (type, isRead) => {
    const baseOpacity = isRead ? 'opacity-75' : 'opacity-100';
    switch (type) {
      case NOTIFICATION_TYPES.APPROVAL:
        return `border-l-4 border-l-green-500 ${baseOpacity}`;
      case NOTIFICATION_TYPES.REJECTION:
        return `border-l-4 border-l-red-500 ${baseOpacity}`;
      default:
        return `border-l-4 border-l-blue-500 ${baseOpacity}`;
    }
  };

  const getIconBgColor = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.APPROVAL:
        return 'bg-green-100';
      case NOTIFICATION_TYPES.REJECTION:
        return 'bg-red-100';
      default:
        return 'bg-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <LoadingSpinner message="알림을 불러오는 중..." />
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">알림</h1>
            <p className="text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount}개의 새로운 알림` : '새로운 알림이 없습니다'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#00b6b2] hover:bg-[#00b6b2]/10 rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            모두 읽음 처리
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              filter === option.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {option.label}
            {counts[option.id] > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                filter === option.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {counts[option.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Bell className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">
            {filter === 'all' ? '알림이 없습니다' : '해당 유형의 알림이 없습니다'}
          </p>
          {filter !== 'all' && (
            <button 
              onClick={() => setFilter('all')}
              className="mt-4 text-[#00b6b2] font-medium hover:underline"
            >
              전체 알림 보기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all ${getNotificationStyle(notification.type, notification.read)}`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl ${getIconBgColor(notification.type)} flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className={`text-base ${notification.read ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          expandedId === notification.id ? '' : 'line-clamp-2'
                        } ${notification.read ? 'text-slate-400' : 'text-slate-600'}`}>
                          {notification.message}
                        </p>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <div className="w-2.5 h-2.5 bg-[#00b6b2] rounded-full" />
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>{formatRelativeTime(notification.createdAt)}</span>
                      {notification.courseName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-slate-500">{notification.courseName}</span>
                        </>
                      )}
                    </div>

                    {/* Expanded content */}
                    {expandedId === notification.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-sm text-slate-500">
                          <span className="font-medium text-slate-700">상세 시간:</span>{' '}
                          {formatDateTime(notification.createdAt)}
                        </div>
                        {notification.courseId && (
                          <div className="text-sm text-slate-500 mt-1">
                            <span className="font-medium text-slate-700">강좌 ID:</span>{' '}
                            {notification.courseId}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
