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

// 댓글 좋아요/싫어요 (향후 구현)
export async function likeComment(commentId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_comments')
      .update({ likes: supabase.raw('likes + 1') })
      .eq('id', commentId);

    if (error) {
      console.error('댓글 좋아요 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('댓글 좋아요 중 오류 발생:', error);
    return false;
  }
}

export async function dislikeComment(commentId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_comments')
      .update({ dislikes: supabase.raw('dislikes + 1') })
      .eq('id', commentId);

    if (error) {
      console.error('댓글 싫어요 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('댓글 싫어요 중 오류 발생:', error);
    return false;
  }
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
