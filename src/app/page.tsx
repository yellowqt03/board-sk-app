'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentUser, logout } from '@/lib/auth';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'official' | 'anonymous'>('official');
  const currentUser = getCurrentUser();

  // 로그아웃 처리
  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">💬 SK 톡톡</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    안녕하세요, <span className="font-medium">{currentUser.name}</span>님
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('official')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'official'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏢 사내게시판
              </button>
              <button
                onClick={() => setActiveTab('anonymous')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'anonymous'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔒 익명게시판
              </button>
            </nav>
          </div>
        </div>

        {/* 공식 게시판 */}
        {activeTab === 'official' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 공지사항</h2>
              
              {/* 공지사항 목록 */}
              <div className="space-y-4">
                <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-red-800">🚨 긴급: 시스템 점검 안내</h3>
                      <p className="text-sm text-red-600 mt-1">내일 오후 2시부터 1시간 동안 시스템 점검이 예정되어 있습니다.</p>
                    </div>
                    <span className="text-xs text-red-500">2시간 전</span>
                  </div>
                </div>
                
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">📢 12월 휴가 신청 안내</h3>
                      <p className="text-sm text-blue-600 mt-1">12월 휴가 신청을 받고 있습니다. 12월 20일까지 신청해주세요.</p>
                    </div>
                    <span className="text-xs text-blue-500">1일 전</span>
                  </div>
                </div>
                
                <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-green-800">🎉 연말 회식 안내</h3>
                      <p className="text-sm text-green-600 mt-1">12월 28일 연말 회식이 예정되어 있습니다. 참석 여부를 알려주세요.</p>
                    </div>
                    <span className="text-xs text-green-500">3일 전</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 부서별 공지 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏢 부서별 공지</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900">개발팀</h3>
                  <p className="text-sm text-gray-600 mt-1">새로운 프로젝트 시작</p>
                  <span className="text-xs text-gray-400">1시간 전</span>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900">마케팅팀</h3>
                  <p className="text-sm text-gray-600 mt-1">홍보 자료 제작 완료</p>
                  <span className="text-xs text-gray-400">2시간 전</span>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900">인사팀</h3>
                  <p className="text-sm text-gray-600 mt-1">신입사원 오리엔테이션</p>
                  <span className="text-xs text-gray-400">3시간 전</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 익명 게시판 */}
        {activeTab === 'anonymous' && (
          <div className="space-y-6">
            {/* 주의문구 팝업 시뮬레이션 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800">익명게시판 이용 시 주의사항</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="mb-2">🔒 익명게시판은 자유로운 의견 교환을 위한 공간입니다.</p>
                    <p className="mb-2">⚠️ 하지만 다음 행위는 금지됩니다:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>지나친 비방 및 욕설</li>
                      <li>개인에 대한 마녀사냥</li>
                      <li>회사에 대한 근거 없는 비난</li>
                      <li>기타 부적절한 내용</li>
                    </ul>
                    <p className="mt-2">📋 관리자는 필요시 작성자를 확인할 수 있으니 주의하시기 바랍니다.</p>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700">
                      확인하고 입장
                    </button>
                    <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400">
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 익명 게시판 카테고리 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔒 익명 게시판</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    🗣️ 자유게시판
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">15</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">자유로운 의견을 나누는 공간</p>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    💡 건의사항
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">3</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">회사 개선을 위한 건의사항</p>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    😊 일상공유
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">8</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">일상적인 이야기를 나누는 공간</p>
                </div>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    😤 불만사항
                    <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">2</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">건설적인 불만사항을 제기하는 공간</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 (모바일) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('official')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'official'
                ? 'text-blue-600 border-t-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            🏢 사내게시판
          </button>
          <button
            onClick={() => setActiveTab('anonymous')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'anonymous'
                ? 'text-purple-600 border-t-2 border-purple-600'
                : 'text-gray-500'
            }`}
          >
            🔒 익명게시판
          </button>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
