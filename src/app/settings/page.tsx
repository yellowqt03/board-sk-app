'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { getCurrentUser, isSuperAdmin, isAdmin, type User } from '@/lib/auth';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleOpenChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleCloseChangePassword = () => {
    setShowChangePasswordModal(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 네비게이션 바 */}
        <NavigationBar showUserInfo={true} />

        {/* 메인 컨텐츠 */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 페이지 헤더 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">⚙️ 설정</h1>
              <p className="text-gray-600">계정 설정 및 개인정보를 관리하세요.</p>
            </div>

            {/* 사용자 정보 */}
            {currentUser && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">👤 사용자 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">이름</label>
                    <p className="mt-1 text-gray-900">{currentUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">사번</label>
                    <p className="mt-1 text-gray-900">{currentUser.employee_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">이메일</label>
                    <p className="mt-1 text-gray-900">{currentUser.email || '미등록'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">권한</label>
                    <div className="mt-1">
                      {isSuperAdmin(currentUser) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">
                          최고 관리자
                        </span>
                      )}
                      {isAdmin(currentUser) && !isSuperAdmin(currentUser) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          관리자
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {currentUser.role === 'super_admin' ? '최고 관리자' :
                         currentUser.role === 'admin' ? '관리자' :
                         currentUser.role === 'moderator' ? '중간 관리자' : '일반 사용자'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 보안 설정 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔒 보안 설정</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">비밀번호 변경</h3>
                    <p className="text-sm text-gray-500">계정 보안을 위해 정기적으로 비밀번호를 변경하세요.</p>
                  </div>
                  <button
                    onClick={handleOpenChangePassword}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    변경
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">로그인 세션</h3>
                    <p className="text-sm text-gray-500">현재 로그인된 세션을 관리합니다.</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    활성
                  </span>
                </div>
              </div>
            </div>

            {/* 관리자 전용 섹션 */}
            {isAdmin(currentUser) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">👑 관리자 도구</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="/admin/users"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-900">사용자 관리</h3>
                    <p className="text-sm text-gray-500 mt-1">사용자 계정 및 권한을 관리합니다.</p>
                  </a>
                  <a
                    href="/admin/notification-dashboard"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-900">알림 관리</h3>
                    <p className="text-sm text-gray-500 mt-1">시스템 알림을 관리합니다.</p>
                  </a>
                </div>
              </div>
            )}

            {/* 알림 설정 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔔 알림 설정</h2>
              <div className="space-y-4">
                <a
                  href="/settings/notifications"
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-sm font-medium text-gray-900">알림 환경설정</h3>
                  <p className="text-sm text-gray-500 mt-1">받고 싶은 알림 유형을 설정하세요.</p>
                </a>
              </div>
            </div>
          </div>
        </main>

        {/* 비밀번호 변경 모달 */}
        {currentUser && (
          <ChangePasswordModal
            isOpen={showChangePasswordModal}
            onClose={handleCloseChangePassword}
            employeeId={currentUser.employee_id}
          />
        )}
      </div>
    </AuthGuard>
  );
}