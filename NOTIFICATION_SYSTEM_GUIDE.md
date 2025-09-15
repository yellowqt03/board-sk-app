# 🔔 실시간 알림 시스템 운영 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [설치 및 설정](#설치-및-설정)
3. [데이터베이스 구조](#데이터베이스-구조)
4. [보안 설정](#보안-설정)
5. [성능 최적화](#성능-최적화)
6. [모니터링 및 관리](#모니터링-및-관리)
7. [문제 해결](#문제-해결)
8. [API 참조](#api-참조)

---

## 🎯 시스템 개요

### 주요 기능
- **실시간 알림**: WebSocket을 통한 즉시 알림 전송
- **다양한 알림 타입**: 시스템, 댓글, 공지사항, 키워드 등
- **우선순위 시스템**: normal, high, urgent 3단계
- **사용자 설정**: 개인별 알림 수신 설정
- **자동 정리**: 오래된 알림 자동 보관/삭제
- **실시간 모니터링**: 관리자 대시보드

### 기술 스택
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **실시간 통신**: WebSocket (Supabase Realtime)
- **상태 관리**: React Hooks

---

## 🚀 설치 및 설정

### 1. 환경 설정 확인
```bash
# .env.local 파일에 Supabase 설정 확인
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. 데이터베이스 초기 설정
다음 SQL 파일들을 **순서대로** 실행하세요:

```sql
-- 1. 기본 테이블 생성
\i sql/step6_simple_notifications.sql

-- 2. 운영 환경 보안 설정 (중요!)
\i sql/production_security_setup.sql

-- 3. 성능 최적화
\i sql/performance_optimization.sql

-- 4. 정리 및 보관 정책
\i sql/notification_cleanup_policy.sql
```

### 3. RLS(Row Level Security) 설정
**운영 환경에서는 반드시 RLS를 활성화**하세요:

```sql
-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 필요한 경우 간단 설정으로 임시 해제
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

### 4. 프론트엔드 설정
```typescript
// src/lib/supabase.ts에서 Realtime 설정 확인
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // 초당 이벤트 제한
    },
  },
})
```

---

## 🗄️ 데이터베이스 구조

### 주요 테이블

#### `notifications` (메인 알림 테이블)
```sql
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,           -- 수신자 ID
  type VARCHAR(50) NOT NULL,         -- 'system', 'comment', 'announcement' 등
  title VARCHAR(255) NOT NULL,       -- 알림 제목
  content TEXT,                      -- 알림 내용
  priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'high', 'urgent'
  is_read BOOLEAN DEFAULT FALSE,     -- 읽음 여부
  read_at TIMESTAMP,                 -- 읽은 시간
  related_id BIGINT,                 -- 관련 레코드 ID (게시글, 댓글 등)
  data JSONB,                        -- 추가 데이터
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `notification_settings` (사용자별 설정)
```sql
CREATE TABLE notification_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  keyword_alerts BOOLEAN DEFAULT TRUE,
  announcement_alerts BOOLEAN DEFAULT TRUE,
  comment_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `notification_summary` (캐시 테이블)
```sql
CREATE TABLE notification_summary (
  user_id BIGINT PRIMARY KEY,
  total_unread INTEGER DEFAULT 0,    -- 총 읽지 않은 수
  urgent_unread INTEGER DEFAULT 0,   -- 긴급 읽지 않은 수
  last_notification_at TIMESTAMP,   -- 마지막 알림 시간
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 인덱스 최적화
```sql
-- 성능 향상을 위한 주요 인덱스
CREATE INDEX idx_notifications_user_type_created ON notifications(user_id, type, created_at DESC);
CREATE INDEX idx_notifications_priority_created ON notifications(priority, created_at DESC);
CREATE INDEX idx_notifications_user_unread_priority ON notifications(user_id, priority, created_at DESC) WHERE is_read = false;
```

---

## 🔒 보안 설정

### RLS 정책 (운영 환경 필수)

#### 사용자 조회 권한
```sql
CREATE POLICY "users_select_own_notifications" ON notifications
  FOR SELECT USING (
    auth.uid()::text::integer = user_id
  );
```

#### 사용자 업데이트 권한 (읽음 상태만)
```sql
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (
    auth.uid()::text::integer = user_id
  )
  WITH CHECK (
    auth.uid()::text::integer = user_id AND
    -- 읽음 상태와 읽은 시간만 변경 가능
    (OLD.user_id = NEW.user_id AND
     OLD.type = NEW.type AND
     OLD.title = NEW.title AND
     OLD.content = NEW.content)
  );
```

#### 시스템 알림 생성 권한
```sql
CREATE POLICY "system_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (
    current_user = 'postgres' OR
    auth.uid() IS NULL OR
    auth.role() = 'service_role'
  );
```

### 스팸 방지
```sql
-- 1분당 같은 타입 알림 5개 제한
CREATE OR REPLACE FUNCTION check_notification_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM notifications
  WHERE user_id = NEW.user_id
    AND type = NEW.type
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION '알림 생성 제한: 1분당 같은 타입의 알림은 5개까지만 생성할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚡ 성능 최적화

### 1. 알림 집계 시스템
실시간 집계를 위한 트리거 기반 캐시:

```sql
-- 알림 생성/수정/삭제 시 자동으로 집계 업데이트
CREATE TRIGGER notification_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notification_summary();
```

### 2. 배치 처리
```sql
-- 대용량 처리를 위한 배치 함수
SELECT archive_old_notifications(1000); -- 1000개씩 배치 처리
```

### 3. 알림 큐 시스템
대용량 트래픽을 위한 큐 기반 처리:

```sql
-- 알림 생성 요청을 큐에 추가
INSERT INTO notification_queue (user_id, notification_data, priority)
VALUES (user_id, jsonb_data, priority_level);

-- 배치로 처리
SELECT process_notification_queue(100);
```

### 4. 연결 관리
```typescript
// 프론트엔드 최적화
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, handleNewNotification)
  .subscribe();

// 컴포넌트 언마운트 시 정리
useEffect(() => {
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 📊 모니터링 및 관리

### 관리자 대시보드
URL: `/admin/notification-dashboard`

**주요 기능:**
- 실시간 알림 통계
- 성능 지표 모니터링
- 정리 상태 확인
- 수동 정리 실행

### 주요 모니터링 지표

#### 성능 통계
```sql
SELECT * FROM get_notification_performance_stats();
```
- 총 알림 수
- 읽지 않은 알림 수
- 평균 읽기 시간
- 일일 알림 수

#### 정리 상태
```sql
SELECT * FROM get_cleanup_status();
```
- 활성 알림 수
- 보관 알림 수
- 정리 대상 알림 수
- 마지막 정리 실행 시간

### 자동 정리 실행
```sql
-- 수동 정리 실행
SELECT execute_notification_cleanup();

-- cron을 통한 자동 실행 (pg_cron 확장 필요)
SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT execute_notification_cleanup();');
```

---

## 🛠️ 문제 해결

### 일반적인 문제들

#### 1. 알림이 전송되지 않는 경우
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- 임시로 RLS 비활성화 (개발환경에서만!)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

#### 2. 성능 이슈
```sql
-- 인덱스 사용 확인
EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = 123 ORDER BY created_at DESC;

-- 통계 업데이트
ANALYZE notifications;
```

#### 3. WebSocket 연결 문제
```typescript
// 연결 상태 확인
console.log('Realtime status:', supabase.realtime.status);

// 재연결 시도
supabase.realtime.reconnect();
```

#### 4. 메모리 사용량 증가
```sql
-- 정리 작업 강제 실행
SELECT execute_notification_cleanup();

-- 오래된 보관 알림 삭제
SELECT delete_old_archived_notifications();
```

### 로그 확인
```sql
-- 감사 로그 확인
SELECT * FROM audit_logs
WHERE table_name = 'notifications'
ORDER BY timestamp DESC LIMIT 100;

-- 정리 작업 로그 확인
SELECT * FROM notification_cleanup_log
ORDER BY cleanup_date DESC LIMIT 10;
```

---

## 🔧 API 참조

### 프론트엔드 함수들

#### 알림 조회
```typescript
import { getUserNotifications } from '@/lib/notifications';

const notifications = await getUserNotifications(userId, {
  limit: 20,
  offset: 0,
  unreadOnly: false
});
```

#### 알림 읽음 처리
```typescript
import { markNotificationAsRead } from '@/lib/notifications';

await markNotificationAsRead(notificationId);
```

#### 알림 설정 관리
```typescript
import {
  getUserNotificationSettings,
  updateUserNotificationSettings
} from '@/lib/notifications';

const settings = await getUserNotificationSettings(userId);
await updateUserNotificationSettings(userId, newSettings);
```

### 백엔드 함수들

#### 알림 생성
```sql
-- 직접 생성
INSERT INTO notifications (user_id, type, title, content, priority)
VALUES (123, 'system', '제목', '내용', 'normal');

-- 큐를 통한 생성 (권장)
INSERT INTO notification_queue (user_id, notification_data)
VALUES (123, '{"type": "system", "title": "제목", "content": "내용"}');
```

#### 배치 처리
```sql
-- 큐 처리
SELECT process_notification_queue(100);

-- 정리 실행
SELECT execute_notification_cleanup();

-- 성능 통계 조회
SELECT * FROM get_notification_performance_stats();
```

---

## 📈 확장 계획

### 단계별 개선 방안

#### Phase 1: 기본 기능 (완료)
- ✅ 실시간 알림 시스템
- ✅ 사용자 설정
- ✅ 관리자 도구

#### Phase 2: 고급 기능
- 📧 이메일 알림 연동
- 📱 모바일 Push 알림
- 🔍 알림 검색 기능
- 📊 고급 분석 도구

#### Phase 3: 엔터프라이즈
- 🏢 부서별 알림 관리
- 🤖 AI 기반 스마트 알림
- 📈 예측 분석
- 🔄 외부 시스템 연동

---

## 📞 지원 및 문의

### 개발팀 연락처
- **기술 문의**: [기술지원 이메일]
- **버그 신고**: [버그신고 이메일]
- **기능 요청**: [기능요청 이메일]

### 유용한 링크
- [Supabase 공식 문서](https://supabase.io/docs)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

---

**마지막 업데이트**: 2024년 12월
**버전**: 1.0.0
**담당자**: Claude AI Assistant

> 이 문서는 정기적으로 업데이트됩니다. 최신 정보는 개발팀에 문의하세요.