'use client';

import { useState } from 'react';

export default function DebugLoginPage() {
  const [employeeId, setEmployeeId] = useState('1475');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const debugLogin = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('/api/test/login-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId })
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: '네트워크 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          🔍 로그인 디버깅
        </h1>

        <div className="mb-6">
          <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
            사번 입력
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="사번을 입력하세요"
            />
            <button
              onClick={debugLogin}
              disabled={loading || !employeeId.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  분석 중...
                </>
              ) : (
                '디버그 실행'
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            {/* 디버그 정보 */}
            {result.debug && result.debug.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-3">🔍 디버그 과정</h3>
                <div className="space-y-1 text-sm font-mono">
                  {result.debug.map((item: string, index: number) => (
                    <div key={index} className="text-gray-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 발견된 데이터 */}
            {result.data && (
              <div className="space-y-3">
                {result.data.found_employee && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">✅ 발견된 직원 정보</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>사번:</strong> {result.data.found_employee.employee_id}</p>
                      <p><strong>이름:</strong> {result.data.found_employee.name}</p>
                      <p><strong>활성:</strong> {result.data.found_employee.is_active ? '예' : '아니오'}</p>
                      <p><strong>상태:</strong> {result.data.found_employee.status}</p>
                    </div>
                  </div>
                )}

                {result.data.user_accounts && result.data.user_accounts.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">🔐 사용자 계정</h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      {result.data.user_accounts.map((account: any, index: number) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <p><strong>사번:</strong> {account.employee_id}</p>
                          <p><strong>생성일:</strong> {new Date(account.created_at).toLocaleString('ko-KR')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.data.all_kim_min_hyuk && result.data.all_kim_min_hyuk.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">👤 김민혁 검색 결과</h4>
                    <div className="text-sm text-yellow-700 space-y-2">
                      {result.data.all_kim_min_hyuk.map((emp: any, index: number) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <p><strong>사번:</strong> {emp.employee_id}</p>
                          <p><strong>활성:</strong> {emp.is_active ? '예' : '아니오'}</p>
                          <p><strong>상태:</strong> {emp.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 실제 로그인 테스트 */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">🚀 실제 로그인 테스트</h4>
              <div className="space-y-2">
                <a
                  href="/login"
                  className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors text-sm"
                >
                  로그인 페이지로 이동
                </a>
                {result.data?.found_employee && (
                  <div className="text-sm text-purple-700 mt-2">
                    <p><strong>추천 사번:</strong> {result.data.found_employee.employee_id}</p>
                    <p><strong>비밀번호:</strong> admin123</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>이 페이지는 로그인 문제 해결용 디버깅 도구입니다.</p>
        </div>
      </div>
    </div>
  );
}