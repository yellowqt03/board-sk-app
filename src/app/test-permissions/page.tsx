'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getCurrentUser, isSuperAdmin, isAdmin, type User } from '@/lib/auth';

export default function TestPermissionsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    if (user) {
      const results = [
        `사용자 정보: ${user.name} (사번: ${user.employee_id})`,
        `Role: ${user.role || 'undefined'}`,
        `is_admin: ${user.is_admin || false}`,
        `is_super_admin: ${user.is_super_admin || false}`,
        `isAdmin() 함수 결과: ${isAdmin(user)}`,
        `isSuperAdmin() 함수 결과: ${isSuperAdmin(user)}`,
      ];
      setTestResults(results);
    }
  }, []);

  const testChangePassword = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: currentUser.employee_id,
          currentPassword: 'wrong-password',
          newPassword: 'new-password'
        })
      });

      const data = await response.json();
      setTestResults(prev => [...prev, `비밀번호 변경 API 테스트: ${data.message}`]);
    } catch (error) {
      setTestResults(prev => [...prev, `비밀번호 변경 API 오류: ${error}`]);
    }
  };

  const testUserManagement = async () => {
    try {
      const response = await fetch('/api/admin/users?page=1&limit=5');
      const data = await response.json();

      if (data.success) {
        setTestResults(prev => [...prev, `사용자 관리 API 테스트: 성공 (${data.data.users.length}명 조회)`]);
      } else {
        setTestResults(prev => [...prev, `사용자 관리 API 테스트: 실패 - ${data.message}`]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `사용자 관리 API 오류: ${error}`]);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <NavigationBar showUserInfo={true} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">🧪 권한 시스템 테스트</h1>

              {currentUser ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold mb-2">현재 사용자 정보</h2>
                    <ul className="space-y-1 text-sm">
                      {testResults.map((result, index) => (
                        <li key={index} className="font-mono">{result}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={testChangePassword}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      비밀번호 변경 API 테스트
                    </button>

                    <button
                      onClick={testUserManagement}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      사용자 관리 API 테스트
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <a
                      href="/settings"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <h3 className="font-medium">설정 페이지</h3>
                      <p className="text-sm text-gray-500">비밀번호 변경 등</p>
                    </a>

                    {isAdmin(currentUser) && (
                      <a
                        href="/admin/users"
                        className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <h3 className="font-medium">사용자 관리</h3>
                        <p className="text-sm text-gray-500">권한 관리 (관리자 전용)</p>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p>로그인이 필요합니다.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}