import { supabase } from './supabase';
import { validateSearchQuery } from './validation';
import { type Announcement } from './announcements';
import { type AnonymousPost } from './anonymous-posts';

// 검색 결과 타입 정의
export interface SearchResult {
  type: 'announcement' | 'post';
  id: number;
  title: string;
  content: string;
  author?: string;
  category?: string;
  priority?: 'urgent' | 'normal';
  likes?: number;
  dislikes?: number;
  created_at: string;
  // 검색 관련
  matchedFields: string[];
  relevanceScore: number;
}

// 검색 옵션 타입
export interface SearchOptions {
  query: string;
  type?: 'all' | 'announcements' | 'posts';
  category?: number;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: 'urgent' | 'normal';
  sortBy?: 'relevance' | 'date' | 'title';
  limit?: number;
}

// 공지사항 검색
export async function searchAnnouncements(options: SearchOptions): Promise<SearchResult[]> {
  // 검색어 유효성 검사
  if (options.query) {
    const validation = validateSearchQuery(options.query);
    if (!validation.isValid) {
      throw new Error(validation.error || '유효하지 않은 검색어입니다.');
    }
    options.query = validation.sanitizedValue || options.query;
  }

  try {
    let query = supabase
      .from('announcements')
      .select(`
        *,
        author:employee_master(name, employee_id),
        category:board_categories(name)
      `);

    // 제목과 내용에서 검색
    if (options.query) {
      query = query.or(`title.ilike.%${options.query}%,content.ilike.%${options.query}%`);
    }

    // 카테고리 필터
    if (options.category) {
      query = query.eq('category_id', options.category);
    }

    // 작성자 필터
    if (options.author) {
      query = query.eq('author_id', options.author);
    }

    // 우선순위 필터
    if (options.priority) {
      query = query.eq('priority', options.priority);
    }

    // 날짜 범위 필터
    if (options.dateFrom) {
      query = query.gte('created_at', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('created_at', options.dateTo);
    }

    // 정렬
    if (options.sortBy === 'date') {
      query = query.order('created_at', { ascending: false });
    } else if (options.sortBy === 'title') {
      query = query.order('title', { ascending: true });
    } else {
      // 기본: 우선순위 -> 날짜
      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
    }

    // 제한
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('공지사항 검색 오류:', error);
      throw error;
    }

    // 검색 결과를 SearchResult 형태로 변환
    const results: SearchResult[] = (data || []).map((item: Announcement) => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // 제목 매칭 확인
      if (options.query && item.title.toLowerCase().includes(options.query.toLowerCase())) {
        matchedFields.push('title');
        relevanceScore += 3; // 제목 매칭은 높은 점수
      }

      // 내용 매칭 확인
      if (options.query && item.content.toLowerCase().includes(options.query.toLowerCase())) {
        matchedFields.push('content');
        relevanceScore += 1; // 내용 매칭은 낮은 점수
      }

      // 긴급 공지사항은 추가 점수
      if (item.priority === 'urgent') {
        relevanceScore += 2;
      }

      return {
        type: 'announcement',
        id: item.id,
        title: item.title,
        content: item.content,
        author: item.author?.name || '알 수 없음',
        category: item.category?.name || '전체',
        priority: item.priority,
        created_at: item.created_at,
        matchedFields,
        relevanceScore
      };
    });

    // 관련도 순으로 정렬 (relevance 정렬인 경우)
    if (options.sortBy === 'relevance') {
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return results;
  } catch (error) {
    console.error('공지사항 검색 실패:', error);
    return [];
  }
}

// 익명 게시글 검색
export async function searchPosts(options: SearchOptions): Promise<SearchResult[]> {
  // 검색어 유효성 검사
  if (options.query) {
    const validation = validateSearchQuery(options.query);
    if (!validation.isValid) {
      throw new Error(validation.error || '유효하지 않은 검색어입니다.');
    }
    options.query = validation.sanitizedValue || options.query;
  }

  try {
    let query = supabase
      .from('anonymous_posts')
      .select(`
        *,
        category:board_categories(name)
      `);

    // 제목과 내용에서 검색
    if (options.query) {
      query = query.or(`title.ilike.%${options.query}%,content.ilike.%${options.query}%`);
    }

    // 카테고리 필터
    if (options.category) {
      query = query.eq('category_id', options.category);
    }

    // 날짜 범위 필터
    if (options.dateFrom) {
      query = query.gte('created_at', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('created_at', options.dateTo);
    }

    // 정렬
    if (options.sortBy === 'date') {
      query = query.order('created_at', { ascending: false });
    } else if (options.sortBy === 'title') {
      query = query.order('title', { ascending: true });
    } else {
      // 기본: 날짜 순
      query = query.order('created_at', { ascending: false });
    }

    // 제한
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('익명 게시글 검색 오류:', error);
      throw error;
    }

    // 검색 결과를 SearchResult 형태로 변환
    const results: SearchResult[] = (data || []).map((item: AnonymousPost) => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // 제목 매칭 확인
      if (options.query && item.title.toLowerCase().includes(options.query.toLowerCase())) {
        matchedFields.push('title');
        relevanceScore += 3; // 제목 매칭은 높은 점수
      }

      // 내용 매칭 확인
      if (options.query && item.content.toLowerCase().includes(options.query.toLowerCase())) {
        matchedFields.push('content');
        relevanceScore += 1; // 내용 매칭은 낮은 점수
      }

      // 좋아요 수에 따른 추가 점수
      relevanceScore += Math.min(item.likes || 0, 5) * 0.1;

      return {
        type: 'post',
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category?.name || '자유게시판',
        likes: item.likes || 0,
        dislikes: item.dislikes || 0,
        created_at: item.created_at,
        matchedFields,
        relevanceScore
      };
    });

    // 관련도 순으로 정렬 (relevance 정렬인 경우)
    if (options.sortBy === 'relevance') {
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return results;
  } catch (error) {
    console.error('익명 게시글 검색 실패:', error);
    return [];
  }
}

// 통합 검색 (공지사항 + 익명 게시글)
export async function searchAll(options: SearchOptions): Promise<SearchResult[]> {
  try {
    const [announcements, posts] = await Promise.all([
      searchAnnouncements(options),
      searchPosts(options)
    ]);

    // 모든 결과를 합치고 정렬
    const allResults = [...announcements, ...posts];

    if (options.sortBy === 'relevance') {
      allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else if (options.sortBy === 'date') {
      allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (options.sortBy === 'title') {
      allResults.sort((a, b) => a.title.localeCompare(b.title));
    }

    // 제한 적용
    if (options.limit) {
      return allResults.slice(0, options.limit);
    }

    return allResults;
  } catch (error) {
    console.error('통합 검색 실패:', error);
    return [];
  }
}

// 검색 로그 저장
export async function logSearch(query: string, userId?: string): Promise<void> {
  try {
    await supabase
      .from('search_logs')
      .insert({
        query: query,
        user_id: userId,
        searched_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('검색 로그 저장 실패:', error);
  }
}

// 인기 검색어 가져오기
export async function getPopularSearchTerms(limit: number = 10): Promise<string[]> {
  try {
    // 지난 30일간의 검색 로그에서 인기 검색어 조회
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('search_logs')
      .select('query')
      .gte('searched_at', thirtyDaysAgo.toISOString())
      .order('searched_at', { ascending: false });

    if (error) {
      console.error('인기 검색어 조회 오류:', error);
      throw error;
    }

    // 검색어별 빈도 계산
    const queryCount = new Map<string, number>();
    data?.forEach(log => {
      const query = log.query.toLowerCase().trim();
      if (query.length >= 2) {
        queryCount.set(query, (queryCount.get(query) || 0) + 1);
      }
    });

    // 빈도순으로 정렬하여 반환
    return Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);

  } catch (error) {
    console.error('인기 검색어 조회 실패:', error);
    // 기본값 반환
    return [
      '회의',
      '휴가', 
      '급여',
      '복지',
      '교육',
      '프로젝트',
      '보고서',
      '회식',
      '출장',
      '퇴근'
    ].slice(0, limit);
  }
}

// 검색 제안 가져오기
export async function getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  // 검색어 유효성 검사
  const validation = validateSearchQuery(query);
  if (!validation.isValid) {
    return [];
  }

  const sanitizedQuery = validation.sanitizedValue || query;

  try {
    // 공지사항 제목에서 제안 가져오기
    const { data: announcementTitles } = await supabase
      .from('announcements')
      .select('title')
      .ilike('title', `%${sanitizedQuery}%`)
      .limit(limit);

    // 익명 게시글 제목에서 제안 가져오기
    const { data: postTitles } = await supabase
      .from('anonymous_posts')
      .select('title')
      .ilike('title', `%${sanitizedQuery}%`)
      .limit(limit);

    // 제안 목록 생성
    const suggestions = new Set<string>();
    
    announcementTitles?.forEach(item => {
      if (item.title.toLowerCase().includes(sanitizedQuery.toLowerCase())) {
        suggestions.add(item.title);
      }
    });

    postTitles?.forEach(item => {
      if (item.title.toLowerCase().includes(sanitizedQuery.toLowerCase())) {
        suggestions.add(item.title);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('검색 제안 가져오기 실패:', error);
    return [];
  }
}

// 검색 결과 하이라이트 함수
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
}

// 검색 결과 요약 함수
export function getSearchSummary(content: string, searchTerm: string, maxLength: number = 150): string {
  if (!searchTerm) {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }

  const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (index === -1) {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + searchTerm.length + 50);
  
  let summary = content.substring(start, end);
  if (start > 0) summary = '...' + summary;
  if (end < content.length) summary = summary + '...';
  
  return summary;
}
