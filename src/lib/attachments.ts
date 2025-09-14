import { supabase } from './supabase';
import type { UploadedFile } from '@/components/FileUpload';

export interface AttachmentRecord {
  id: number;
  announcement_id: number;
  file_name: string;
  original_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_at: string;
  uploaded_by: number;
}

/**
 * 첨부파일을 Supabase Storage에 업로드합니다.
 */
export async function uploadAttachment(
  file: File,
  announcementId: number,
  userId: number
): Promise<AttachmentRecord | null> {
  try {
    // 고유한 파일명 생성
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const storagePath = `announcements/${announcementId}/${fileName}`;

    // Storage에 파일 업로드
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage 업로드 오류:', uploadError);
      return null;
    }

    // 데이터베이스에 첨부파일 정보 저장
    const { data, error: dbError } = await supabase
      .from('announcement_attachments')
      .insert({
        announcement_id: announcementId,
        file_name: fileName,
        original_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        uploaded_by: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      // Storage에서 파일 삭제 (롤백)
      await supabase.storage.from('attachments').remove([storagePath]);
      return null;
    }

    return data;
  } catch (error) {
    console.error('첨부파일 업로드 실패:', error);
    return null;
  }
}

/**
 * 여러 첨부파일을 일괄 업로드합니다.
 */
export async function uploadMultipleAttachments(
  files: UploadedFile[],
  announcementId: number,
  userId: number
): Promise<AttachmentRecord[]> {
  const results: AttachmentRecord[] = [];

  for (const uploadedFile of files) {
    const result = await uploadAttachment(uploadedFile.file, announcementId, userId);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * 공지사항의 첨부파일 목록을 가져옵니다.
 */
export async function getAnnouncementAttachments(
  announcementId: number
): Promise<AttachmentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('announcement_attachments')
      .select('*')
      .eq('announcement_id', announcementId)
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('첨부파일 목록 조회 오류:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('첨부파일 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 첨부파일 다운로드 URL을 생성합니다.
 */
export async function getAttachmentDownloadUrl(
  storagePath: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600); // 1시간 유효

    if (error) {
      console.error('다운로드 URL 생성 오류:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('다운로드 URL 생성 실패:', error);
    return null;
  }
}

/**
 * 첨부파일을 삭제합니다.
 */
export async function deleteAttachment(attachmentId: number): Promise<boolean> {
  try {
    // 먼저 첨부파일 정보를 가져옴
    const { data: attachment, error: fetchError } = await supabase
      .from('announcement_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      console.error('첨부파일 정보 조회 오류:', fetchError);
      return false;
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error('Storage 파일 삭제 오류:', storageError);
      // Storage 오류가 있어도 데이터베이스 레코드는 삭제 시도
    }

    // 데이터베이스에서 레코드 삭제
    const { error: dbError } = await supabase
      .from('announcement_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('데이터베이스 레코드 삭제 오류:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('첨부파일 삭제 실패:', error);
    return false;
  }
}

/**
 * 공지사항의 모든 첨부파일을 삭제합니다.
 */
export async function deleteAnnouncementAttachments(
  announcementId: number
): Promise<boolean> {
  try {
    const attachments = await getAnnouncementAttachments(announcementId);

    for (const attachment of attachments) {
      await deleteAttachment(attachment.id);
    }

    return true;
  } catch (error) {
    console.error('공지사항 첨부파일 일괄 삭제 실패:', error);
    return false;
  }
}

/**
 * 파일 타입에 따른 아이콘을 반환합니다.
 */
export function getFileTypeIcon(fileType: string): string {
  const iconMap: { [key: string]: string } = {
    'application/pdf': '📄',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'application/vnd.ms-powerpoint': '📋',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📋',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
    'image/gif': '🖼️',
  };

  return iconMap[fileType] || '📄';
}

/**
 * 파일 크기를 읽기 쉬운 형태로 포맷팅합니다.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}