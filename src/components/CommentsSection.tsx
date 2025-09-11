'use client';

import { useState, useEffect } from 'react';
import { getCommentsByPostId, createComment, deleteComment, likeComment, dislikeComment, formatTimeAgo, CommentWithAuthor } from '@/lib/comments';
import { getCurrentUser } from '@/lib/auth';

interface CommentsSectionProps {
  postId: number;
}

export default function CommentsSection({ postId }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [likingComments, setLikingComments] = useState<Set<number>>(new Set());
  const [dislikingComments, setDislikingComments] = useState<Set<number>>(new Set());

  // 댓글 로드
  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await getCommentsByPostId(postId);
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 현재 사용자 정보 로드
  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
    }
  };

  useEffect(() => {
    loadComments();
    loadCurrentUser();
  }, [postId]);

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !currentUser) return;

    try {
      setSubmitting(true);
      const success = await createComment(postId, currentUser.employee_id, newComment);
      
      if (success) {
        setNewComment('');
        await loadComments(); // 댓글 목록 새로고침
      } else {
        alert('댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 좋아요
  const handleLikeComment = async (commentId: number) => {
    if (likingComments.has(commentId) || dislikingComments.has(commentId)) return;

    try {
      setLikingComments(prev => new Set(prev).add(commentId));
      const success = await likeComment(commentId);
      
      if (success) {
        // 성공 시 로컬 상태 업데이트
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, likes: comment.likes + 1 }
            : comment
        ));
      } else {
        alert('댓글 좋아요 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
      alert('댓글 좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setLikingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  // 댓글 싫어요
  const handleDislikeComment = async (commentId: number) => {
    if (likingComments.has(commentId) || dislikingComments.has(commentId)) return;

    try {
      setDislikingComments(prev => new Set(prev).add(commentId));
      const success = await dislikeComment(commentId);
      
      if (success) {
        // 성공 시 로컬 상태 업데이트
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, dislikes: comment.dislikes + 1 }
            : comment
        ));
      } else {
        alert('댓글 싫어요 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 싫어요 오류:', error);
      alert('댓글 싫어요 처리 중 오류가 발생했습니다.');
    } finally {
      setDislikingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!currentUser) return;

    try {
      const success = await deleteComment(commentId, currentUser.employee_id);
      
      if (success) {
        await loadComments(); // 댓글 목록 새로고침
        setShowDeleteConfirm(null);
      } else {
        alert('댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">댓글</h3>
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">댓글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        댓글 ({comments.length})
      </h3>

      {/* 댓글 작성 폼 */}
      {currentUser && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 작성해주세요..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {newComment.length}/500자
          </p>
        </form>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>아직 댓글이 없습니다.</p>
            <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = currentUser && comment.author_employee_id === currentUser.employee_id;
            
            return (
              <div key={comment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {comment.author.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  
                  {isAuthor && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(comment.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-800 whitespace-pre-wrap">
                  {comment.content}
                </p>
                
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <button 
                    onClick={() => handleLikeComment(comment.id)}
                    disabled={likingComments.has(comment.id) || dislikingComments.has(comment.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                      likingComments.has(comment.id)
                        ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
                        : 'hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <span>👍</span>
                    <span>
                      {likingComments.has(comment.id) ? '처리 중...' : comment.likes}
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => handleDislikeComment(comment.id)}
                    disabled={likingComments.has(comment.id) || dislikingComments.has(comment.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                      dislikingComments.has(comment.id)
                        ? 'bg-red-200 text-red-700 cursor-not-allowed'
                        : 'hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <span>👎</span>
                    <span>
                      {dislikingComments.has(comment.id) ? '처리 중...' : comment.dislikes}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">댓글 삭제</h3>
            <p className="text-gray-600 mb-6">
              정말로 이 댓글을 삭제하시겠습니까?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteComment(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
