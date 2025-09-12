'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import SearchFilters from '@/components/SearchFilters';
import SearchResults from '@/components/SearchResults';
import { SearchOptions, SearchResult, searchAll } from '@/lib/search';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchOptions>>({
    type: 'all',
    sortBy: 'relevance'
  });

  // URL에서 검색어 가져오기
  useEffect(() => {
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      setQuery(searchQuery);
      performSearch(searchQuery, filters);
    }
  }, [searchParams]);

  // 검색 실행
  const performSearch = async (searchQuery: string, searchFilters: Partial<SearchOptions>) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchOptions: SearchOptions = {
        query: searchQuery,
        ...searchFilters
      };

      const searchResults = await searchAll(searchOptions);
      setResults(searchResults);
    } catch (error) {
      console.error('검색 실패:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색어 변경 처리
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery, filters);
  };

  // 필터 변경 처리
  const handleFiltersChange = (newFilters: Partial<SearchOptions>) => {
    setFilters(newFilters);
    if (query) {
      performSearch(query, newFilters);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">검색</h1>
          <p className="text-gray-600">공지사항과 익명게시판에서 원하는 내용을 검색하세요.</p>
        </div>

        {/* 검색 바 */}
        <div className="mb-8">
          <SearchBar
            placeholder="제목, 내용, 작성자로 검색하세요..."
            onSearch={handleSearch}
            className="max-w-2xl"
          />
        </div>

        {/* 검색 필터 */}
        <div className="mb-8">
          <SearchFilters
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
          />
        </div>

        {/* 검색 결과 */}
        <SearchResults
          results={results}
          searchQuery={query}
          isLoading={isLoading}
        />

        {/* 검색 팁 */}
        {query && results.length > 0 && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 검색 팁</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h4 className="font-medium mb-2">더 정확한 검색을 위해:</h4>
                <ul className="space-y-1">
                  <li>• 구체적인 키워드를 사용하세요</li>
                  <li>• 여러 단어로 검색해보세요</li>
                  <li>• 고급 검색으로 필터를 설정하세요</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">검색 결과 이해하기:</h4>
                <ul className="space-y-1">
                  <li>• 🚨 긴급 공지사항은 우선 표시됩니다</li>
                  <li>• 관련도순으로 정렬됩니다</li>
                  <li>• 매칭된 부분이 하이라이트됩니다</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">검색 페이지를 불러오는 중...</span>
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
