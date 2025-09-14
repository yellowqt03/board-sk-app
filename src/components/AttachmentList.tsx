'use client';

import { useState, useEffect } from 'react';
import { getAnnouncementAttachments, getAttachmentDownloadUrl, getFileTypeIcon, formatFileSize, type AttachmentRecord } from '@/lib/attachments';

interface AttachmentListProps {
  announcementId: number;
  showTitle?: boolean;
}

export default function AttachmentList({ announcementId, showTitle = true }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAttachments();
  }, [announcementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const attachmentList = await getAnnouncementAttachments(announcementId);
      setAttachments(attachmentList);

      // 디버깅 로그
      console.log(`공지사항 ${announcementId}의 첨부파일 조회 결과:`, attachmentList);

      if (attachmentList.length === 0) {
        console.log('첨부파일이 없습니다. 가능한 원인:');
        console.log('1. 실제로 첨부파일이 없음');
        console.log('2. announcement_attachments 테이블이 생성되지 않음');
        console.log('3. RLS 정책 문제로 조회 권한 없음');
        console.log('해결방법: sql/ 폴더의 설정 스크립트 실행 필요');
      }

    } catch (error) {
      console.error('첨부파일 목록 로드 실패:', error);
      console.error('Supabase 설정을 확인해주세요. sql/ 폴더의 설정 스크립트 실행 필요');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: AttachmentRecord) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(attachment.id));

      const downloadUrl = await getAttachmentDownloadUrl(attachment.storage_path);
      if (!downloadUrl) {
        alert('파일 다운로드 URL을 생성할 수 없습니다.');
        return;
      }

      // 새 탭에서 다운로드 링크 열기
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.original_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachment.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-purple-600 rounded-full"></div>
        <span className="text-sm">첨부파일 불러오는 중...</span>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <h4 className="text-lg font-medium text-gray-900 flex items-center">
          📎 첨부파일 ({attachments.length}개)
        </h4>
      )}

      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <span className="text-2xl flex-shrink-0">
                {getFileTypeIcon(attachment.file_type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {attachment.original_name}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>•</span>
                  <span>{new Date(attachment.uploaded_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDownload(attachment)}
              disabled={downloadingFiles.has(attachment.id)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="다운로드"
            >
              {downloadingFiles.has(attachment.id) ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full"></div>
                  <span>다운로드 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>다운로드</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}