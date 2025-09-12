'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getAnnouncementById, formatTimeAgo, getPriorityStyle, deleteAnnouncement, type Announcement } from '@/lib/announcements';
import { getCurrentUser } from '@/lib/auth';
import { displayEmployeeId } from '@/lib/utils';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const announcementId = params.id as string;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // 현재 사용자 정보 로드
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // 공지사항 정보 로드
        const data = await getAnnouncementById(parseInt(announcementId));
        if (data) {
          setAnnouncement(data);
        } else {
          setError('공지사항을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (announcementId) {
      loadData();
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

  // 삭제 처리
  const handleDelete = async () => {
    if (!announcement || !currentUser) return;
    
    const confirmed = window.confirm('정말로 이 공지사항을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const success = await deleteAnnouncement(announcement.id, currentUser.id);
      
      if (success) {
        alert('공지사항이 삭제되었습니다.');
        router.push('/');
      } else {
        alert('공지사항 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('삭제 오류:', error);
      alert(error.message || '공지사항 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 수정 페이지로 이동
  const handleEdit = () => {
    if (!announcement) return;
    router.push(`/admin/write-announcement?edit=${announcement.id}`);
  };

  // 작성자 권한 확인
  const isAuthor = currentUser && announcement && currentUser.id === announcement.author_id;

  const style = getPriorityStyle(announcement.priority);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* 네비게이션 바 */}
        <NavigationBar showUserInfo={false} />

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
                          작성자: {announcement.author.name} (사번: {displayEmployeeId(announcement.author.employee_id)})
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
                  {/* 작성자만 수정/삭제 버튼 표시 */}
                  {isAuthor && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleEdit}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  )}
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
