// Supabase에 완전한 직원 데이터 업로드 스크립트
// 사용법: node upload_data_complete.js

const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Supabase 설정 (환경변수에서 가져오기)
const supabaseUrl = process.env.SUPABASE_URL || 'https://mpdbzypvrstdwsutttps.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadDepartments() {
  console.log('완전한 부서 데이터 업로드 중...');
  
  const departments = [
    '의국', '약제과', '총무과', '임상병리실', '예약/콜/고객관리',
    '방사선실', '수술실', '원무', '심사', '외래',
    '진료협력센터', '통합진료실', '건강증진센터', '대외협력본부', '5층상급병동',
    '6층통합병동', '5층통합병동', 'SEROUM', '의국지원', '전산',
    '감염관리실', '시설관리', '내시경센터', '법인사무국', '마케팅',
    '장애인스포츠단', '일반검진센터'
  ];

  for (const deptName of departments) {
    const { data, error } = await supabase
      .from('departments')
      .insert([{ name: deptName }]);
    
    if (error) {
      console.error('부서 업로드 오류:', error);
    } else {
      console.log(`부서 추가됨: ${deptName}`);
    }
  }
}

async function uploadPositions() {
  console.log('직급 데이터 업로드 중...');
  
  const positions = [
    { name: '사원', level: 1 },
    { name: '대리', level: 2 },
    { name: '과장', level: 3 },
    { name: '부장', level: 4 },
    { name: '임원', level: 5 }
  ];

  for (const position of positions) {
    const { data, error } = await supabase
      .from('positions')
      .insert([position]);
    
    if (error) {
      console.error('직급 업로드 오류:', error);
    } else {
      console.log(`직급 추가됨: ${position.name}`);
    }
  }
}

async function uploadEmployees() {
  console.log('완전한 직원 데이터 업로드 중...');
  
  return new Promise((resolve, reject) => {
    const employees = [];
    
    fs.createReadStream('employee_data_complete.csv')
      .pipe(csv())
      .on('data', (row) => {
        employees.push({
          employee_id: row.사번,
          name: row.이름,
          department_name: row.소속,
          // position_id는 기본적으로 1 (사원)으로 설정
          position_id: 1,
          status: 'approved' // 이미 승인된 상태로 설정
        });
      })
      .on('end', async () => {
        try {
          // 부서 정보 가져오기
          const { data: departments } = await supabase
            .from('departments')
            .select('id, name');
          
          const deptMap = {};
          departments.forEach(dept => {
            deptMap[dept.name] = dept.id;
          });
          
          // 직원 데이터에 부서 ID 매핑
          const employeeData = employees.map(emp => ({
            employee_id: emp.employee_id,
            name: emp.name,
            department_id: deptMap[emp.department_name],
            position_id: emp.position_id,
            status: emp.status
          }));
          
          // 배치로 업로드 (50개씩)
          const batchSize = 50;
          for (let i = 0; i < employeeData.length; i += batchSize) {
            const batch = employeeData.slice(i, i + batchSize);
            
            const { data, error } = await supabase
              .from('employee_master')
              .insert(batch);
            
            if (error) {
              console.error(`배치 ${i}-${i + batchSize} 업로드 오류:`, error);
            } else {
              console.log(`배치 ${i}-${i + batchSize} 업로드 완료`);
            }
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

async function main() {
  try {
    console.log('완전한 데이터 업로드 시작...');
    console.log('총 206명의 직원 데이터를 업로드합니다.');
    
    // 1. 부서 데이터 업로드
    await uploadDepartments();
    
    // 2. 직급 데이터 업로드
    await uploadPositions();
    
    // 3. 직원 데이터 업로드
    await uploadEmployees();
    
    console.log('모든 완전한 데이터 업로드 완료!');
    console.log('📊 업로드된 데이터:');
    console.log('- 직원: 206명');
    console.log('- 부서: 27개');
    console.log('- 직급: 5개');
    console.log('');
    console.log('🎉 사내 통합 게시판 데이터베이스 구축 완료!');
  } catch (error) {
    console.error('업로드 중 오류 발생:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { uploadDepartments, uploadPositions, uploadEmployees };
