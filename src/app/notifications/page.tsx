'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification
} from '@/lib/notifications';
import { formatTimeAgo } from '@/lib/announcements';
import Link from 'next/link';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'announcement' | 'comment' | 'system'>('all');

  // 알림 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUser(user);
        const notificationsData = await getUserNotifications(Number(user.id));
        setNotifications(notificationsData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // 알림 클릭 처리
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const success = await markNotificationAsRead(notification.id);
      if (success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
      }
    }

    // 관련 페이지로 이동
    if (notification.type === 'announcement' && notification.related_id) {
      router.push(`/announcement/${notification.related_id}`);
    } else if (notification.type === 'comment' && notification.related_id) {
      router.push(`/post/${notification.related_id}`);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    const success = await markAllNotificationsAsRead(Number(currentUser.id));
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
    }
  };

  // 필터링된 알림 목록
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    return notification.type === filter;
  });

  // 우선순위별 스타일
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'comment':
        return '🗨️';
      case 'keyword_alert':
        return '🔍';
      case 'system':
        return '⚙️';
      default:
        return '📄';
    }
  };

  // 타입별 이름
  const getTypeName = (type: string) => {
    switch (type) {
      case 'announcement':
        return '공지사항';
      case 'comment':
        return '댓글';
      case 'keyword_alert':
        return '키워드';
      case 'system':
        return '시스템';
      default:
        return '일반';
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <NavigationBar showUserInfo={true} />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">알림을 불러오는 중...</span>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <NavigationBar showUserInfo={true} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">🔔 알림</h1>
                  <p className="text-gray-600 mt-1">
                    총 {notifications.length}개의 알림 중 {notifications.filter(n => !n.is_read).length}개를 읽지 않았습니다
                  </p>
                </div>
                {notifications.some(n => !n.is_read) && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    모두 읽음
                  </button>
                )}
              </div>

              {/* 필터 탭 */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { key: 'all', label: '전체', count: notifications.length },
                  { key: 'unread', label: '읽지 않음', count: notifications.filter(n => !n.is_read).length },
                  { key: 'announcement', label: '공지사항', count: notifications.filter(n => n.type === 'announcement').length },
                  { key: 'comment', label: '댓글', count: notifications.filter(n => n.type === 'comment').length },
                  { key: 'system', label: '시스템', count: notifications.filter(n => n.type === 'system').length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                      filter === key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        filter === key
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 알림 목록 */}
            <div className="bg-white rounded-lg shadow">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🔔</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
                  </h3>
                  <p className="text-gray-600">
                    {filter === 'unread'
                      ? '모든 알림을 확인하셨습니다!'
                      : '새로운 알림이 오면 여기에 표시됩니다.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-6 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                        getPriorityStyle(notification.priority)
                      } ${!notification.is_read ? 'bg-blue-50' : 'bg-white'}`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <span className="text-2xl">
                            {getTypeIcon(notification.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>

                          {notification.content && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {notification.content}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-gray-100 rounded-full">
                                {getTypeName(notification.type)}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 rounded-full">
                                {notification.priority === 'urgent' ? '긴급' :
                                 notification.priority === 'high' ? '높음' :
                                 notification.priority === 'normal' ? '보통' : '낮음'}
                              </span>
                            </div>

                            <div className="text-xs text-gray-400">
                              {formatTimeAgo(notification.created_at)}
                              {notification.read_at && (
                                <span className="ml-2">
                                  • 읽음: {formatTimeAgo(notification.read_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <span className="text-gray-400">→</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 뒤로가기 버튼 */}
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                ← 메인 페이지로 돌아가기
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}