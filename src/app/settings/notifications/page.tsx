'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
  type NotificationSettings
} from '@/lib/notifications';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    loadUserAndSettings();
  }, []);

  const loadUserAndSettings = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const userSettings = await getUserNotificationSettings(Number(currentUser.id));
      setSettings(userSettings || {
        id: 0,
        user_id: Number(currentUser.id),
        email_notifications: true,
        push_notifications: true,
        keyword_alerts: true,
        announcement_alerts: true,
        comment_alerts: true,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('설정 로드 실패:', error);
      showMessage('error', '설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;

    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const saveSettings = async () => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      const success = await updateUserNotificationSettings(Number(user.id), {
        email_notifications: settings.email_notifications,
        push_notifications: settings.push_notifications,
        keyword_alerts: settings.keyword_alerts,
        announcement_alerts: settings.announcement_alerts,
        comment_alerts: settings.comment_alerts
      });

      if (success) {
        showMessage('success', '설정이 성공적으로 저장되었습니다.');
      } else {
        showMessage('error', '설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      showMessage('error', '설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
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
              <span className="ml-3 text-gray-600">설정을 불러오는 중...</span>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🔔 알림 설정</h1>
            <p className="text-gray-600 mt-2">받고 싶은 알림 유형을 선택하세요.</p>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 알림 설정 */}
            <div className="lg:col-span-2 space-y-6">

              {/* 브라우저 알림 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">🖥️ 브라우저 알림</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">푸시 알림</h3>
                      <p className="text-sm text-gray-500">브라우저 팝업 알림을 받습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.push_notifications || false}
                        onChange={(e) => handleSettingChange('push_notifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 콘텐츠 알림 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 콘텐츠 알림</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">공지사항 알림</h3>
                      <p className="text-sm text-gray-500">새로운 공지사항이 등록될 때 알림</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.announcement_alerts || false}
                        onChange={(e) => handleSettingChange('announcement_alerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">댓글 알림</h3>
                      <p className="text-sm text-gray-500">내 게시글에 댓글이 달릴 때 알림</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.comment_alerts || false}
                        onChange={(e) => handleSettingChange('comment_alerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">키워드 알림</h3>
                      <p className="text-sm text-gray-500">관심 키워드가 포함된 게시글 알림</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.keyword_alerts || false}
                        onChange={(e) => handleSettingChange('keyword_alerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 이메일 알림 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📧 이메일 알림</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">이메일 알림</h3>
                      <p className="text-sm text-gray-500">중요한 알림을 이메일로도 받습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.email_notifications || false}
                        onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      저장 중...
                    </>
                  ) : (
                    '설정 저장'
                  )}
                </button>
              </div>
            </div>

            {/* 도움말 */}
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 알림 설정 도움말</h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <strong>푸시 알림:</strong> 브라우저가 열려있을 때 실시간으로 알림을 받습니다.
                  </div>
                  <div>
                    <strong>공지사항 알림:</strong> 새로운 공지사항이 등록되면 즉시 알림을 받습니다.
                  </div>
                  <div>
                    <strong>댓글 알림:</strong> 회원님이 작성한 게시글에 댓글이 달리면 알림을 받습니다.
                  </div>
                  <div>
                    <strong>이메일 알림:</strong> 긴급 공지사항 등 중요한 알림을 이메일로도 받습니다.
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ 주의사항</h3>
                <div className="space-y-2 text-sm text-yellow-800">
                  <div>• 브라우저 알림을 받으려면 브라우저에서 알림 권한을 허용해야 합니다.</div>
                  <div>• 설정 변경 후 반드시 '설정 저장' 버튼을 클릭해주세요.</div>
                  <div>• 알림이 너무 많다면 필요한 알림만 선택적으로 활성화하세요.</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}