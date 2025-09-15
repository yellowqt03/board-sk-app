'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import NavigationBar from '@/components/NavigationBar';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export default function AdminTestNotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      addResult(`✅ 현재 사용자: ID ${currentUser?.id}, 사번 ${currentUser?.employee_id}`);
    } catch (error) {
      addResult(`❌ 사용자 로드 오류: ${error}`);
    }
  };

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 1. 데이터베이스 연결 및 사용자 확인
  const testUsers = async () => {
    setLoading(true);
    try {
      // users 테이블 기본 정보
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, employee_id, is_admin')
        .order('id');

      if (usersError) {
        addResult(`❌ users 테이블 조회 오류: ${usersError.message}`);
      } else {
        addResult(`✅ users 테이블: ${users?.length}명의 사용자`);
        users?.forEach(u => {
          addResult(`  - ID ${u.id}: 사번 ${u.employee_id} ${u.is_admin ? '(관리자)' : '(일반)'}`);
        });
      }

      // employee_master 테이블 확인
      const { data: employees, error: employeesError } = await supabase
        .from('employee_master')
        .select('id, employee_id, name')
        .order('id');

      if (employeesError) {
        addResult(`❌ employee_master 테이블 조회 오류: ${employeesError.message}`);
      } else {
        addResult(`✅ employee_master 테이블: ${employees?.length}명의 직원`);
        employees?.forEach(e => {
          addResult(`  - ID ${e.id}: 사번 ${e.employee_id}, 이름 ${e.name}`);
        });
      }
    } catch (error) {
      addResult(`❌ 사용자 테스트 실패: ${error}`);
    }
    setLoading(false);
  };

  // 2. 알림 테이블 상태 확인
  const testNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        addResult(`❌ 알림 조회 오류: ${error.message}`);
      } else {
        addResult(`✅ 현재 ${data?.length}개의 알림 존재`);
        data?.forEach(n => {
          addResult(`  - "${n.title}" (사용자 ${n.user_id}, ${n.is_read ? '읽음' : '안읽음'})`);
        });
      }
    } catch (error) {
      addResult(`❌ 알림 테스트 실패: ${error}`);
    }
    setLoading(false);
  };

  // 3. 모든 사용자에게 테스트 알림 생성
  const createTestForAllUsers = async () => {
    setLoading(true);
    try {
      // 모든 사용자 조회 (users 테이블에서 ID와 employee_id만)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, employee_id');

      if (usersError) {
        addResult(`❌ 사용자 조회 실패: ${usersError.message}`);
        return;
      }

      addResult(`🔄 ${users?.length}명의 사용자에게 테스트 알림 생성 중...`);

      // 각 사용자에게 알림 생성
      for (const targetUser of users || []) {
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: targetUser.id,
            type: 'system',
            title: '🧪 관리자 테스트 알림',
            content: `${new Date().toLocaleString()} - 관리자가 생성한 테스트 알림입니다. (사용자 ID: ${targetUser.id})`,
            priority: 'normal'
          })
          .select()
          .single();

        if (error) {
          addResult(`❌ 사용자 ${targetUser.employee_id} 알림 생성 실패: ${error.message}`);
        } else {
          addResult(`✅ 사용자 ${targetUser.employee_id}에게 알림 생성됨 (알림 ID: ${data.id})`);
        }

        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      addResult(`🎉 모든 사용자에게 테스트 알림 생성 완료!`);
    } catch (error) {
      addResult(`❌ 테스트 알림 생성 실패: ${error}`);
    }
    setLoading(false);
  };

  // 4. Realtime 연결 테스트
  const testRealtime = () => {
    addResult(`🔄 Realtime 연결 테스트 시작...`);

    const channel = supabase
      .channel(`admin-test-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          addResult(`🎉 Realtime 이벤트 감지!`);
          addResult(`  - 새 알림: "${payload.new.title}" (사용자 ${payload.new.user_id})`);
        }
      )
      .subscribe((status) => {
        addResult(`📡 Realtime 상태: ${status}`);

        if (status === 'SUBSCRIBED') {
          addResult(`✅ Realtime 구독 성공! 이제 알림을 생성해보세요.`);
        }
      });

    // 30초 후 구독 해제
    setTimeout(() => {
      supabase.removeChannel(channel);
      addResult(`🔄 Realtime 테스트 종료`);
    }, 30000);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <NavigationBar showUserInfo={true} />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">🔧 알림 시스템 관리자 테스트</h1>
            <p className="text-gray-600 mt-2">실시간 알림 시스템의 상태를 확인하고 테스트합니다.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 테스트 컨트롤 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">테스트 메뉴</h2>
              <div className="space-y-3">
                <button
                  onClick={testUsers}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-left"
                >
                  1️⃣ 사용자 목록 확인
                </button>

                <button
                  onClick={testNotifications}
                  disabled={loading}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 text-left"
                >
                  2️⃣ 기존 알림 확인
                </button>

                <button
                  onClick={testRealtime}
                  disabled={loading}
                  className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-left"
                >
                  3️⃣ Realtime 연결 테스트
                </button>

                <button
                  onClick={createTestForAllUsers}
                  disabled={loading}
                  className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 text-left"
                >
                  4️⃣ 전체 사용자 테스트 알림 생성
                </button>

                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-600">실행 중...</span>
                  </div>
                )}
              </div>
            </div>

            {/* 테스트 결과 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">실시간 테스트 결과</h2>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="text-gray-500">테스트를 실행하려면 왼쪽 버튼을 클릭하세요.</div>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="mb-1 leading-relaxed">
                      {result}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 테스트 가이드</h3>
            <ol className="text-blue-800 space-y-2">
              <li><strong>1단계:</strong> "3️⃣ Realtime 연결 테스트" 먼저 실행</li>
              <li><strong>2단계:</strong> "4️⃣ 전체 사용자 테스트 알림 생성" 실행</li>
              <li><strong>3단계:</strong> 다른 브라우저 탭에서 일반 사용자로 로그인 후 알림 확인</li>
              <li><strong>4단계:</strong> 실시간 알림, 토스트, 브라우저 알림 작동 확인</li>
            </ol>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}