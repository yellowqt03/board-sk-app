import { supabase } from './supabase';

// 알림 타입 정의
export interface Notification {
  id: number;
  user_id: number;
  type: 'announcement' | 'keyword_alert' | 'system';
  title: string;
  content?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  created_at: string;
  read_at?: string;
}

// 알림 설정 타입 정의
export interface NotificationSettings {
  id: number;
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  keyword_alerts: boolean;
  announcement_alerts: boolean;
  created_at: string;
}

// 사용자의 알림 목록 가져오기
export async function getUserNotifications(userId: number): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('알림 조회 오류:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('알림 조회 실패:', error);
    return [];
  }
}

// 읽지 않은 알림 개수 가져오기
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('읽지 않은 알림 개수 조회 오류:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('읽지 않은 알림 개수 조회 실패:', error);
    return 0;
  }
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('알림 읽음 처리 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    return false;
  }
}

// 모든 알림 읽음 처리
export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('모든 알림 읽음 처리 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error);
    return false;
  }
}

// 공지사항 알림 생성
export async function createAnnouncementNotification(
  announcementId: number,
  title: string,
  priority: 'urgent' | 'normal',
  targetUserIds: number[]
): Promise<boolean> {
  try {
    const notifications = targetUserIds.map(userId => ({
      user_id: userId,
      type: 'announcement',
      title: `새 공지사항: ${title}`,
      content: priority === 'urgent' ? '긴급 공지사항이 등록되었습니다.' : '새로운 공지사항이 등록되었습니다.',
      data: { announcement_id: announcementId },
      is_read: false,
      priority: priority === 'urgent' ? 'urgent' : 'normal'
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('공지사항 알림 생성 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('공지사항 알림 생성 실패:', error);
    return false;
  }
}

// 사용자 알림 설정 가져오기
export async function getUserNotificationSettings(userId: number): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('알림 설정 조회 오류:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('알림 설정 조회 실패:', error);
    return null;
  }
}

// 사용자 알림 설정 업데이트
export async function updateUserNotificationSettings(
  userId: number,
  settings: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    keyword_alerts?: boolean;
    announcement_alerts?: boolean;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings
      });

    if (error) {
      console.error('알림 설정 업데이트 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 설정 업데이트 실패:', error);
    return false;
  }
}

// 대상 사용자 ID 가져오기 (부서별, 직급별)
export async function getTargetUserIds(
  targetDepartments?: number[],
  targetPositions?: number[]
): Promise<number[]> {
  try {
    let query = supabase
      .from('employee_master')
      .select('id')
      .eq('is_active', true)
      .eq('status', 'approved');

    if (targetDepartments && targetDepartments.length > 0) {
      query = query.in('department_id', targetDepartments);
    }

    if (targetPositions && targetPositions.length > 0) {
      query = query.in('position_id', targetPositions);
    }

    const { data, error } = await query;

    if (error) {
      console.error('대상 사용자 ID 조회 오류:', error);
      return [];
    }

    return data?.map(user => user.id) || [];
  } catch (error) {
    console.error('대상 사용자 ID 조회 실패:', error);
    return [];
  }
}

// 브라우저 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('알림 권한이 거부되었습니다.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// 브라우저 알림 표시
export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
}
