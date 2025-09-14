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
  parent_comment_id?: number;
  author: {
    name: string;
  };
}

export interface CommentWithAuthor extends Comment {
  author: {
    name: string;
  };
}

// 댓글 조회 (특정 게시글의 댓글들 - 계층형 구조)
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

    // 계층형 구조로 정렬 (부모 댓글 먼저, 그 다음 해당 부모의 대댓글들)
    const comments = data || [];
    const result: CommentWithAuthor[] = [];
    
    // 먼저 부모 댓글들을 추가
    const parentComments = comments.filter(comment => !comment.parent_comment_id);
    
    for (const parentComment of parentComments) {
      result.push(parentComment);
      
      // 해당 부모 댓글의 대댓글들을 찾아서 추가
      const replies = comments.filter(comment => comment.parent_comment_id === parentComment.id);
      result.push(...replies);
    }

    return result;
  } catch (error) {
    console.error('댓글 조회 중 오류 발생:', error);
    return [];
  }
}

// 댓글 작성 (일반 댓글 및 대댓글)
export async function createComment(
  postId: number,
  authorEmployeeId: string,
  content: string,
  parentCommentId?: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_comments')
      .insert({
        post_id: postId,
        author_employee_id: authorEmployeeId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
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
export async function voteComment(commentId: number, voteType: 'like' | 'dislike' | null, userEmployeeId: string): Promise<{ success: boolean; newLikes: number; newDislikes: number; userVote: 'like' | 'dislike' | null }> {
  try {
    // 현재 사용자의 투표 상태 확인
    const { data: existingVote } = await supabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', commentId)
      .eq('user_employee_id', userEmployeeId)
      .single();

    // 현재 좋아요/싫어요 수를 가져옴
    const { data: currentData, error: fetchError } = await supabase
      .from('anonymous_comments')
      .select('likes, dislikes')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('댓글 투표 수 조회 오류:', fetchError);
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
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_employee_id', userEmployeeId);
      }
    } else {
      // 투표 추가/변경
      if (currentUserVote) {
        // 기존 투표 업데이트
        await supabase
          .from('comment_votes')
          .update({ vote_type: newUserVote, updated_at: new Date().toISOString() })
          .eq('comment_id', commentId)
          .eq('user_employee_id', userEmployeeId);
      } else {
        // 새 투표 추가
        await supabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            user_employee_id: userEmployeeId,
            vote_type: newUserVote
          });
      }
    }

    // 댓글 좋아요/싫어요 수 업데이트
    const { error } = await supabase
      .from('anonymous_comments')
      .update({ 
        likes: newLikes,
        dislikes: newDislikes
      })
      .eq('id', commentId);

    if (error) {
      console.error('댓글 투표 오류:', error);
      return { success: false, newLikes: currentLikes, newDislikes: currentDislikes, userVote: currentUserVote };
    }

    return { success: true, newLikes, newDislikes, userVote: newUserVote };
  } catch (error) {
    console.error('댓글 투표 중 오류 발생:', error);
    return { success: false, newLikes: 0, newDislikes: 0, userVote: null };
  }
}

// 사용자의 댓글 투표 상태 가져오기
export async function getUserCommentVote(commentId: number, userEmployeeId: string): Promise<'like' | 'dislike' | null> {
  try {
    const { data, error } = await supabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', commentId)
      .eq('user_employee_id', userEmployeeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 데이터가 없을 때 발생
      console.error('사용자 댓글 투표 상태 조회 오류:', error);
      return null;
    }

    return data?.vote_type || null;
  } catch (error) {
    console.error('사용자 댓글 투표 상태 조회 중 오류 발생:', error);
    return null;
  }
}

// 댓글 좋아요 (하위 호환성을 위해 유지)
export async function likeComment(commentId: number): Promise<boolean> {
  const result = await voteComment(commentId, 'like', '');
  return result.success;
}

// 댓글 싫어요 (하위 호환성을 위해 유지)
export async function dislikeComment(commentId: number): Promise<boolean> {
  const result = await voteComment(commentId, 'dislike', '');
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
