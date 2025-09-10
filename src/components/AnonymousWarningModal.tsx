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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl">
        {/* 헤더 */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-yellow-800 flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              익명게시판 이용 시 주의사항
            </h2>
            <button
              onClick={onClose}
              className="text-yellow-600 hover:text-yellow-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="px-6 py-6">
          <div className="space-y-4 text-gray-700">
            <p className="text-base font-medium text-gray-900">
              🔒 익명게시판은 자유로운 의견 교환을 위한 공간입니다.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-medium text-yellow-800 mb-2 text-sm">⚠️ 하지만 다음 행위는 금지됩니다:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700 text-sm">
                <li>지나친 비방 및 욕설</li>
                <li>개인에 대한 마녀사냥</li>
                <li>회사에 대한 근거 없는 비난</li>
                <li>기타 부적절한 내용</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-800 mb-1 text-sm">📋 관리자 안내:</p>
              <p className="text-blue-700 text-sm">
                관리자는 필요시 작성자를 확인할 수 있으니 주의하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
          >
            확인하고 입장
          </button>
        </div>
      </div>
    </div>
  );
}
