# 🚀 Vercel 배포 가이드

## 📋 배포 전 체크리스트

### ✅ 완료된 항목들
- [x] Next.js 프로젝트 빌드 성공
- [x] Supabase 클라이언트 환경 변수 설정
- [x] Vercel 설정 파일 생성
- [x] 프로덕션 빌드 테스트 완료

## 🔧 배포 방법

### 방법 1: Vercel CLI 사용 (추천)

1. **Vercel 로그인**
   ```bash
   vercel login
   ```

2. **프로젝트 배포**
   ```bash
   vercel
   ```

3. **프로덕션 배포**
   ```bash
   vercel --prod
   ```

### 방법 2: Vercel 웹 대시보드 사용

1. **GitHub에 코드 푸시**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Vercel 웹사이트 접속**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인
   - "New Project" 클릭
   - GitHub 저장소 선택
   - 자동으로 배포 시작

## ⚙️ 환경 변수 설정

### Vercel 대시보드에서 설정:
1. 프로젝트 → Settings → Environment Variables
2. 다음 변수들 추가:

```
NEXT_PUBLIC_SUPABASE_URL = https://mpdbzypvrstdwsutttps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA
```

## 🎯 배포 후 확인사항

### 1. 기본 기능 테스트
- [ ] 메인 페이지 로드 확인
- [ ] 로그인 페이지 접근 확인
- [ ] 로그인 기능 테스트

### 2. 데이터베이스 연동 테스트
- [ ] 사번 2, 3, 163으로 로그인 테스트
- [ ] 사용자 정보가 Supabase에서 정상 조회되는지 확인

### 3. 성능 확인
- [ ] 페이지 로딩 속도 확인
- [ ] 모바일 반응형 확인

## 🔍 문제 해결

### 자주 발생하는 문제들:

1. **환경 변수 오류**
   - Vercel 대시보드에서 환경 변수 재설정
   - 빌드 로그에서 오류 메시지 확인

2. **빌드 실패**
   - 로컬에서 `npm run build` 재실행
   - 의존성 문제 확인

3. **Supabase 연결 오류**
   - Supabase 프로젝트 상태 확인
   - API 키 유효성 확인

## 📱 배포 URL

배포 완료 후 Vercel에서 제공하는 URL:
- 예: `https://board-sk-app-xxx.vercel.app`

## 🎉 배포 완료!

배포가 완료되면 실제 사용자들이 접근할 수 있는 웹 애플리케이션이 됩니다!
