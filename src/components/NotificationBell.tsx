'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getUserNotifications, getUnreadNotificationCount, markNotificationAsRead, requestNotificationPermission, showBrowserNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: number;
  title: string;
  content?: string;
  type: 'announcement' | 'comment' | 'keyword_alert' | 'system';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  is_read: boolean;
  related_id?: number;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<{id: string, message: string, type: string}[]>([]);

  // 토스트 알림을 표시하는 함수
  const showToast = useCallback((message: string, type: string = 'info') => {
    const id = Date.now().toString();
    setToastNotifications(prev => [...prev, { id, message, type }]);

    // 5초 후 자동 제거
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  // 벨 흔들기 애니메이션
  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 1000);
  }, []);

  // 알림 데이터 로드
  const loadNotifications = useCallback(async () => {
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
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // 실시간 알림 구독
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('새 알림 수신:', payload);

          const newNotification = payload.new as Notification;

          // 알림 목록에 추가
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // 시각적 효과
          triggerShake();

          // 토스트 알림 표시
          showToast(`새 알림: ${newNotification.title}`, newNotification.priority);

          // 브라우저 알림 표시
          showBrowserNotification(newNotification.title, {
            body: newNotification.content || '새로운 알림이 도착했습니다.',
            icon: '/favicon.ico',
            tag: `notification-${newNotification.id}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('알림 업데이트:', payload);

          const updatedNotification = payload.new as Notification;

          // 알림 목록 업데이트
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );

          // 읽음 상태가 변경된 경우 읽지 않은 알림 수 업데이트
          if (updatedNotification.is_read && !payload.old?.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, triggerShake, showToast]);

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
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 text-gray-600 hover:text-gray-900 transition-all duration-300 ${
            isShaking ? 'animate-bounce' : ''
          } ${unreadCount > 0 ? 'text-red-500 hover:text-red-600' : ''}`}
        >
          <span className={`text-xl ${isShaking ? 'animate-pulse' : ''}`}>
            🔔
          </span>
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg animate-pulse ${
              unreadCount > 10 ? 'bg-red-600' : unreadCount > 5 ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">알림</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-600">
                      읽지 않은 알림 {unreadCount}개
                    </p>
                  )}
                </div>
                <Link
                  href="/notifications"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  모든 알림 보기
                </Link>
              </div>
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

      {/* 토스트 알림 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toastNotifications.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm max-w-sm transform transition-all duration-300 ease-in-out animate-slide-in-right ${
              toast.type === 'urgent' ? 'bg-red-600' :
              toast.type === 'high' ? 'bg-orange-500' :
              toast.type === 'normal' ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {toast.type === 'urgent' ? '🚨' :
                 toast.type === 'high' ? '⚠️' :
                 toast.type === 'normal' ? '📢' : '📄'}
              </span>
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => setToastNotifications(prev => prev.filter(t => t.id !== toast.id))}
                className="text-white hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 애니메이션을 위한 CSS 추가 */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
