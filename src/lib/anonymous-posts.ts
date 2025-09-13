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

// 익명 게시글 삭제
export async function deleteAnonymousPost(postId: number, authorEmployeeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_posts')
      .delete()
      .eq('id', postId)
      .eq('author_employee_id', authorEmployeeId);

    if (error) {
      console.error('익명 게시글 삭제 오류:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('익명 게시글 삭제 실패:', error);
    return false;
  }
}

// 게시글 투표 (좋아요/싫어요 토글)
export async function votePost(postId: number, voteType: 'like' | 'dislike' | null, userEmployeeId: string): Promise<{ success: boolean; newLikes: number; newDislikes: number; userVote: 'like' | 'dislike' | null }> {
  try {
    // 현재 사용자의 투표 상태 확인
    const { data: existingVote } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_employee_id', userEmployeeId)
      .single();

    // 현재 좋아요/싫어요 수를 가져옴
    const { data: currentData, error: fetchError } = await supabase
      .from('anonymous_posts')
      .select('likes, dislikes')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('게시글 투표 수 조회 오류:', fetchError);
      return { success: false, newLikes: 0, newDislikes: 0, userVote: null };
    }

    const currentLikes = currentData.likes || 0;
    const currentDislikes = currentData.dislikes || 0;
    const currentUserVote = existingVote?.vote_type || null;
    
    // 새로운 카운트 계산
    let newLikes = currentLikes;
    let newDislikes = currentDislikes;
    let newUserVote: 'like' | 'dislike' | null = null;
    
    if (voteType === 'like') {
      if (currentUserVote === 'like') {
        // 이미 좋아요를 눌렀다면 취소
        newLikes = currentLikes - 1;
        newUserVote = null;
      } else {
        // 좋아요 추가
        newLikes = currentLikes + 1;
        newUserVote = 'like';
        
        // 기존에 싫어요가 있었다면 취소
        if (currentUserVote === 'dislike') {
          newDislikes = currentDislikes - 1;
        }
      }
    } else if (voteType === 'dislike') {
      if (currentUserVote === 'dislike') {
        // 이미 싫어요를 눌렀다면 취소
        newDislikes = currentDislikes - 1;
        newUserVote = null;
      } else {
        // 싫어요 추가
        newDislikes = currentDislikes + 1;
        newUserVote = 'dislike';
        
        // 기존에 좋아요가 있었다면 취소
        if (currentUserVote === 'like') {
          newLikes = currentLikes - 1;
        }
      }
    }

    // 사용자 투표 상태 업데이트
    if (newUserVote === null) {
      // 투표 취소 - 기존 투표 삭제
      if (currentUserVote) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_employee_id', userEmployeeId);
      }
    } else {
      // 투표 추가/변경
      if (currentUserVote) {
        // 기존 투표 업데이트
        await supabase
          .from('post_votes')
          .update({ vote_type: newUserVote, updated_at: new Date().toISOString() })
          .eq('post_id', postId)
          .eq('user_employee_id', userEmployeeId);
      } else {
        // 새 투표 추가
        await supabase
          .from('post_votes')
          .insert({
            post_id: postId,
            user_employee_id: userEmployeeId,
            vote_type: newUserVote
          });
      }
    }

    // 게시글 좋아요/싫어요 수 업데이트
    const { error } = await supabase
      .from('anonymous_posts')
      .update({ 
        likes: newLikes,
        dislikes: newDislikes
      })
      .eq('id', postId);

    if (error) {
      console.error('게시글 투표 오류:', error);
      return { success: false, newLikes: currentLikes, newDislikes: currentDislikes, userVote: currentUserVote };
    }

    return { success: true, newLikes, newDislikes, userVote: newUserVote };
  } catch (error) {
    console.error('게시글 투표 중 오류 발생:', error);
    return { success: false, newLikes: 0, newDislikes: 0, userVote: null };
  }
}

// 사용자의 게시글 투표 상태 가져오기
export async function getUserPostVote(postId: number, userEmployeeId: string): Promise<'like' | 'dislike' | null> {
  try {
    const { data, error } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_employee_id', userEmployeeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 데이터가 없을 때 발생
      console.error('사용자 투표 상태 조회 오류:', error);
      return null;
    }

    return data?.vote_type || null;
  } catch (error) {
    console.error('사용자 투표 상태 조회 중 오류 발생:', error);
    return null;
  }
}

// 게시글 좋아요 (하위 호환성을 위해 유지)
export async function likePost(postId: number): Promise<boolean> {
  const result = await votePost(postId, 'like', '');
  return result.success;
}

// 게시글 싫어요 (하위 호환성을 위해 유지)
export async function dislikePost(postId: number): Promise<boolean> {
  const result = await votePost(postId, 'dislike', '');
  return result.success;
}

// 카테고리별 스타일 반환
export function getCategoryStyle(categoryName: string) {
  switch (categoryName) {
    case '자유게시판':
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        icon: '🗣️',
        borderColor: 'border-blue-200',
        focusRing: 'focus:ring-blue-500',
        hoverBg: 'hover:bg-blue-50'
      };
    case '건의사항':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: '💡',
        borderColor: 'border-green-200',
        focusRing: 'focus:ring-green-500',
        hoverBg: 'hover:bg-green-50'
      };
    case '일상공유':
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: '😊',
        borderColor: 'border-yellow-200',
        focusRing: 'focus:ring-yellow-500',
        hoverBg: 'hover:bg-yellow-50'
      };
    case '불만사항':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        icon: '😤',
        borderColor: 'border-red-200',
        focusRing: 'focus:ring-red-500',
        hoverBg: 'hover:bg-red-50'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        icon: '📝',
        borderColor: 'border-gray-200',
        focusRing: 'focus:ring-gray-500',
        hoverBg: 'hover:bg-gray-50'
      };
  }
}
