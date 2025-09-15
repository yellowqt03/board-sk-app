'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export default function TestNotificationsPage() {
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
      addResult(`현재 사용자: ID ${currentUser?.id}, 사번 ${currentUser?.employee_id}`);
    } catch (error) {
      addResult(`사용자 로드 오류: ${error}`);
    }
  };

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 1. 데이터베이스 연결 테스트
  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, employee_id, name')
        .limit(5);

      if (error) {
        addResult(`❌ DB 연결 오류: ${error.message}`);
      } else {
        addResult(`✅ DB 연결 성공: ${data?.length}명의 사용자 조회됨`);
        data?.forEach(u => addResult(`  - 사용자: ID ${u.id}, 사번 ${u.employee_id}, 이름 ${u.name}`));
      }
    } catch (error) {
      addResult(`❌ DB 테스트 실패: ${error}`);
    }
    setLoading(false);
  };

  // 2. notifications 테이블 확인
  const testNotificationsTable = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        addResult(`❌ 알림 테이블 오류: ${error.message}`);
      } else {
        addResult(`✅ 알림 테이블 조회 성공: ${data?.length}개의 알림`);
        data?.forEach(n => addResult(`  - 알림: "${n.title}" (사용자 ${n.user_id})`));
      }
    } catch (error) {
      addResult(`❌ 알림 테이블 테스트 실패: ${error}`);
    }
    setLoading(false);
  };

  // 3. 테스트 알림 생성
  const createTestNotification = async () => {
    if (!user) {
      addResult('❌ 로그인된 사용자가 없습니다');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'system',
          title: '🧪 코드 테스트 알림',
          content: `${new Date().toLocaleString()}에 생성된 테스트 알림입니다.`,
          priority: 'normal'
        })
        .select()
        .single();

      if (error) {
        addResult(`❌ 테스트 알림 생성 오류: ${error.message}`);
      } else {
        addResult(`✅ 테스트 알림 생성 성공: ID ${data.id}`);
      }
    } catch (error) {
      addResult(`❌ 테스트 알림 생성 실패: ${error}`);
    }
    setLoading(false);
  };

  // 4. Realtime 연결 테스트
  const testRealtimeConnection = async () => {
    if (!user) {
      addResult('❌ 로그인된 사용자가 없습니다');
      return;
    }

    addResult('🔄 Realtime 연결 테스트 시작...');

    const channel = supabase
      .channel(`test-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addResult(`🎉 Realtime 이벤트 수신 성공!`);
          addResult(`  - 새 알림: "${payload.new.title}"`);
        }
      )
      .subscribe((status) => {
        addResult(`📡 Realtime 상태: ${status}`);
      });

    // 5초 후 테스트 알림 생성
    setTimeout(async () => {
      addResult('🔄 Realtime 테스트용 알림 생성 중...');
      await createTestNotification();

      // 10초 후 채널 정리
      setTimeout(() => {
        supabase.removeChannel(channel);
        addResult('🔄 Realtime 테스트 종료');
      }, 10000);
    }, 5000);
  };

  // 5. 모든 테스트 실행
  const runAllTests = async () => {
    setTestResults([]);
    addResult('🚀 알림 시스템 전체 테스트 시작');

    await testDatabaseConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testNotificationsTable();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testRealtimeConnection();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔧 알림 시스템 테스트</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">테스트 메뉴</h2>
          <div className="space-y-4">
            <button
              onClick={testDatabaseConnection}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              1. 데이터베이스 연결 테스트
            </button>

            <button
              onClick={testNotificationsTable}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              2. 알림 테이블 확인
            </button>

            <button
              onClick={createTestNotification}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              3. 테스트 알림 생성
            </button>

            <button
              onClick={testRealtimeConnection}
              disabled={loading}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
            >
              4. Realtime 연결 테스트
            </button>

            <button
              onClick={runAllTests}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              🚀 전체 테스트 실행
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">테스트 결과</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">테스트를 실행하려면 위의 버튼을 클릭하세요.</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>

          {loading && (
            <div className="mt-4 flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              테스트 실행 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}