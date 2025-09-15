'use client';

import { useState } from 'react';

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const setupSystem = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/admin/setup-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || '설정에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          🔧 관리자 시스템 설정
        </h1>

        <div className="text-center mb-6">
          <p className="text-gray-600 mb-4">
            김민혁을 최고 관리자로 설정하고 권한 시스템을 초기화합니다.
          </p>

          <button
            onClick={setupSystem}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                설정 중...
              </>
            ) : (
              '시스템 설정 시작'
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium mb-2">❌ 설정 실패</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && result.success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-green-800 font-medium mb-3">✅ 설정 완료</h3>

            <div className="space-y-3">
              <div className="bg-white p-3 rounded border">
                <h4 className="text-sm font-medium text-gray-900 mb-2">로그인 정보</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>사번:</strong> {result.data.login_credentials.employee_id}</p>
                  <p><strong>비밀번호:</strong> {result.data.login_credentials.password}</p>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  ⚠️ {result.data.login_credentials.note}
                </p>
              </div>

              <div className="text-center mt-4">
                <a
                  href="/login"
                  className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  로그인 페이지로 이동
                </a>
              </div>
            </div>
          </div>
        )}

        {result && !result.success && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium mb-2">❌ 설정 실패</h3>
            <p className="text-red-700 text-sm">{result.message}</p>
            {result.details && (
              <p className="text-red-600 text-xs mt-1">{result.details}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>이 페이지는 초기 설정용입니다.</p>
          <p>설정 완료 후 삭제하는 것을 권장합니다.</p>
        </div>
      </div>
    </div>
  );
}