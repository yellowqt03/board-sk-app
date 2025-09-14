'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EmployeeData {
  사번: string;
  이름: string;
  부서: string;
  직급?: string;
  이메일?: string;
}

export default function UploadPage() {
  // const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 엑셀 파일 읽기 (간단한 CSV 형태로 가정)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // setFile(file);
    console.log('File selected:', file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      // const headers = lines[0].split(',').map(h => h.trim());
      
      const employeeData: EmployeeData[] = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            사번: values[0] || '',
            이름: values[1] || '',
            부서: values[2] || '',
            직급: values[3] || '사원',
            이메일: values[4] || `${values[0]}@company.com`
          };
        });
      
      setData(employeeData);
      setMessage(`총 ${employeeData.length}명의 사원 데이터를 읽었습니다.`);
    };
    
    reader.readAsText(file);
  };

  // 데이터베이스에 사원 데이터 업로드
  const uploadToDatabase = async () => {
    if (data.length === 0) {
      setMessage('업로드할 데이터가 없습니다.');
      return;
    }

    setLoading(true);
    setMessage('데이터를 업로드하는 중...');

    try {
      // 1. 부서 데이터 먼저 생성
      const departments = [...new Set(data.map(emp => emp.부서))];
      for (const deptName of departments) {
        const { error: deptError } = await supabase
          .from('departments')
          .upsert({ name: deptName, description: `${deptName} 부서` });
        
        if (deptError) {
          console.error('부서 생성 오류:', deptError);
        }
      }

      // 2. 직급 데이터 생성
      const positions = [...new Set(data.map(emp => emp.직급 || '사원'))];
      const positionLevels: { [key: string]: number } = {
        '사원': 1,
        '대리': 2,
        '과장': 3,
        '부장': 4,
        '이사': 5,
        '대표이사': 6
      };

      for (const posName of positions) {
        const { error: posError } = await supabase
          .from('positions')
          .upsert({ 
            name: posName, 
            level: positionLevels[posName] || 1 
          });
        
        if (posError) {
          console.error('직급 생성 오류:', posError);
        }
      }

      // 3. 사원 데이터 업로드
      const employeeData = data.map(emp => ({
        employee_id: emp.사번,
        name: emp.이름,
        email: emp.이메일 || `${emp.사번}@company.com`,
        department_id: null, // 부서 ID는 나중에 업데이트
        position_id: null,   // 직급 ID는 나중에 업데이트
        is_active: true,
        status: 'active',
        created_by: 'admin' // 임시 관리자 ID
      }));

      const { error: empError } = await supabase
        .from('employee_master')
        .upsert(employeeData);

      if (empError) {
        throw empError;
      }

      // 4. 부서 및 직급 ID 업데이트
      for (const emp of data) {
        // 부서 ID 조회
        const { data: deptData } = await supabase
          .from('departments')
          .select('id')
          .eq('name', emp.부서)
          .single();

        // 직급 ID 조회
        const { data: posData } = await supabase
          .from('positions')
          .select('id')
          .eq('name', emp.직급 || '사원')
          .single();

        // 사원 데이터 업데이트
        if (deptData && posData) {
          await supabase
            .from('employee_master')
            .update({
              department_id: deptData.id,
              position_id: posData.id
            })
            .eq('employee_id', emp.사번);
        }
      }

      setMessage(`✅ 성공적으로 ${data.length}명의 사원 데이터를 업로드했습니다!`);
      
    } catch (error) {
      console.error('업로드 오류:', error);
      setMessage(`❌ 업로드 중 오류가 발생했습니다: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            📊 사원 데이터 업로드
          </h1>
          
          <div className="space-y-6">
            {/* 파일 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                엑셀 파일 선택 (CSV 형식)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-gray-500">
                파일 형식: 사번, 이름, 부서, 직급, 이메일 (순서대로)
              </p>
            </div>

            {/* 미리보기 */}
            {data.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  데이터 미리보기 ({data.length}명)
                </h3>
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
                          부서
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          직급
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          이메일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.slice(0, 10).map((emp, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {emp.사번}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {emp.이름}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {emp.부서}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {emp.직급 || '사원'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {emp.이메일 || `${emp.사번}@company.com`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 10 && (
                    <p className="mt-2 text-sm text-gray-500">
                      ... 외 {data.length - 10}명 더
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 업로드 버튼 */}
            {data.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={uploadToDatabase}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '업로드 중...' : '데이터베이스에 업로드'}
                </button>
              </div>
            )}

            {/* 메시지 */}
            {message && (
              <div className={`p-4 rounded-md ${
                message.includes('성공') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : message.includes('오류')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





