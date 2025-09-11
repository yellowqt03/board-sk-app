'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getUserNotifications, getUnreadNotificationCount, markNotificationAsRead } from '@/lib/notifications';

interface Notification {
  id: number;
  title: string;
  content?: string;
  type: 'announcement' | 'keyword_alert' | 'system';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 알림 데이터 로드
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        setCurrentUser(user);
        
        const [notificationsData, unreadCountData] = await Promise.all([
          getUserNotifications(Number(user.id)),
          getUnreadNotificationCount(Number(user.id))
        ]);

        setNotifications(notificationsData);
        setUnreadCount(unreadCountData);
      } catch (error) {
        console.error('알림 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // 알림 클릭 처리
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const success = await markNotificationAsRead(notification.id);
      if (success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
    setIsOpen(false);
  };

  // 우선순위별 스타일
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'keyword_alert':
        return '🔍';
      case 'system':
        return '⚙️';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
          🔔
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* 오버레이 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 알림 드롭다운 */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-20 max-h-96 overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">알림</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600">
                  읽지 않은 알림 {unreadCount}개
                </p>
              )}
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  알림이 없습니다.
                </div>
              ) : (
                notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">
                        {getTypeIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {notification.content && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityStyle(notification.priority)}`}>
                            {notification.priority === 'urgent' ? '긴급' :
                             notification.priority === 'high' ? '높음' :
                             notification.priority === 'normal' ? '보통' : '낮음'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(notification.created_at).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
