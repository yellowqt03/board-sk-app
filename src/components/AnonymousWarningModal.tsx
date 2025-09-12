'use client';

import { useState } from 'react';

interface AnonymousWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AnonymousWarningModal({ isOpen, onClose, onConfirm }: AnonymousWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-gray-200">
        {/* 헤더 */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-3 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-yellow-800 flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              익명게시판 이용 시 주의사항
            </h2>
            <button
              onClick={onClose}
              className="text-yellow-600 hover:text-yellow-800 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="px-5 py-4">
          <div className="space-y-3 text-gray-700">
            <p className="text-sm font-medium text-gray-900">
              🔒 익명게시판은 자유로운 의견 교환을 위한 공간입니다.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-medium text-yellow-800 mb-2 text-xs">⚠️ 하지만 다음 행위는 금지됩니다:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700 text-xs">
                <li>지나친 비방 및 욕설</li>
                <li>개인에 대한 마녀사냥</li>
                <li>회사에 대한 근거 없는 비난</li>
                <li>기타 부적절한 내용</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-800 mb-1 text-xs">📋 관리자 안내:</p>
              <p className="text-blue-700 text-xs">
                관리자는 필요시 작성자를 확인할 수 있으니 주의하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-2 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-xs"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-xs"
          >
            확인하고 입장
          </button>
        </div>
      </div>
    </div>
  );
}
