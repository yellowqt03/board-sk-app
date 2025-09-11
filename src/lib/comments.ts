import { supabase } from './supabase';

export interface Comment {
  id: number;
  post_id: number;
  author_employee_id: string;
  content: string;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
  author: {
    name: string;
  };
}

export interface CommentWithAuthor extends Comment {
  author: {
    name: string;
  };
}

// 댓글 조회 (특정 게시글의 댓글들)
export async function getCommentsByPostId(postId: number): Promise<CommentWithAuthor[]> {
  try {
    const { data, error } = await supabase
      .from('anonymous_comments')
      .select(`
        *,
        author:employee_master(name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('댓글 조회 오류:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('댓글 조회 중 오류 발생:', error);
    return [];
  }
}

// 댓글 작성
export async function createComment(
  postId: number,
  authorEmployeeId: string,
  content: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_comments')
      .insert({
        post_id: postId,
        author_employee_id: authorEmployeeId,
        content: content.trim(),
        likes: 0,
        dislikes: 0
      });

    if (error) {
      console.error('댓글 작성 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('댓글 작성 중 오류 발생:', error);
    return false;
  }
}

// 댓글 삭제 (작성자 본인만)
export async function deleteComment(commentId: number, authorEmployeeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_employee_id', authorEmployeeId);

    if (error) {
      console.error('댓글 삭제 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('댓글 삭제 중 오류 발생:', error);
    return false;
  }
}

// 댓글 투표 (좋아요/싫어요 토글)
export async function voteComment(commentId: number, voteType: 'like' | 'dislike' | null): Promise<{ success: boolean; newLikes: number; newDislikes: number }> {
  try {
    // 현재 좋아요/싫어요 수를 가져옴
    const { data: currentData, error: fetchError } = await supabase
      .from('anonymous_comments')
      .select('likes, dislikes')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('댓글 투표 수 조회 오류:', fetchError);
      return { success: false, newLikes: 0, newDislikes: 0 };
    }

    const currentLikes = currentData.likes || 0;
    const currentDislikes = currentData.dislikes || 0;
    
    // 새로운 카운트 계산
    let newLikes = currentLikes;
    let newDislikes = currentDislikes;
    
    if (voteType === 'like') {
      // 좋아요 버튼 클릭
      if (currentLikes > 0) {
        // 이미 좋아요가 있다면 취소 (감소)
        newLikes = currentLikes - 1;
      } else {
        // 좋아요가 없다면 추가 (증가)
        newLikes = currentLikes + 1;
        // 싫어요가 있다면 1 감소
        if (currentDislikes > 0) {
          newDislikes = currentDislikes - 1;
        }
      }
    } else if (voteType === 'dislike') {
      // 싫어요 버튼 클릭
      if (currentDislikes > 0) {
        // 이미 싫어요가 있다면 취소 (감소)
        newDislikes = currentDislikes - 1;
      } else {
        // 싫어요가 없다면 추가 (증가)
        newDislikes = currentDislikes + 1;
        // 좋아요가 있다면 1 감소
        if (currentLikes > 0) {
          newLikes = currentLikes - 1;
        }
      }
    } else {
      // 투표 취소 (현재 상태에 따라 감소)
      return { success: true, newLikes: currentLikes, newDislikes: currentDislikes };
    }

    // 데이터베이스 업데이트
    const { error } = await supabase
      .from('anonymous_comments')
      .update({ 
        likes: newLikes,
        dislikes: newDislikes
      })
      .eq('id', commentId);

    if (error) {
      console.error('댓글 투표 오류:', error);
      return { success: false, newLikes: currentLikes, newDislikes: currentDislikes };
    }

    return { success: true, newLikes, newDislikes };
  } catch (error) {
    console.error('댓글 투표 중 오류 발생:', error);
    return { success: false, newLikes: 0, newDislikes: 0 };
  }
}

// 댓글 좋아요 (하위 호환성을 위해 유지)
export async function likeComment(commentId: number): Promise<boolean> {
  const result = await voteComment(commentId, 'like');
  return result.success;
}

// 댓글 싫어요 (하위 호환성을 위해 유지)
export async function dislikeComment(commentId: number): Promise<boolean> {
  const result = await voteComment(commentId, 'dislike');
  return result.success;
}

// 시간 포맷팅 (기존 함수와 동일)
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
