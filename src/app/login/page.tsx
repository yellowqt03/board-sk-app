'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setCurrentUser } from '@/lib/auth';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // 사번 입력 시 숫자만 허용하고 최대 4자리까지만 입력
    if (name === 'employeeId') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    // 에러 메시지 초기화
    if (error) setError('');
  };

  // 로그인 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 실제 인증 로직 실행
      const { user, error } = await login({
        employeeId: formData.employeeId,
        password: formData.password
      });

      if (error) {
        setError(error);
        return;
      }

      if (user) {
        // 사용자 정보 저장
        setCurrentUser(user);
        
        // 로그인 성공 시 메인 페이지로 이동
        router.push('/');
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 로고 및 제목 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-2xl text-white">🏥</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            SK 톡톡
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            사번으로 로그인하여 게시판을 이용하세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 사번 입력 */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                사번
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                required
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="사번 4자리를 입력하세요 (예: 2 또는 0002)"
                disabled={isLoading}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 추가 정보 */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              처음 이용하시나요?{' '}
              <button className="text-blue-600 hover:text-blue-500 font-medium">
                계정 등록
              </button>
            </p>
          </div>
        </div>

        {/* 도움말 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">로그인 도움말</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>• 사번은 숫자만 입력 (2 입력 시 자동으로 0002로 처리)</p>
                <p>• 테스트 사번: 2, 3, 163, 202, 267</p>
                <p>• 테스트 비밀번호: test123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
