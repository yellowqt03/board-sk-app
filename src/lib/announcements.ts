import { supabase } from './supabase';

// 공지사항 타입 정의
export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'urgent' | 'normal';
  category_id: number;
  author_id: number;
  target_departments: number[];
  target_positions: number[];
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  author?: {
    name: string;
    employee_id: string;
  };
  category?: {
    name: string;
  };
}

// 공지사항 목록 가져오기
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        author:employee_master(name, employee_id),
        category:board_categories(name)
      `)
      .order('priority', { ascending: false }) // urgent가 먼저
      .order('created_at', { ascending: false }); // 최신순

    if (error) {
      console.error('공지사항 조회 오류:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('공지사항 조회 실패:', error);
    return [];
  }
}

// 공지사항 상세 조회
export async function getAnnouncementById(id: number): Promise<Announcement | null> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        author:employee_master(name, employee_id),
        category:board_categories(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('공지사항 상세 조회 오류:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('공지사항 상세 조회 실패:', error);
    return null;
  }
}

// 공지사항 작성
export async function createAnnouncement(data: {
  title: string;
  content: string;
  priority: 'urgent' | 'normal';
  category_id: number;
  author_id: number;
  target_departments?: number[];
  target_positions?: number[];
}): Promise<Announcement | null> {
  try {
    const { data: result, error } = await supabase
      .from('announcements')
      .insert({
        title: data.title.trim(),
        content: data.content.trim(),
        priority: data.priority,
        category_id: data.category_id,
        author_id: data.author_id,
        target_departments: data.target_departments || [],
        target_positions: data.target_positions || []
      })
      .select(`
        *,
        author:employee_master(name, employee_id),
        category:board_categories(name)
      `)
      .single();

    if (error) {
      console.error('공지사항 작성 오류:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('공지사항 작성 실패:', error);
    return null;
  }
}

// 시간 포맷팅 함수
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

// 우선순위별 스타일 반환
export function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'urgent':
      return {
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        icon: '🚨'
      };
    case 'normal':
      return {
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        icon: '📢'
      };
    default:
      return {
        borderColor: 'border-gray-500',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800',
        icon: '📄'
      };
  }
}
