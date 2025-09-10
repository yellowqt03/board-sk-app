# 📁 프로젝트 구조 가이드

사내 통합 게시판 프로젝트의 정리된 폴더 구조입니다.

## 🏗️ 전체 구조

```
board-sk-app/
├── 📁 data/                    # 데이터베이스 관련 파일들
│   ├── 📄 employee_data.csv    # 직원 데이터 (206명)
│   ├── 📄 departments.csv      # 부서 데이터 (27개)
│   ├── 📄 positions.csv        # 직급 데이터 (5개)
│   ├── 📄 database_schema.sql  # 데이터베이스 스키마
│   ├── 📄 upload_data.js       # 데이터 업로드 스크립트
│   └── 📄 DATA_GUIDE.md        # 데이터 업로드 가이드
├── 📁 src/                     # 소스 코드
├── 📁 public/                  # 정적 파일
├── 📁 node_modules/            # 의존성 패키지
├── 📄 package.json             # 프로젝트 설정
├── 📄 next.config.ts           # Next.js 설정
├── 📄 tsconfig.json            # TypeScript 설정
├── 📄 prd.md                   # 제품 요구사항 문서
├── 📄 README.md                # 프로젝트 설명
└── 📄 excel-to-csv-converter.html # 엑셀 변환 도구
```

## 📊 데이터 폴더 상세

### `/data/` 폴더 내용
- **`employee_data.csv`** - 206명의 직원 정보 (사번, 이름, 부서)
- **`departments.csv`** - 27개 부서 정보
- **`positions.csv`** - 5개 직급 정보 (사원~임원)
- **`database_schema.sql`** - Supabase 데이터베이스 스키마
- **`upload_data.js`** - 자동 데이터 업로드 스크립트
- **`DATA_GUIDE.md`** - 상세한 데이터 업로드 가이드

## 🚀 사용 방법

### 1. 데이터베이스 설정
```bash
# Supabase 대시보드에서 실행
cat data/database_schema.sql
```

### 2. 데이터 업로드
```bash
# 환경변수 설정 후
cd data
node upload_data.js
```

### 3. 개발 서버 실행
```bash
# 프로젝트 루트에서
npm run dev
```

## 📋 파일 설명

### 프로젝트 설정 파일들
- `package.json` - 프로젝트 의존성 및 스크립트
- `next.config.ts` - Next.js 설정
- `tsconfig.json` - TypeScript 설정
- `eslint.config.mjs` - 코드 품질 도구
- `postcss.config.mjs` - CSS 처리 도구

### 문서 파일들
- `prd.md` - 제품 요구사항 문서 (360줄)
- `README.md` - 프로젝트 개요
- `PROJECT_STRUCTURE.md` - 이 파일 (프로젝트 구조 설명)

### 개발 도구
- `excel-to-csv-converter.html` - 엑셀 파일을 CSV로 변환하는 도구

## 🎯 정리 완료 사항

### ✅ 삭제된 중복 파일들
- `employee_data_updated.csv` (51명) → `employee_data.csv` (206명)로 통합
- `departments_updated.csv` (21개) → `departments.csv` (27개)로 통합
- `database_schema_updated.sql` → `database_schema.sql`로 통합
- `upload_data_updated.js` → `upload_data.js`로 통합
- `DATA_UPLOAD_GUIDE.md` → `DATA_GUIDE.md`로 통합

### ✅ 개선된 구조
- 데이터 관련 파일들을 `/data/` 폴더로 분리
- 파일명을 간결하고 명확하게 변경
- 중복 파일 제거로 혼란 방지

## 📞 지원

프로젝트 구조에 대한 질문이 있으면:
1. `data/DATA_GUIDE.md` 참조
2. `prd.md`에서 전체 요구사항 확인
3. 각 폴더의 README 파일 확인

---

**🎉 깔끔하게 정리된 프로젝트 구조 완성!**
