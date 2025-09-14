# 🏢 사내 통합 게시판 시스템

이 프로젝트는 사내 게시판 시스템을 Next.js와 Supabase로 구현한 것입니다.

## ✨ 주요 기능

- **📋 다양한 게시판**: 공지사항, 익명게시판, 자유게시판
- **📎 첨부파일**: PNG 파일 업로드/다운로드 지원
- **🔐 사용자 인증**: JWT 기반 로그인/로그아웃
- **👥 권한 관리**: 일반 사용자와 관리자 구분
- **📱 반응형 디자인**: 모바일과 데스크톱 지원

## 🛠 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일에 Supabase 설정이 포함되어 있습니다.

### 3. 데이터베이스 설정
`sql/` 폴더의 스크립트를 Supabase SQL Editor에서 순서대로 실행:
- `step2_users_admin.sql`
- `step3_attachments_table.sql`
- `step4_rls_policies.sql`
- `step5_storage_policies.sql`

### 4. Storage 버킷 생성
Supabase에서 `attachments` 버킷 생성 (Public)

### 5. 개발 서버 실행
```bash
npm run dev
```

## 📋 테스트 계정

- **관리자**: 사번 `2`, 비밀번호 `test123`
- **일반 사용자**: 사번 `1475`, 비밀번호 `test123`

## 🔧 주요 디렉토리

- `src/app/` - Next.js 페이지
- `src/components/` - 재사용 컴포넌트
- `src/lib/` - 유틸리티 함수
- `sql/` - 데이터베이스 설정 스크립트

## 📊 데이터베이스 스키마

- **departments**: 부서 정보
- **users**: 사용자 인증 정보 (관리자 권한 포함)
- **posts**: 게시글 정보
- **comments**: 댓글 정보
- **announcements**: 공지사항 정보
- **announcement_attachments**: 첨부파일 정보

## 🚀 배포

GitHub `main` 브랜치에 push시 Vercel 자동 배포

## 📝 사용법

1. 관리자 계정으로 로그인
2. 공지사항 작성 시 첨부파일 업로드 가능
3. 업로드된 파일은 게시글에서 다운로드 가능