'use client';

import { useState, useEffect } from 'react';
import { SearchOptions } from '@/lib/search';

interface SearchFiltersProps {
  onFiltersChange: (filters: Partial<SearchOptions>) => void;
  initialFilters?: Partial<SearchOptions>;
  className?: string;
}

export default function SearchFilters({ 
  onFiltersChange, 
  initialFilters = {},
  className = ""
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<Partial<SearchOptions>>({
    type: 'all',
    sortBy: 'relevance',
    ...initialFilters
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 필터 변경 시 부모 컴포넌트에 알림
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof SearchOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const resetFilters = () => {
    setFilters({
      type: 'all',
      sortBy: 'relevance'
    });
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">검색 필터</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showAdvanced ? '간단히 보기' : '고급 검색'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 검색 유형 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검색 유형
          </label>
          <select
            value={filters.type || 'all'}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">전체</option>
            <option value="announcements">공지사항</option>
            <option value="posts">익명게시판</option>
          </select>
        </div>

        {/* 정렬 기준 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            정렬 기준
          </label>
          <select
            value={filters.sortBy || 'relevance'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="relevance">관련도순</option>
            <option value="date">최신순</option>
            <option value="title">제목순</option>
          </select>
        </div>

        {/* 우선순위 (공지사항만) */}
        {filters.type === 'announcements' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              우선순위
            </label>
            <select
              value={filters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">전체</option>
              <option value="urgent">긴급</option>
              <option value="normal">일반</option>
            </select>
          </div>
        )}
      </div>

      {/* 고급 검색 옵션 */}
      {showAdvanced && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-800 mb-4">고급 검색 옵션</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 날짜 범위 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 날짜
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료 날짜
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* 작성자 (공지사항만) */}
            {filters.type === 'announcements' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작성자
                </label>
                <input
                  type="text"
                  value={filters.author || ''}
                  onChange={(e) => handleFilterChange('author', e.target.value || undefined)}
                  placeholder="작성자 이름 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {/* 결과 수 제한 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                결과 수 제한
              </label>
              <select
                value={filters.limit || ''}
                onChange={(e) => handleFilterChange('limit', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">제한 없음</option>
                <option value="10">10개</option>
                <option value="20">20개</option>
                <option value="50">50개</option>
                <option value="100">100개</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 필터 초기화 버튼 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
}
