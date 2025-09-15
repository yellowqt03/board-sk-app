'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getCurrentUser, isSuperAdmin, isAdmin, type User } from '@/lib/auth';

interface UserData {
  employee_id: string;
  role: string;
  is_admin: boolean;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
  employee_master: {
    name: string;
    email: string;
    department_id: string;
    position_id: string;
    is_active: boolean;
    status: string;
    departments: { name: string } | null;
    positions: { name: string } | null;
  };
}

interface UserListResponse {
  success: boolean;
  data: {
    users: UserData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    role: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 현재 사용자 정보 로드
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role })
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data: UserListResponse = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        setMessage({ type: 'error', text: '사용자 목록을 불러오는데 실패했습니다.' });
      }
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (currentUser && isAdmin(currentUser)) {
      loadUsers();
    }
  }, [currentUser, loadUsers]);

  // 권한 업데이트
  const updateUserRole = async (employeeId: string, newRole: string, is_admin: boolean, is_super_admin: boolean) => {
    if (!currentUser || !isSuperAdmin(currentUser)) {
      setMessage({ type: 'error', text: '최고 관리자만 권한을 변경할 수 있습니다.' });
      return;
    }

    try {
      setUpdating(employeeId);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-id': currentUser.employee_id
        },
        body: JSON.stringify({
          employeeId,
          role: newRole,
          is_admin,
          is_super_admin
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '권한이 성공적으로 업데이트되었습니다.' });
        await loadUsers(); // 목록 새로고침
      } else {
        setMessage({ type: 'error', text: data.message || '권한 업데이트에 실패했습니다.' });
      }
    } catch (error) {
      console.error('권한 업데이트 오류:', error);
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setUpdating(null);
    }
  };

  // 검색 처리
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 권한 확인
  if (!currentUser || !isAdmin(currentUser)) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
            <p className="text-gray-600">관리자만 접근할 수 있는 페이지입니다.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const getRoleBadge = (user: UserData) => {
    if (user.is_super_admin) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">최고 관리자</span>;
    }
    if (user.is_admin) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">관리자</span>;
    }
    if (user.role === 'moderator') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">중간 관리자</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">일반 사용자</span>;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 네비게이션 바 */}
        <NavigationBar showUserInfo={true} />

        {/* 메인 컨텐츠 */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 페이지 헤더 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">👥 사용자 관리</h1>
              <p className="text-gray-600">시스템 사용자들의 권한을 관리합니다.</p>
            </div>

            {/* 검색 및 필터 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="이름 또는 사번으로 검색..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">모든 권한</option>
                    <option value="super_admin">최고 관리자</option>
                    <option value="admin">관리자</option>
                    <option value="moderator">중간 관리자</option>
                    <option value="user">일반 사용자</option>
                  </select>
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  검색
                </button>
              </div>
            </div>

            {/* 메시지 표시 */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* 사용자 목록 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  사용자 목록 ({pagination.total}명)
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">사용자 목록을 불러오는 중...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          사용자
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          부서/직급
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          권한
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        {isSuperAdmin(currentUser) && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            관리
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.employee_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.employee_master.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                사번: {user.employee_id}
                              </div>
                              {user.employee_master.email && (
                                <div className="text-sm text-gray-500">
                                  {user.employee_master.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.employee_master.departments?.name || '미지정'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.employee_master.positions?.name || '미지정'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(user)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.employee_master.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.employee_master.is_active ? '활성' : '비활성'}
                            </span>
                          </td>
                          {isSuperAdmin(currentUser) && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.employee_id !== currentUser.employee_id && (
                                <div className="flex space-x-2">
                                  {!user.is_super_admin && (
                                    <button
                                      onClick={() => updateUserRole(user.employee_id, 'super_admin', true, true)}
                                      disabled={updating === user.employee_id}
                                      className="text-red-600 hover:text-red-900 text-xs disabled:opacity-50"
                                    >
                                      최고관리자
                                    </button>
                                  )}
                                  {!user.is_admin && !user.is_super_admin && (
                                    <button
                                      onClick={() => updateUserRole(user.employee_id, 'admin', true, false)}
                                      disabled={updating === user.employee_id}
                                      className="text-blue-600 hover:text-blue-900 text-xs disabled:opacity-50"
                                    >
                                      관리자
                                    </button>
                                  )}
                                  {(user.is_admin || user.is_super_admin) && (
                                    <button
                                      onClick={() => updateUserRole(user.employee_id, 'user', false, false)}
                                      disabled={updating === user.employee_id}
                                      className="text-gray-600 hover:text-gray-900 text-xs disabled:opacity-50"
                                    >
                                      일반사용자
                                    </button>
                                  )}
                                </div>
                              )}
                              {user.employee_id === currentUser.employee_id && (
                                <span className="text-xs text-gray-400">본인</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 페이지네이션 */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {pagination.total}명 중 {((pagination.page - 1) * pagination.limit) + 1}-
                      {Math.min(pagination.page * pagination.limit, pagination.total)}명 표시
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        이전
                      </button>
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm border rounded ${
                            pagination.page === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}