-- ==================== 5단계 ====================
-- Storage RLS 정책 설정 (첨부파일 업로드 오류 해결)
-- 4단계 완료 후 이 부분을 실행하세요

-- Storage RLS 정책 생성
-- attachments 버킷에 대한 업로드 및 조회 권한 설정

-- 1. 업로드 정책: 모든 사용자가 첨부파일을 업로드할 수 있음
CREATE POLICY "Anyone can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'attachments');

-- 2. 조회 정책: 모든 사용자가 첨부파일을 볼 수 있음
CREATE POLICY "Anyone can view attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'attachments');

-- 3. 삭제 정책: 관리자만 첨부파일을 삭제할 수 있음
CREATE POLICY "Admins can delete attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attachments' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )
);

-- 결과 확인
DO $$
BEGIN
  RAISE NOTICE '==== Storage 정책 설정 완료 ====';
  RAISE NOTICE '1. 첨부파일 업로드 권한: 모든 사용자';
  RAISE NOTICE '2. 첨부파일 조회 권한: 모든 사용자';
  RAISE NOTICE '3. 첨부파일 삭제 권한: 관리자만';
  RAISE NOTICE '';
  RAISE NOTICE '테스트: 공지사항에서 PNG 파일 업로드 시도';
  RAISE NOTICE '========================';
END $$;