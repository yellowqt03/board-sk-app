import { supabase } from './supabase';

// 익명 게시글 타입 정의
export interface AnonymousPost {
  id: number;
  title: string;
  content: string;
  category_id: number;
  author_employee_id: string;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  category?: {
    name: string;
  };
}

// 익명 게시글 목록 가져오기
export async function getAnonymousPosts(categoryId?: number): Promise<AnonymousPost[]> {
  try {
    let query = supabase
      .from('anonymous_posts')
      .select(`
        *,
        category:board_categories(name)
      `)
      .order('created_at', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('익명 게시글 조회 오류:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('익명 게시글 조회 실패:', error);
    return [];
  }
}

// 익명 게시글 상세 조회
export async function getAnonymousPostById(id: number): Promise<AnonymousPost | null> {
  try {
    const { data, error } = await supabase
      .from('anonymous_posts')
      .select(`
        *,
        category:board_categories(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('익명 게시글 상세 조회 오류:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('익명 게시글 상세 조회 실패:', error);
    return null;
  }
}

// 카테고리별 게시글 수 가져오기
export async function getPostCountsByCategory(): Promise<Record<number, number>> {
  try {
    const { data, error } = await supabase
      .from('anonymous_posts')
      .select('category_id')
      .gte('category_id', 4); // 익명 게시판 카테고리들 (4, 5, 6, 7)

    if (error) {
      console.error('카테고리별 게시글 수 조회 오류:', error);
      return {};
    }

    // 카테고리별 개수 계산
    const counts: Record<number, number> = {};
    data?.forEach(post => {
      counts[post.category_id] = (counts[post.category_id] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('카테고리별 게시글 수 조회 실패:', error);
    return {};
  }
}

// 시간 포맷팅 함수 (announcements.ts와 동일)
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  }
}

// 익명 게시글 작성
export async function createAnonymousPost(data: {
  title: string;
  content: string;
  category_id: number;
  author_employee_id: string;
}): Promise<AnonymousPost | null> {
  try {
    const { data: result, error } = await supabase
      .from('anonymous_posts')
      .insert(data)
      .select(`
        *,
        category:board_categories(name)
      `)
      .single();

    if (error) {
      console.error('익명 게시글 작성 오류:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('익명 게시글 작성 실패:', error);
    return null;
  }
}

// 카테고리별 스타일 반환
export function getCategoryStyle(categoryName: string) {
  switch (categoryName) {
    case '자유게시판':
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        icon: '🗣️'
      };
    case '건의사항':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: '💡'
      };
    case '일상공유':
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: '😊'
      };
    case '불만사항':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        icon: '😤'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        icon: '📝'
      };
  }
}
