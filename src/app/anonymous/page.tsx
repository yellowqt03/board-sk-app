'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getAnonymousPosts, getPostCountsByCategory, getCategoryStyle, formatTimeAgo, type AnonymousPost } from '@/lib/anonymous-posts';
import Link from 'next/link';

export default function AnonymousBoardPage() {
  const router = useRouter();
  const [anonymousPosts, setAnonymousPosts] = useState<AnonymousPost[]>([]);
  const [postCounts, setPostCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(true);

  // 익명 게시판 데이터 로드
  useEffect(() => {
    const loadAnonymousData = async () => {
      try {
        setLoading(true);
        const [posts, counts] = await Promise.all([
          getAnonymousPosts(),
          getPostCountsByCategory()
        ]);
        setAnonymousPosts(posts);
        setPostCounts(counts);
      } catch (error) {
        console.error('익명 게시판 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnonymousData();
  }, []);

  // 주의사항 확인 후 게시판 진입
  const handleEnterBoard = () => {
    setShowWarning(false);
  };

  // 뒤로가기 (익명게시판으로 돌아가기)
  const handleBack = () => {
    if (showWarning) {
      router.push('/');
    } else {
      setShowWarning(true);
    }
  };

  if (showWarning) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          {/* 헤더 */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  뒤로 가기
                </button>
                <h1 className="text-xl font-bold text-gray-900">💬 SK 톡톡</h1>
                <div className="w-20"></div>
              </div>
            </div>
          </header>

          {/* 주의사항 */}
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-4xl">⚠️</span>
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-yellow-800 mb-4">익명게시판 이용 시 주의사항</h2>
                  <div className="text-yellow-700 space-y-3">
                    <p className="text-lg">🔒 익명게시판은 자유로운 의견 교환을 위한 공간입니다.</p>
                    <p className="text-lg">⚠️ 하지만 다음 행위는 금지됩니다:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 text-base">
                      <li>지나친 비방 및 욕설</li>
                      <li>개인에 대한 마녀사냥</li>
                      <li>회사에 대한 근거 없는 비난</li>
                      <li>기타 부적절한 내용</li>
                    </ul>
                    <p className="text-lg mt-4">📋 관리자는 필요시 작성자를 확인할 수 있으니 주의하시기 바랍니다.</p>
                  </div>
                  <div className="mt-8 flex space-x-4">
                    <button
                      onClick={() => router.push('/')}
                      className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEnterBoard}
                      className="bg-yellow-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-yellow-700 transition-colors"
                    >
                      확인하고 입장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                뒤로 가기
              </button>
              <h1 className="text-xl font-bold text-gray-900">💬 SK 톡톡</h1>
              <div className="w-20"></div>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 익명 게시판 카테고리 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">🔒 익명 게시판</h2>
                <Link
                  href="/write"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center"
                >
                  <span className="mr-1">✍️</span>
                  글쓰기
                </Link>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-gray-600">게시판을 불러오는 중...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 자유게시판 */}
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-medium text-gray-900 flex items-center">
                      🗣️ 자유게시판
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[4] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">자유로운 의견을 나누는 공간</p>
                  </div>
                  
                  {/* 건의사항 */}
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-medium text-gray-900 flex items-center">
                      💡 건의사항
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[5] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">회사 개선을 위한 건의사항</p>
                  </div>
                  
                  {/* 일상공유 */}
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-medium text-gray-900 flex items-center">
                      😊 일상공유
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[6] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">일상적인 이야기를 나누는 공간</p>
                  </div>
                  
                  {/* 불만사항 */}
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <h3 className="font-medium text-gray-900 flex items-center">
                      😤 불만사항
                      <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[7] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">건설적인 불만사항을 제기하는 공간</p>
                  </div>
                </div>
              )}
            </div>

            {/* 최근 익명 게시글 */}
            {!loading && anonymousPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 최근 게시글</h2>
                <div className="space-y-3">
                  {anonymousPosts.slice(0, 5).map((post) => {
                    const style = getCategoryStyle(post.category?.name || '');
                    return (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer block"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                              {post.title}
                            </h3>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${style.bgColor} ${style.textColor}`}>
                                {style.icon} {post.category?.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(post.created_at)}
                              </span>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>👍 {post.likes}</span>
                                <span>👎 {post.dislikes}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
