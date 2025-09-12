'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { displayEmployeeId } from '@/lib/utils';

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('테스트 중...');
  const [tables, setTables] = useState<string[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // 1. 연결 테스트
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .limit(1);

      if (error) {
        setConnectionStatus(`❌ 연결 실패: ${error.message}`);
        return;
      }

      setConnectionStatus('✅ 데이터베이스 연결 성공!');

      // 2. 테이블 목록 조회
      const { data: tableData, error: tableError } = await supabase
        .rpc('get_table_names');

      if (!tableError && tableData) {
        setTables(tableData);
      }

      // 3. 부서 데이터 조회
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (!deptError && deptData) {
        setDepartments(deptData);
      }

      // 4. 사원 데이터 조회
      const { data: empData, error: empError } = await supabase
        .from('employee_master')
        .select(`
          *,
          departments(name),
          positions(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!empError && empData) {
        setEmployees(empData);
      }

    } catch (error) {
      setConnectionStatus(`❌ 오류 발생: ${error}`);
    }
  };

  const createSampleData = async () => {
    try {
      // 샘플 부서 데이터 생성
      const { error: deptError } = await supabase
        .from('departments')
        .upsert([
          { name: '개발팀', description: '소프트웨어 개발 및 유지보수' },
          { name: '마케팅팀', description: '마케팅 전략 수립 및 실행' },
          { name: '인사팀', description: '인사 관리 및 채용' },
          { name: '경영지원팀', description: '경영 지원 및 관리' },
          { name: '영업팀', description: '영업 활동 및 고객 관리' }
        ]);

      if (deptError) throw deptError;

      // 샘플 직급 데이터 생성
      const { error: posError } = await supabase
        .from('positions')
        .upsert([
          { name: '사원', level: 1 },
          { name: '대리', level: 2 },
          { name: '과장', level: 3 },
          { name: '부장', level: 4 },
          { name: '이사', level: 5 }
        ]);

      if (posError) throw posError;

      alert('✅ 샘플 데이터가 성공적으로 생성되었습니다!');
      testConnection(); // 데이터 새로고침

    } catch (error) {
      alert(`❌ 샘플 데이터 생성 실패: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 데이터베이스 연결 테스트
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">연결 상태</h3>
              <p className="text-blue-700">{connectionStatus}</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={testConnection}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                🔄 다시 테스트
              </button>
              <button
                onClick={createSampleData}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                📊 샘플 데이터 생성
              </button>
            </div>
          </div>
        </div>

        {/* 부서 데이터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🏢 부서 데이터 ({departments.length}개)
          </h2>
          {departments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      부서명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      설명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((dept) => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dept.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(dept.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">부서 데이터가 없습니다.</p>
          )}
        </div>

        {/* 사원 데이터 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            👥 사원 데이터 ({employees.length}명)
          </h2>
          {employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사번
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      부서
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      직급
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {displayEmployeeId(emp.employee_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emp.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.departments?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.positions?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          emp.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {emp.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">사원 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}





