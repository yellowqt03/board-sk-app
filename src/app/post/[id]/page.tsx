'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getAnonymousPostById, formatTimeAgo, getCategoryStyle, deleteAnonymousPost, votePost, getUserPostVote, type AnonymousPost } from '@/lib/anonymous-posts';
import { setUserVoteState, getVoteButtonStyle, type VoteType } from '@/lib/vote-utils';
import { getCurrentUser } from '@/lib/auth';
import CommentsSection from '@/components/CommentsSection';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<AnonymousPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<VoteType>(null);
  const postId = params.id as string;

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('게시글 상세 페이지 로딩 시작:', postId);
        const data = await getAnonymousPostById(parseInt(postId));
        console.log('게시글 데이터 로드 결과:', data);
        
        if (data) {
          setPost(data);
          
          // 현재 사용자의 실제 투표 상태 로드
          const currentUser = getCurrentUser();
          if (currentUser) {
            const userVoteState = await getUserPostVote(data.id, currentUser.employee_id);
            setUserVote(userVoteState);
            setUserVoteState(data.id, userVoteState);
          }
        } else {
          console.log('게시글 데이터 없음, 오류 설정');
          setError('게시글을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('게시글 로드 실패:', err);
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        console.log('게시글 로딩 완료, loading false 설정');
        setLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId]);

  // 게시글 삭제 처리
  const handleDelete = async () => {
    if (!post || !currentUser) return;

    try {
      setDeleting(true);
      const success = await deleteAnonymousPost(post.id, currentUser.employee_id);
      
      if (success) {
        // 삭제 성공 시 익명게시판으로 이동
        router.push('/anonymous');
      } else {
        setError('게시글 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      setError('게시글 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 투표 처리 (좋아요/싫어요 토글)
  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!post || !currentUser || voting) return;

    try {
      setVoting(true);
      
      // 서버에서 토글 로직을 처리하므로 voteType을 그대로 전달
      const result = await votePost(post.id, voteType, currentUser.employee_id);
      
      if (result.success) {
        // 성공 시 로컬 상태 업데이트
        setPost(prev => prev ? { 
          ...prev, 
          likes: result.newLikes,
          dislikes: result.newDislikes
        } : null);
        
        // 사용자 투표 상태 업데이트
        setUserVote(result.userVote);
        setUserVoteState(post.id, result.userVote);
      } else {
        alert('투표 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('투표 처리 실패:', err);
      alert('투표 처리 중 오류가 발생했습니다.');
    } finally {
      setVoting(false);
    }
  };

  // 작성자 본인인지 확인
  const currentUser = getCurrentUser();
  const isAuthor = post && currentUser && post.author_employee_id === currentUser.employee_id;

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !post) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const style = getCategoryStyle(post.category?.name || '');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 네비게이션 바 */}
        <NavigationBar showUserInfo={false} />

        {/* 메인 컨텐츠 */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <article className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* 게시글 헤더 */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">
                    {post.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bgColor} ${style.textColor}`}>
                      {style.icon} {post.category?.name}
                    </span>
                    <span>{formatTimeAgo(post.created_at)}</span>
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        👍 {post.likes}
                      </span>
                      <span className="flex items-center">
                        👎 {post.dislikes}
                      </span>
                    </div>
                  </div>
                </div>
                {/* 작성자 본인만 삭제 버튼 표시 */}
                {isAuthor && (
                  <div className="ml-4">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={deleting}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 게시글 내용 */}
            <div className="px-6 py-8">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {post.content}
                </div>
              </div>
            </div>

            {/* 반응 버튼 */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <div className="flex items-center justify-center space-x-2 sm:space-x-8">
                <button
                  onClick={() => handleVote('like')}
                  disabled={voting}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${getVoteButtonStyle(userVote, 'like', voting)}`}
                >
                  <span>👍</span>
                  <span className="hidden sm:inline">
                    {voting ? '처리 중...' : `좋아요 (${post.likes})`}
                  </span>
                  <span className="sm:hidden">
                    {voting ? '...' : post.likes}
                  </span>
                </button>
                <button
                  onClick={() => handleVote('dislike')}
                  disabled={voting}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${getVoteButtonStyle(userVote, 'dislike', voting)}`}
                >
                  <span>👎</span>
                  <span className="hidden sm:inline">
                    {voting ? '처리 중...' : `싫어요 (${post.dislikes})`}
                  </span>
                  <span className="sm:hidden">
                    {voting ? '...' : post.dislikes}
                  </span>
                </button>
                <button className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base">
                  <span>💬</span>
                  <span className="hidden sm:inline">댓글</span>
                </button>
              </div>
            </div>

            {/* 댓글 섹션 */}
            <div className="px-6 py-4 border-t">
              <CommentsSection postId={post.id} isAnonymousBoard={post.category_id >= 4 && post.category_id <= 7} />
            </div>

            {/* 게시글 푸터 */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  <span>작성일: {new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                  {post.updated_at !== post.created_at && (
                    <span className="ml-4">
                      수정일: {new Date(post.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/anonymous')}
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    목록으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  게시글 삭제 확인
                </h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700 mb-4">
                  정말로 이 게시글을 삭제하시겠습니까?
                </p>
                <p className="text-sm text-red-600 mb-4">
                  삭제된 게시글은 복구할 수 없습니다.
                </p>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      삭제 중...
                    </>
                  ) : (
                    '삭제'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
