'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface NotificationStats {
  metric_name: string;
  metric_value: number;
  description: string;
}

interface CleanupStats {
  metric_name: string;
  current_value: number;
  description: string;
}

interface RealtimeData {
  totalNotifications: number;
  unreadNotifications: number;
  urgentNotifications: number;
  todayNotifications: number;
}

export default function NotificationDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [performanceStats, setPerformanceStats] = useState<NotificationStats[]>([]);
  const [cleanupStats, setCleanupStats] = useState<CleanupStats[]>([]);
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({
    totalNotifications: 0,
    unreadNotifications: 0,
    urgentNotifications: 0,
    todayNotifications: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserAndStats();
    setupRealtimeSubscription();
  }, []);

  const loadUserAndStats = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // 관리자 권한 확인
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (!userData?.is_admin) {
        router.push('/');
        return;
      }

      setUser(currentUser);
      await refreshStats();
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      // 성능 통계 가져오기
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('get_notification_performance_stats');

      if (performanceError) {
        console.error('성능 통계 조회 실패:', performanceError);
      } else {
        setPerformanceStats(performanceData || []);
      }

      // 정리 상태 가져오기
      const { data: cleanupData, error: cleanupError } = await supabase
        .rpc('get_cleanup_status');

      if (cleanupError) {
        console.error('정리 상태 조회 실패:', cleanupError);
      } else {
        setCleanupStats(cleanupData || []);
      }

      // 실시간 데이터 업데이트
      await updateRealtimeData();

    } catch (error) {
      console.error('통계 새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updateRealtimeData = async () => {
    try {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, is_read, priority, created_at');

      if (notifications) {
        const today = new Date().toDateString();
        setRealtimeData({
          totalNotifications: notifications.length,
          unreadNotifications: notifications.filter(n => !n.is_read).length,
          urgentNotifications: notifications.filter(n => n.priority === 'urgent').length,
          todayNotifications: notifications.filter(n =>
            new Date(n.created_at).toDateString() === today
          ).length
        });
      }
    } catch (error) {
      console.error('실시간 데이터 업데이트 실패:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notification-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        updateRealtimeData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const executeCleanup = async () => {
    if (!confirm('알림 정리 작업을 실행하시겠습니까? 이 작업은 시간이 걸릴 수 있습니다.')) {
      return;
    }

    try {
      setRefreshing(true);
      const { error } = await supabase.rpc('execute_notification_cleanup');

      if (error) {
        console.error('정리 작업 실패:', error);
        alert('정리 작업 실행 중 오류가 발생했습니다.');
      } else {
        alert('정리 작업이 성공적으로 완료되었습니다.');
        await refreshStats();
      }
    } catch (error) {
      console.error('정리 작업 실행 실패:', error);
      alert('정리 작업 실행 중 오류가 발생했습니다.');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <NavigationBar showUserInfo={true} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">대시보드를 불러오는 중...</span>
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 헤더 */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 알림 시스템 대시보드</h1>
              <p className="text-gray-600 mt-2">실시간 알림 통계 및 시스템 모니터링</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={refreshStats}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <span className="mr-2">🔄</span>
                )}
                새로고침
              </button>
              <button
                onClick={executeCleanup}
                disabled={refreshing}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                <span className="mr-2">🧹</span>
                정리 실행
              </button>
            </div>
          </div>

          {/* 실시간 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">📝</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">전체 알림</p>
                  <p className="text-2xl font-semibold text-gray-900">{realtimeData.totalNotifications.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-semibold">👁️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">읽지 않음</p>
                  <p className="text-2xl font-semibold text-gray-900">{realtimeData.unreadNotifications.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-sm font-semibold">🚨</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">긴급 알림</p>
                  <p className="text-2xl font-semibold text-gray-900">{realtimeData.urgentNotifications.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-semibold">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">오늘 생성</p>
                  <p className="text-2xl font-semibold text-gray-900">{realtimeData.todayNotifications.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 성능 통계 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">⚡ 성능 통계</h2>
                <p className="text-sm text-gray-500">알림 시스템의 전반적인 성능 지표</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {performanceStats.map((stat, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{stat.metric_name}</p>
                        <p className="text-xs text-gray-500">{stat.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-blue-600">
                          {stat.metric_name.includes('시간')
                            ? `${Math.round(stat.metric_value || 0)}초`
                            : (stat.metric_value || 0).toLocaleString()
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 정리 상태 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">🧹 정리 상태</h2>
                <p className="text-sm text-gray-500">알림 정리 및 보관 현황</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {cleanupStats.map((stat, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {stat.metric_name.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">{stat.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${
                          stat.metric_name.includes('읽지않은') || stat.metric_name.includes('정리_대상')
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}>
                          {stat.metric_name.includes('마지막_정리_실행')
                            ? `${stat.current_value}일 전`
                            : stat.current_value.toLocaleString()
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 도움말 */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 대시보드 사용법</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <strong>실시간 모니터링:</strong>
                <p>상단 카드들은 실시간으로 업데이트되며 새로운 알림이 생성되면 자동으로 반영됩니다.</p>
              </div>
              <div>
                <strong>성능 통계:</strong>
                <p>알림 시스템의 전반적인 성능과 사용자 반응 시간을 모니터링할 수 있습니다.</p>
              </div>
              <div>
                <strong>정리 상태:</strong>
                <p>오래된 알림의 정리가 필요한지 확인하고 수동으로 정리 작업을 실행할 수 있습니다.</p>
              </div>
              <div>
                <strong>정리 실행:</strong>
                <p>'정리 실행' 버튼을 클릭하면 설정된 정책에 따라 오래된 알림이 자동으로 정리됩니다.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}