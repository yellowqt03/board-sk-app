'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import SearchBar from '@/components/SearchBar';
import { getAnonymousPosts, getPostCountsByCategory, getCategoryStyle, formatTimeAgo, type AnonymousPost } from '@/lib/anonymous-posts';
import Link from 'next/link';

export default function AnonymousBoardPage() {
  const [anonymousPosts, setAnonymousPosts] = useState<AnonymousPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<AnonymousPost[]>([]);
  const [searchFilteredPosts, setSearchFilteredPosts] = useState<AnonymousPost[]>([]);
  const [postCounts, setPostCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;

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
        setSearchFilteredPosts(posts);
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
      setSearchFilteredPosts(anonymousPosts);
    } else {
      // 다른 카테고리 클릭 시 필터링
      setSelectedCategory(categoryId);
      const filtered = anonymousPosts.filter(post => post.category_id === categoryId);
      setFilteredPosts(filtered);
      setSearchFilteredPosts(filtered);
    }
    setCurrentPage(1); // 카테고리 변경 시 첫 페이지로
  };

  // 익명 게시판 검색 처리
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchFilteredPosts(filteredPosts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = filteredPosts.filter(post => 
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query)
    );
    setSearchFilteredPosts(filtered);
    setCurrentPage(1); // 검색 시 첫 페이지로
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(searchFilteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = searchFilteredPosts.slice(startIndex, endIndex);

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 네비게이션 바 */}
        <NavigationBar showUserInfo={false} />

        {/* 메인 컨텐츠 */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* 검색 바 */}
            <div className="bg-white rounded-lg shadow p-6">
              <SearchBar
                placeholder="익명게시판에서 검색하세요..."
                onSearch={handleSearch}
                className="max-w-2xl mx-auto"
              />
            </div>
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
                        setSearchFilteredPosts(anonymousPosts);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      전체 보기
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {currentPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>등록된 게시글이 없습니다.</p>
                    </div>
                  ) : (
                    currentPosts.map((post) => {
                      const style = getCategoryStyle(post.category?.name || '');
                      return (
                        <Link
                          key={post.id}
                          href={`/post/${post.id}`}
                          className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer block"
                        >
                          {/* 웹 버전: 한 줄 레이아웃 */}
                          <div className="hidden md:flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${style.bgColor} ${style.textColor} whitespace-nowrap`}>
                                {style.icon} {post.category?.name}
                              </span>
                              <h3 className="text-sm font-medium text-gray-900 flex-1">
                                {post.title}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatTimeAgo(post.created_at)}
                              </span>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>👍 {post.likes}</span>
                                <span>👎 {post.dislikes}</span>
                              </div>
                            </div>
                          </div>

                          {/* 모바일 버전: 두 줄 레이아웃 */}
                          <div className="md:hidden">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mb-2">
                              {post.title}
                            </h3>
                            <div className="flex items-center space-x-2">
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
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm border rounded-lg ${
                          currentPage === page
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}