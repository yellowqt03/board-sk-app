# 🏥 사내 통합 게시판

Next.js와 Supabase를 활용한 사내 통합 게시판 시스템입니다.

## 🚀 시작하기

### 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://mpdbzypvrstdwsutttps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA

# 애플리케이션 설정
NEXT_PUBLIC_APP_NAME=사내 통합 게시판
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 2. 데이터베이스 설정

Supabase 대시보드의 SQL Editor에서 `database_setup.sql` 파일의 내용을 실행하세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

## 📊 데이터베이스 스키마

- **departments**: 부서 정보
- **positions**: 직급 정보
- **employee_master**: 사원 마스터 데이터
- **users**: 사용자 인증 정보
- **posts**: 게시글 정보
- **comments**: 댓글 정보
- **notifications**: 알림 정보
- **likes**: 좋아요 정보

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Database**: PostgreSQL

## 📝 개발 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
