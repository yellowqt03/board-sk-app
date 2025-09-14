'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCommentsByPostId, createComment, deleteComment, voteComment, getUserCommentVote, formatTimeAgo, CommentWithAuthor } from '@/lib/comments';
import { setUserVoteState, getVoteButtonStyle, type VoteType } from '@/lib/vote-utils';
import { getCurrentUser, type User } from '@/lib/auth';

interface CommentsSectionProps {
  postId: number;
}

export default function CommentsSection({ postId }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [votingComments, setVotingComments] = useState<Set<number>>(new Set());
  const [commentVotes, setCommentVotes] = useState<Map<number, VoteType>>(new Map());
  
  // 대댓글 관련 상태
  const [replyToComment, setReplyToComment] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 댓글 로드
  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const commentsData = await getCommentsByPostId(postId);
      setComments(commentsData);
      
      // 현재 사용자의 실제 투표 상태 로드
      if (currentUser) {
        const votes = new Map<number, VoteType>();
        for (const comment of commentsData) {
          const userVoteState = await getUserCommentVote(comment.id, currentUser.employee_id);
          votes.set(comment.id, userVoteState);
          setUserVoteState(postId, userVoteState, comment.id);
        }
        setCommentVotes(votes);
      }
    } catch (error) {
      console.error('댓글 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, currentUser]);

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
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadComments();
    }
  }, [postId, currentUser, loadComments]);

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

  // 대댓글 작성
  const handleSubmitReply = async (e: React.FormEvent, parentCommentId: number) => {
    e.preventDefault();
    
    if (!replyContent.trim() || !currentUser) return;

    try {
      setSubmitting(true);
      const success = await createComment(postId, currentUser.employee_id, replyContent, parentCommentId);
      
      if (success) {
        setReplyContent('');
        setReplyToComment(null);
        await loadComments(); // 댓글 목록 새로고침
      } else {
        alert('대댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('대댓글 작성 오류:', error);
      alert('대댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 투표 처리 (좋아요/싫어요 토글)
  const handleCommentVote = async (commentId: number, voteType: 'like' | 'dislike') => {
    if (votingComments.has(commentId) || !currentUser) return;

    try {
      setVotingComments(prev => new Set(prev).add(commentId));
      
      // 서버에서 토글 로직을 처리하므로 voteType을 그대로 전달
      const result = await voteComment(commentId, voteType, currentUser.employee_id);
      
      if (result.success) {
        // 성공 시 로컬 상태 업데이트
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                likes: result.newLikes,
                dislikes: result.newDislikes
              }
            : comment
        ));
        
        // 사용자 투표 상태 업데이트
        setCommentVotes(prev => {
          const newMap = new Map(prev);
          newMap.set(commentId, result.userVote);
          return newMap;
        });
        setUserVoteState(postId, result.userVote, commentId);
      } else {
        alert('댓글 투표 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 투표 오류:', error);
      alert('댓글 투표 처리 중 오류가 발생했습니다.');
    } finally {
      setVotingComments(prev => {
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
            const isReply = !!comment.parent_comment_id;
            
            return (
              <div key={comment.id} className={`bg-white p-4 rounded-lg border border-gray-200 ${isReply ? 'ml-8 border-l-4 border-l-blue-200' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {isReply && <span className="text-blue-600">↳</span>}
                    <span className="font-medium text-gray-900">
                      {comment.author.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                    {isReply && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">대댓글</span>}
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
                    onClick={() => handleCommentVote(comment.id, 'like')}
                    disabled={votingComments.has(comment.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${getVoteButtonStyle(commentVotes.get(comment.id) || null, 'like', votingComments.has(comment.id))}`}
                  >
                    <span>👍</span>
                    <span>
                      {votingComments.has(comment.id) ? '처리 중...' : comment.likes}
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => handleCommentVote(comment.id, 'dislike')}
                    disabled={votingComments.has(comment.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${getVoteButtonStyle(commentVotes.get(comment.id) || null, 'dislike', votingComments.has(comment.id))}`}
                  >
                    <span>👎</span>
                    <span>
                      {votingComments.has(comment.id) ? '처리 중...' : comment.dislikes}
                    </span>
                  </button>
                  
                  {/* 대댓글 버튼 (부모 댓글에만 표시) */}
                  {!isReply && currentUser && (
                    <button
                      onClick={() => setReplyToComment(replyToComment === comment.id ? null : comment.id)}
                      className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <span>💬</span>
                      <span>답글</span>
                    </button>
                  )}
                </div>

                {/* 대댓글 작성 폼 */}
                {replyToComment === comment.id && !isReply && (
                  <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="mt-4 pl-4 border-l-2 border-blue-200">
                    <div className="flex gap-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="답글을 작성해주세요..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                        maxLength={500}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="submit"
                          disabled={!replyContent.trim() || submitting}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        >
                          {submitting ? '작성 중...' : '답글 작성'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyToComment(null);
                            setReplyContent('');
                          }}
                          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {replyContent.length}/500자
                    </p>
                  </form>
                )}
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
