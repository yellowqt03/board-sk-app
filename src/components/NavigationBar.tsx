'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, logout, type User } from '@/lib/auth';
import { displayEmployeeId } from '@/lib/utils';
import NotificationBell from './NotificationBell';

interface NavigationBarProps {
  showUserInfo?: boolean; // 메인 페이지에서만 true
}

export default function NavigationBar({ showUserInfo = false }: NavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">💬 SK 톡톡</h1>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 뒤로가기 버튼 (메인 페이지가 아닐 때만) */}
          <div className="flex items-center">
            {pathname !== '/' && (
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-2 sm:mr-4 min-w-0"
              >
                <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">뒤로 가기</span>
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="text-lg sm:text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors truncate"
            >
              💬 SK 톡톡
            </button>
          </div>

          {/* 오른쪽: 사용자 정보, 알림, 로그아웃 */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {showUserInfo && user && (
              <>
                {/* 데스크톱용 사용자 정보 */}
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-gray-500">
                      사번: {displayEmployeeId(user.employee_id)}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-sm">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                </div>

                {/* 모바일용 간단한 사용자 정보 */}
                <div className="sm:hidden flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-sm">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* 알림 벨 */}
            <NotificationBell />

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="px-2 py-2 sm:px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">로그아웃</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
