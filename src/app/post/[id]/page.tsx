'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getAnonymousPostById, formatTimeAgo, getCategoryStyle, type AnonymousPost } from '@/lib/anonymous-posts';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<AnonymousPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const postId = params.id as string;

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError('');
        
        const data = await getAnonymousPostById(parseInt(postId));
        if (data) {
          setPost(data);
        } else {
          setError('게시글을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('게시글 로드 실패:', err);
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId]);

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
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                뒤로 가기
              </button>
              <h1 className="text-xl font-bold text-gray-900">💬 SK 톡톡</h1>
              <div className="w-20"></div> {/* 공간 확보 */}
            </div>
          </div>
        </header>

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
              <div className="flex items-center justify-center space-x-8">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <span>👍</span>
                  <span>좋아요 ({post.likes})</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                  <span>👎</span>
                  <span>싫어요 ({post.dislikes})</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <span>💬</span>
                  <span>댓글</span>
                </button>
              </div>
            </div>

            {/* 댓글 섹션 (향후 구현) */}
            <div className="px-6 py-4 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 댓글</h3>
              <div className="text-center py-8 text-gray-500">
                <p>댓글 기능은 곧 추가될 예정입니다.</p>
              </div>
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
                    onClick={() => router.back()}
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    목록으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          </article>
        </main>
      </div>
    </AuthGuard>
  );
}
