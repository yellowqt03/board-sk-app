-- 사내 통합 게시판 데이터베이스 스키마 (완전한 버전)
-- 전체 직원 데이터를 기반으로 생성

-- 1. 부서 정보 테이블
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 직급 정보 테이블
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    level INTEGER NOT NULL, -- 1: 사원, 2: 대리, 3: 과장, 4: 부장, 5: 임원
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 사원 마스터 테이블
CREATE TABLE employee_master (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    department_id INTEGER REFERENCES departments(id),
    position_id INTEGER REFERENCES positions(id),
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_by INTEGER,
    approved_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 4. 사용자 계정 테이블
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE REFERENCES employee_master(employee_id),
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 게시판 카테고리 테이블
CREATE TABLE board_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- official, anonymous
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 공지사항 테이블
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- urgent, normal
    category_id INTEGER REFERENCES board_categories(id),
    author_id INTEGER REFERENCES employee_master(id),
    target_departments INTEGER[], -- 부서 ID 배열
    target_positions INTEGER[], -- 직급 ID 배열
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 익명 게시글 테이블
CREATE TABLE anonymous_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category_id INTEGER REFERENCES board_categories(id),
    author_employee_id VARCHAR(20) REFERENCES employee_master(employee_id),
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 익명 댓글 테이블
CREATE TABLE anonymous_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES anonymous_posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_employee_id VARCHAR(20) REFERENCES employee_master(employee_id),
    parent_comment_id INTEGER REFERENCES anonymous_comments(id),
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 첨부파일 테이블
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 알림 테이블
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employee_master(id),
    type VARCHAR(50) NOT NULL, -- announcement, keyword_alert, system
    title VARCHAR(200) NOT NULL,
    content TEXT,
    data JSONB, -- 추가 데이터
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- 11. 키워드 알림 설정 테이블
CREATE TABLE keyword_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employee_master(id),
    keyword VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. 알림 설정 테이블
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employee_master(id),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    keyword_alerts BOOLEAN DEFAULT true,
    announcement_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_employee_master_employee_id ON employee_master(employee_id);
CREATE INDEX idx_employee_master_department ON employee_master(department_id);
CREATE INDEX idx_employee_master_position ON employee_master(position_id);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_anonymous_posts_created_at ON anonymous_posts(created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE employee_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 기본 데이터 삽입 (완전한 부서명)
INSERT INTO departments (name) VALUES
('의국'), ('약제과'), ('총무과'), ('임상병리실'), ('예약/콜/고객관리'),
('방사선실'), ('수술실'), ('원무'), ('심사'), ('외래'),
('진료협력센터'), ('통합진료실'), ('건강증진센터'), ('대외협력본부'), ('5층상급병동'),
('6층통합병동'), ('5층통합병동'), ('SEROUM'), ('의국지원'), ('전산'),
('감염관리실'), ('시설관리'), ('내시경센터'), ('법인사무국'), ('마케팅'),
('장애인스포츠단'), ('일반검진센터');

INSERT INTO positions (name, level) VALUES
('사원', 1), ('대리', 2), ('과장', 3), ('부장', 4), ('임원', 5);

INSERT INTO board_categories (name, type) VALUES
('전체 공지사항', 'official'),
('부서별 공지사항', 'official'),
('직급별 공지사항', 'official'),
('자유게시판', 'anonymous'),
('건의사항', 'anonymous'),
('일상공유', 'anonymous'),
('불만사항', 'anonymous');
