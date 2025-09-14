# 📋 SQL 파일 가이드

## 🚀 첨부파일 기능 설정 (필수)

Supabase SQL Editor에서 다음 순서대로 실행하세요:

### 1단계: step2_users_admin.sql
```
사용자 관리자 권한 설정
```

### 2단계: step3_attachments_table.sql
```
첨부파일 테이블 생성
```

### 3단계: step4_rls_policies.sql
```
보안 정책 설정
```

## ✅ 설정 완료 후

1. Storage → New bucket → `attachments` (Private)
2. 테스트: 사번 2, 비밀번호 test123으로 로그인
3. 공지사항 작성에서 파일 첨부 테스트