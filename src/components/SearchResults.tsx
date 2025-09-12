'use client';

import { SearchResult } from '@/lib/search';
import { highlightSearchTerm, getSearchSummary } from '@/lib/search';
import { formatTimeAgo } from '@/lib/announcements';

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  isLoading?: boolean;
  className?: string;
}

export default function SearchResults({ 
  results, 
  searchQuery, 
  isLoading = false,
  className = ""
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">검색 중...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500">
            '{searchQuery}'에 대한 검색 결과를 찾을 수 없습니다.
          </p>
          <div className="mt-4 text-sm text-gray-400">
            <p>• 다른 검색어를 시도해보세요</p>
            <p>• 검색어의 철자를 확인해보세요</p>
            <p>• 더 일반적인 단어로 검색해보세요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 검색 결과 헤더 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          검색 결과
        </h2>
        <p className="text-gray-600">
          '{searchQuery}'에 대한 검색 결과 <span className="font-medium text-blue-600">{results.length}개</span>를 찾았습니다.
        </p>
      </div>

      {/* 검색 결과 목록 */}
      <div className="space-y-4">
        {results.map((result) => (
          <SearchResultItem 
            key={`${result.type}-${result.id}`} 
            result={result} 
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}

// 개별 검색 결과 아이템 컴포넌트
function SearchResultItem({ result, searchQuery }: { result: SearchResult; searchQuery: string }) {
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'announcement':
        return {
          label: '공지사항',
          icon: '📢',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
      case 'post':
        return {
          label: '익명게시판',
          icon: '🔒',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800'
        };
      default:
        return {
          label: '기타',
          icon: '📄',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800'
        };
    }
  };

  const typeInfo = getTypeInfo(result.type);
  const summary = getSearchSummary(result.content, searchQuery, 200);
  const highlightedTitle = highlightSearchTerm(result.title, searchQuery);
  const highlightedSummary = highlightSearchTerm(summary, searchQuery);

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${typeInfo.bgColor} ${typeInfo.borderColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{typeInfo.icon}</span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor}`}>
            {typeInfo.label}
          </span>
          {result.priority === 'urgent' && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
              🚨 긴급
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {formatTimeAgo(result.created_at)}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-2 hover:text-blue-600 transition-colors">
        <a 
          href={`/${result.type === 'announcement' ? 'announcement' : 'post'}/${result.id}`}
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />
      </h3>

      <div className="text-gray-600 mb-3">
        <p 
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedSummary }}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          {result.author && (
            <span>작성자: {result.author}</span>
          )}
          {result.category && (
            <span>카테고리: {result.category}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {result.likes !== undefined && (
            <span className="flex items-center">
              👍 {result.likes}
            </span>
          )}
          {result.dislikes !== undefined && (
            <span className="flex items-center">
              👎 {result.dislikes}
            </span>
          )}
          {result.matchedFields.length > 0 && (
            <span className="text-xs text-blue-600">
              {result.matchedFields.includes('title') ? '제목' : ''}
              {result.matchedFields.includes('title') && result.matchedFields.includes('content') ? ', ' : ''}
              {result.matchedFields.includes('content') ? '내용' : ''} 매칭
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
