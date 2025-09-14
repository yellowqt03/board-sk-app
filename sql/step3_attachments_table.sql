-- ==================== 3단계 ====================
-- announcement_attachments 테이블 생성
-- 2단계 완료 후 이 부분을 실행하세요

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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id
ON announcement_attachments(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_attachments_uploaded_at
ON announcement_attachments(uploaded_at DESC);

-- 결과 확인
DO $$
BEGIN
  RAISE NOTICE '3단계: announcement_attachments 테이블 생성 완료';
  RAISE NOTICE '현재 첨부파일 수: %', (SELECT COUNT(*) FROM announcement_attachments);
END $$;