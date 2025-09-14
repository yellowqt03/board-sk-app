# 📎 공지사항 첨부파일 기능 설정 가이드

## 🔧 Supabase Storage 설정 필요 사항

### 1. Storage 버킷 생성

Supabase 대시보드에서 다음 단계를 진행하세요:

1. **Storage 섹션** 접근
2. **New bucket** 클릭
3. **버킷 설정**:
   - Name: `attachments`
   - Public bucket: `false` (비공개)
   - File size limit: `10MB`
   - Allowed MIME types: 아래 참조

### 2. 허용된 파일 형식

```
- application/pdf
- application/msword
- application/vnd.openxmlformats-officedocument.wordprocessingml.document
- application/vnd.ms-excel
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- application/vnd.ms-powerpoint
- application/vnd.openxmlformats-officedocument.presentationml.presentation
- image/jpeg
- image/png
- image/gif
```

### 3. RLS (Row Level Security) 정책

`sql/add_attachments.sql` 파일을 Supabase SQL Editor에서 실행하세요.

### 4. Storage 정책 설정

Supabase Storage 정책에서 다음을 추가:

#### 업로드 정책 (관리자만)
```sql
CREATE POLICY "Admin can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attachments' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

#### 다운로드 정책 (인증된 사용자)
```sql
CREATE POLICY "Authenticated users can download attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);
```

#### 삭제 정책 (관리자만)
```sql
CREATE POLICY "Admin can delete attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attachments' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

## 📋 기능 명세

### ✅ 구현된 기능

1. **파일 업로드**
   - 드래그 앤 드롭 지원
   - 다중 파일 선택 (최대 5개)
   - 파일 크기 제한 (10MB per file)
   - 실시간 파일 검증

2. **파일 관리**
   - 업로드 전 파일 미리보기
   - 파일 제거 기능
   - 파일 타입별 아이콘 표시

3. **데이터베이스 연동**
   - 첨부파일 메타데이터 저장
   - 공지사항과 첨부파일 관계 설정
   - 자동 파일명 생성 (중복 방지)

4. **다운로드 기능**
   - 보안된 다운로드 URL 생성
   - 원본 파일명 유지
   - 다운로드 진행상태 표시

5. **통합 UI**
   - 공지사항 작성/수정 페이지 통합
   - 공지사항 조회 시 첨부파일 목록 표시
   - 반응형 디자인

### 🎯 사용 방법

#### 관리자 (공지사항 작성)
1. 공지사항 작성 페이지 접근
2. 첨부파일 섹션에서 파일 업로드
3. 드래그 앤 드롭 또는 클릭하여 파일 선택
4. 공지사항 작성 완료 후 자동 업로드

#### 일반 사용자 (파일 다운로드)
1. 공지사항 상세 페이지 접근
2. 첨부파일 섹션에서 원하는 파일 선택
3. 다운로드 버튼 클릭
4. 파일 자동 다운로드

### 🔒 보안 고려사항

- **파일 타입 검증**: 허용된 MIME 타입만 업로드
- **파일 크기 제한**: 10MB 이하만 허용
- **권한 기반 접근**: 관리자만 업로드, 인증된 사용자만 다운로드
- **고유 파일명**: 타임스탬프 + 랜덤 문자열로 중복 방지
- **RLS 정책**: 데이터베이스 레벨 보안 적용

### 📊 데이터베이스 스키마

```sql
-- 첨부파일 테이블
CREATE TABLE announcement_attachments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,        -- Storage에 저장된 파일명
  original_name VARCHAR(255) NOT NULL,    -- 사용자가 업로드한 원본 파일명
  file_size BIGINT NOT NULL,              -- 파일 크기 (bytes)
  file_type VARCHAR(100) NOT NULL,        -- MIME 타입
  storage_path TEXT NOT NULL,             -- Storage 경로
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);
```

### 🚀 다음 단계

이 기능을 확장하려면:

1. **이미지 썸네일**: 이미지 파일 미리보기 생성
2. **파일 압축**: 대용량 파일 자동 압축
3. **바이러스 스캔**: 업로드된 파일 보안 검사
4. **버전 관리**: 첨부파일 수정 내역 추적
5. **일괄 다운로드**: 여러 파일 ZIP으로 다운로드

---

## ⚠️ 주의사항

- 첫 사용 전 반드시 Supabase Storage 버킷을 생성하세요
- 환경변수 설정이 올바른지 확인하세요
- 파일 업로드 실패 시 콘솔 로그를 확인하세요
- 프로덕션 배포 전 파일 업로드/다운로드 테스트를 진행하세요