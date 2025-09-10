'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getAnonymousPosts, getPostCountsByCategory, getCategoryStyle, formatTimeAgo, type AnonymousPost } from '@/lib/anonymous-posts';
import Link from 'next/link';

export default function AnonymousBoardPage() {
  const router = useRouter();
  const [anonymousPosts, setAnonymousPosts] = useState<AnonymousPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<AnonymousPost[]>([]);
  const [postCounts, setPostCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

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
        setFilteredPosts(posts);
        setPostCounts(counts);
      } catch (error) {
        console.error('익명 게시판 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnonymousData();
  }, []);

  // 카테고리 필터링
  const handleCategoryClick = (categoryId: number) => {
    if (selectedCategory === categoryId) {
      // 같은 카테고리 클릭 시 전체 보기
      setSelectedCategory(null);
      setFilteredPosts(anonymousPosts);
    } else {
      // 다른 카테고리 클릭 시 필터링
      setSelectedCategory(categoryId);
      const filtered = anonymousPosts.filter(post => post.category_id === categoryId);
      setFilteredPosts(filtered);
    }
  };

  // 뒤로가기
  const handleBack = () => {
    router.push('/');
  };

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
                  <button
                    onClick={() => handleCategoryClick(4)}
                    className={`border rounded-lg p-4 hover:shadow-md transition-all text-left ${
                      selectedCategory === 4 ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 flex items-center">
                      🗣️ 자유게시판
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[4] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">자유로운 의견을 나누는 공간</p>
                  </button>
                  
                  {/* 건의사항 */}
                  <button
                    onClick={() => handleCategoryClick(5)}
                    className={`border rounded-lg p-4 hover:shadow-md transition-all text-left ${
                      selectedCategory === 5 ? 'ring-2 ring-green-500 bg-green-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 flex items-center">
                      💡 건의사항
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[5] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">회사 개선을 위한 건의사항</p>
                  </button>
                  
                  {/* 일상공유 */}
                  <button
                    onClick={() => handleCategoryClick(6)}
                    className={`border rounded-lg p-4 hover:shadow-md transition-all text-left ${
                      selectedCategory === 6 ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 flex items-center">
                      😊 일상공유
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[6] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">일상적인 이야기를 나누는 공간</p>
                  </button>
                  
                  {/* 불만사항 */}
                  <button
                    onClick={() => handleCategoryClick(7)}
                    className={`border rounded-lg p-4 hover:shadow-md transition-all text-left ${
                      selectedCategory === 7 ? 'ring-2 ring-red-500 bg-red-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 flex items-center">
                      😤 불만사항
                      <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {postCounts[7] || 0}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">건설적인 불만사항을 제기하는 공간</p>
                  </button>
                </div>
              )}
            </div>

            {/* 필터링된 게시글 목록 */}
            {!loading && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    📝 {selectedCategory ? '카테고리별 게시글' : '최근 게시글'}
                  </h2>
                  {selectedCategory && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setFilteredPosts(anonymousPosts);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      전체 보기
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {filteredPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>등록된 게시글이 없습니다.</p>
                    </div>
                  ) : (
                    filteredPosts.map((post) => {
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
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}