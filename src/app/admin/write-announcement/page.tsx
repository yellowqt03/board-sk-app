'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { getCurrentUser } from '@/lib/auth';
import { createAnnouncement, getAnnouncementById, updateAnnouncement } from '@/lib/announcements';
import { createAnnouncementNotification, getTargetUserIds } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export default function WriteAnnouncementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [departments, setDepartments] = useState<{id: number, name: string}[]>([]);
  const [positions, setPositions] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'urgent' | 'normal',
    target_type: 'all' as 'all' | 'departments' | 'positions',
    target_departments: [] as number[],
    target_positions: [] as number[]
  });

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 현재 사용자 정보 로드
        const user = await getCurrentUser();
        setCurrentUser(user);

        // 수정 모드 확인
        const editParam = searchParams.get('edit');
        if (editParam) {
          const id = parseInt(editParam);
          if (!isNaN(id)) {
            setIsEditMode(true);
            setEditId(id);
            await loadAnnouncementForEdit(id);
          }
        }

        // 부서 목록 로드
        const { data: departmentsData, error: departmentsError } = await supabase
          .from('departments')
          .select('id, name')
          .order('name');

        if (departmentsError) throw departmentsError;
        setDepartments(departmentsData || []);

        // 직급 목록 로드
        const { data: positionsData, error: positionsError } = await supabase
          .from('positions')
          .select('id, name')
          .order('level');

        if (positionsError) throw positionsError;
        setPositions(positionsData || []);

      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  // 수정할 공지사항 데이터 로드
  const loadAnnouncementForEdit = async (id: number) => {
    try {
      const announcement = await getAnnouncementById(id);
      if (announcement) {
        setFormData({
          title: announcement.title,
          content: announcement.content,
          priority: announcement.priority,
          target_type: 'all',
          target_departments: announcement.target_departments || [],
          target_positions: announcement.target_positions || []
        });
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      setError('공지사항을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 폼 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  // 체크박스 핸들러
  const handleCheckboxChange = (type: 'departments' | 'positions', id: number) => {
    setFormData(prev => {
      const currentArray = prev[`target_${type}` as keyof typeof prev] as number[];
      return {
        ...prev,
        [`target_${type}`]: currentArray.includes(id)
          ? currentArray.filter(item => item !== id)
          : [...currentArray, id]
      };
    });
  };

  // 공지사항 작성 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    
    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    // 카테고리 검증 제거

    if (!currentUser) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // 대상 사용자 ID 가져오기
      let targetUserIds: number[] = [];
      
      if (formData.target_type === 'all') {
        // 전체 사용자
        targetUserIds = await getTargetUserIds();
      } else if (formData.target_type === 'departments' && formData.target_departments.length > 0) {
        // 선택된 부서 사용자
        targetUserIds = await getTargetUserIds(formData.target_departments);
      } else if (formData.target_type === 'positions' && formData.target_positions.length > 0) {
        // 선택된 직급 사용자
        targetUserIds = await getTargetUserIds(undefined, formData.target_positions);
      }

      let result;
      
      if (isEditMode && editId) {
        // 공지사항 수정
        result = await updateAnnouncement(editId, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          priority: formData.priority,
          category_id: null,
          target_departments: formData.target_departments,
          target_positions: formData.target_positions
        }, currentUser.id);

        if (!result) {
          setError('공지사항 수정 중 오류가 발생했습니다.');
          return;
        }
      } else {
        // 공지사항 작성
        result = await createAnnouncement({
          title: formData.title.trim(),
          content: formData.content.trim(),
          priority: formData.priority,
          category_id: null,
          author_id: currentUser.id,
          target_departments: formData.target_departments,
          target_positions: formData.target_positions
        });

        if (!result) {
          setError('공지사항 작성 중 오류가 발생했습니다.');
          return;
        }

        // 알림 생성 (새 공지사항 작성 시에만)
        if (targetUserIds.length > 0) {
          await createAnnouncementNotification(
            result.id,
            result.title,
            result.priority,
            targetUserIds
          );
        }
      }

      // 완료 후 메인 페이지로 이동
      router.push('/');
    } catch (err) {
      console.error('공지사항 작성 실패:', err);
      setError('공지사항 작성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <NavigationBar showUserInfo={true} />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {isEditMode ? '공지사항 수정' : '공지사항 작성'}
              </h1>
              <p className="text-gray-600">
                {isEditMode ? '공지사항을 수정하세요.' : '새로운 공지사항을 작성하고 직원들에게 알림을 보내세요.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 제목 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="공지사항 제목을 입력하세요"
                  maxLength={200}
                />
              </div>

              {/* 우선순위 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  우선순위 *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={formData.priority === 'normal'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-blue-600">📢 일반</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={formData.priority === 'urgent'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-red-600">🚨 긴급</span>
                  </label>
                </div>
              </div>

              {/* 카테고리 섹션 제거 */}

              {/* 대상 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 대상
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="target_type"
                      value="all"
                      checked={formData.target_type === 'all'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span>전체 직원</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="target_type"
                      value="departments"
                      checked={formData.target_type === 'departments'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span>특정 부서</span>
                  </label>
                  
                  {formData.target_type === 'departments' && (
                    <div className="ml-6 grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {departments.map(dept => (
                        <label key={dept.id} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={formData.target_departments.includes(dept.id)}
                            onChange={() => handleCheckboxChange('departments', dept.id)}
                            className="mr-2"
                          />
                          {dept.name}
                        </label>
                      ))}
                    </div>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="target_type"
                      value="positions"
                      checked={formData.target_type === 'positions'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span>특정 직급</span>
                  </label>
                  
                  {formData.target_type === 'positions' && (
                    <div className="ml-6 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {positions.map(pos => (
                        <label key={pos.id} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={formData.target_positions.includes(pos.id)}
                            onChange={() => handleCheckboxChange('positions', pos.id)}
                            className="mr-2"
                          />
                          {pos.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 내용 */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  내용 *
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting 
                    ? (isEditMode ? '수정 중...' : '작성 중...') 
                    : (isEditMode ? '공지사항 수정' : '공지사항 작성')
                  }
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
