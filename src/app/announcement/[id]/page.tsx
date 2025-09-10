'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getAnnouncementById, formatTimeAgo, getPriorityStyle, type Announcement } from '@/lib/announcements';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const announcementId = params.id as string;

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        setLoading(true);
        setError('');
        
        const data = await getAnnouncementById(parseInt(announcementId));
        if (data) {
          setAnnouncement(data);
        } else {
          setError('공지사항을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('공지사항 로드 실패:', err);
        setError('공지사항을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (announcementId) {
      loadAnnouncement();
    }
  }, [announcementId]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">공지사항을 불러오는 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !announcement) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">공지사항을 찾을 수 없습니다</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const style = getPriorityStyle(announcement.priority);

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
            {/* 공지사항 헤더 */}
            <div className={`${style.bgColor} px-6 py-4 border-l-4 ${style.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{style.icon}</span>
                  <div>
                    <h1 className={`text-xl font-bold ${style.textColor}`}>
                      {announcement.title}
                    </h1>
                    <div className="flex items-center mt-2 space-x-4 text-sm">
                      {announcement.author && (
                        <span className="text-gray-600">
                          작성자: {announcement.author.name}
                        </span>
                      )}
                      <span className="text-gray-500">
                        {formatTimeAgo(announcement.created_at)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        announcement.priority === 'urgent' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {announcement.priority === 'urgent' ? '긴급' : '일반'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 공지사항 내용 */}
            <div className="px-6 py-8">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {announcement.content}
                </div>
              </div>
            </div>

            {/* 공지사항 푸터 */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  <span>작성일: {new Date(announcement.created_at).toLocaleDateString('ko-KR')}</span>
                  {announcement.updated_at !== announcement.created_at && (
                    <span className="ml-4">
                      수정일: {new Date(announcement.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 font-medium"
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
