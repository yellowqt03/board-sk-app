'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentUser } from '@/lib/auth';
import { createAnonymousPost, getCategoryStyle } from '@/lib/anonymous-posts';
import { supabase } from '@/lib/supabase';

interface BoardCategory {
  id: number;
  name: string;
  type: string;
}

export default function WritePage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: 4, // 기본값: 자유게시판
  });
  const [selectedCategoryName, setSelectedCategoryName] = useState('자유게시판');
  const [error, setError] = useState('');

  // 익명 게시판 카테고리 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('board_categories')
          .select('*')
          .eq('type', 'anonymous')
          .order('id');

        if (error) {
          console.error('카테고리 로드 오류:', error);
          return;
        }

        setCategories(data || []);
      } catch (err) {
        console.error('카테고리 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // 폼 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category_id' ? parseInt(value) : value
    }));
    if (error) setError('');
  };

  // 카테고리 선택 핸들러
  const handleCategorySelect = (categoryId: number, categoryName: string) => {
    setFormData(prev => ({
      ...prev,
      category_id: categoryId
    }));
    setSelectedCategoryName(categoryName);
    if (error) setError('');
  };

  // 게시글 작성 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    
    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    if (!currentUser) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const result = await createAnonymousPost({
        title: formData.title.trim(),
        content: formData.content.trim(),
        category_id: formData.category_id,
        author_employee_id: currentUser.employee_id,
      });

      if (!result) {
        setError('게시글 작성 중 오류가 발생했습니다.');
        return;
      }

      // 작성 완료 후 게시글 상세 페이지로 이동
      router.push(`/post/${result.id}`);
    } catch (err) {
      console.error('게시글 작성 실패:', err);
      setError('게시글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => router.back()}
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* 헤더 */}
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
              <h1 className="text-2xl font-bold text-purple-900 flex items-center">
                <span className="mr-3">✍️</span>
                익명 게시글 작성
              </h1>
              <p className="text-purple-700 mt-2">
                자유롭게 의견을 나누어보세요. 익명으로 작성됩니다.
              </p>
            </div>

            {/* 작성 폼 */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* 카테고리 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  카테고리 선택 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => {
                    const style = getCategoryStyle(category.name);
                    const isSelected = formData.category_id === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category.id, category.name)}
                        className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                          isSelected
                            ? `${style.bgColor} ${style.borderColor} border-opacity-100 ring-2 ${style.focusRing} ring-opacity-50`
                            : `bg-white border-gray-200 hover:${style.hoverBg} hover:${style.borderColor} hover:border-opacity-50`
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{style.icon}</span>
                          <div>
                            <h3 className={`font-medium ${isSelected ? style.textColor : 'text-gray-900'}`}>
                              {category.name}
                            </h3>
                            <p className={`text-xs mt-1 ${isSelected ? style.textColor : 'text-gray-500'}`}>
                              {category.name === '자유게시판' && '자유로운 의견을 나누는 공간'}
                              {category.name === '건의사항' && '회사 개선을 위한 건의사항'}
                              {category.name === '일상공유' && '일상적인 이야기를 나누는 공간'}
                              {category.name === '불만사항' && '건설적인 불만사항을 제기하는 공간'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 제목 입력 */}
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  제목 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="제목을 입력하세요"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    maxLength={200}
                  />
                  <div className="absolute right-3 top-3 text-xs text-gray-400">
                    {formData.title.length}/200
                  </div>
                </div>
              </div>

              {/* 내용 입력 */}
              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  내용 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    placeholder="내용을 입력하세요"
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {formData.content.length}자
                  </div>
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  선택된 카테고리: <span className="font-medium text-gray-900">{selectedCategoryName}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        작성 중...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">✍️</span>
                        게시글 작성
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
