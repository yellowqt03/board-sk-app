'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentUser, logout } from '@/lib/auth';
import { getAnnouncements, formatTimeAgo, getPriorityStyle, type Announcement } from '@/lib/announcements';
import Link from 'next/link';

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  // 공지사항 데이터 로드
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await getAnnouncements();
        setAnnouncements(data);
      } catch (error) {
        console.error('공지사항 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);


  // 로그아웃 처리
  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">💬 SK 톡톡</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    안녕하세요, <span className="font-medium">{currentUser.name}</span>님
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <div className="py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
                🏢 사내게시판
              </div>
              <Link
                href="/anonymous"
                className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                🔒 익명게시판
              </Link>
            </nav>
          </div>
        </div>

        {/* 공식 게시판 */}
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 공지사항</h2>
              
              {/* 공지사항 목록 */}
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">공지사항을 불러오는 중...</span>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>등록된 공지사항이 없습니다.</p>
                  </div>
                ) : (
                  announcements.map((announcement) => {
                    const style = getPriorityStyle(announcement.priority);
                    return (
                      <Link
                        key={announcement.id}
                        href={`/announcement/${announcement.id}`}
                        className={`border-l-4 ${style.borderColor} ${style.bgColor} p-4 rounded cursor-pointer hover:shadow-md transition-shadow block`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium ${style.textColor} flex items-center`}>
                              <span className="mr-2">{style.icon}</span>
                              {announcement.title}
                            </h3>
                            <p className={`text-sm ${style.textColor.replace('800', '600')} mt-1 line-clamp-2`}>
                              {announcement.content}
                            </p>
                            {announcement.author && (
                              <p className="text-xs text-gray-500 mt-1">
                                작성자: {announcement.author.name}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs ${style.textColor.replace('800', '500')} ml-4`}>
                            {formatTimeAgo(announcement.created_at)}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* 부서별 공지 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏢 부서별 공지</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900">개발팀</h3>
                  <p className="text-sm text-gray-600 mt-1">새로운 프로젝트 시작</p>
                  <span className="text-xs text-gray-400">1시간 전</span>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900">마케팅팀</h3>
                  <p className="text-sm text-gray-600 mt-1">홍보 자료 제작 완료</p>
                  <span className="text-xs text-gray-400">2시간 전</span>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900">인사팀</h3>
                  <p className="text-sm text-gray-600 mt-1">신입사원 오리엔테이션</p>
                  <span className="text-xs text-gray-400">3시간 전</span>
                </div>
              </div>
            </div>
          </div>

      </main>

      {/* 하단 네비게이션 (모바일) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <div className="flex-1 py-3 px-4 text-center text-blue-600 border-t-2 border-blue-600">
            🏢 사내게시판
          </div>
          <Link
            href="/anonymous"
            className="flex-1 py-3 px-4 text-center text-gray-500"
          >
            🔒 익명게시판
          </Link>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
