-- 공지사항 첨부파일 기능을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS announcement_attachments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id
ON announcement_attachments(announcement_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 첨부파일을 조회할 수 있도록 설정
CREATE POLICY "Authenticated users can view attachments" ON announcement_attachments
FOR SELECT USING (auth.role() = 'authenticated');

-- 관리자만 첨부파일을 추가/수정/삭제할 수 있도록 설정
CREATE POLICY "Admin users can manage attachments" ON announcement_attachments
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (auth.jwt() ->> 'user_id')::INTEGER
    AND users.is_admin = true
  )
);