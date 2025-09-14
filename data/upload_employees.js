/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mpdbzypvrstdwsutttps.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadEmployees() {
  try {
    console.log('🚀 직원 데이터 업로드를 시작합니다...');

    // 1. 부서 데이터 먼저 업로드
    console.log('📁 부서 데이터 업로드 중...');
    const departments = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream('./departments.csv')
        .pipe(csv())
        .on('data', (row) => {
          departments.push({
            name: row.name.trim()
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // 부서 데이터 삽입
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .upsert(departments, { onConflict: 'name' })
      .select();

    if (deptError) {
      console.error('부서 데이터 업로드 오류:', deptError);
      return;
    }

    console.log(`✅ 부서 ${deptData.length}개 업로드 완료`);

    // 2. 직급 데이터 업로드
    console.log('👔 직급 데이터 업로드 중...');
    const positions = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream('./positions.csv')
        .pipe(csv())
        .on('data', (row) => {
          // 빈 행 건너뛰기
          if (!row.name || !row.level) return;
          
          positions.push({
            name: row.name.trim(),
            level: parseInt(row.level)
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // 직급 데이터 삽입
    const { data: posData, error: posError } = await supabase
      .from('positions')
      .upsert(positions, { onConflict: 'name' })
      .select();

    if (posError) {
      console.error('직급 데이터 업로드 오류:', posError);
      return;
    }

    console.log(`✅ 직급 ${posData.length}개 업로드 완료`);

    // 3. 직원 데이터 업로드
    console.log('👥 직원 데이터 업로드 중...');
    const employees = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream('./employee_data.csv')
        .pipe(csv())
        .on('data', (row) => {
          // 빈 행 건너뛰기
          if (!row.사번 || !row.이름 || !row.소속) return;
          
          // 부서 ID 찾기
          const department = deptData.find(d => d.name === row.소속.trim());
          const departmentId = department ? department.id : null;

          employees.push({
            employee_id: row.사번.trim(),
            name: row.이름.trim(),
            email: null, // 이메일은 나중에 설정
            department_id: departmentId,
            position_id: 1, // 기본 직급 (사원)
            is_active: true,
            status: 'approved', // 승인된 상태로 설정
            created_by: 1, // 관리자 ID
            approved_by: 1 // 관리자 ID
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 총 ${employees.length}명의 직원 데이터 처리 중...`);

    // 배치로 직원 데이터 삽입 (한 번에 100개씩)
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < employees.length; i += batchSize) {
      const batch = employees.slice(i, i + batchSize);
      
      const { data: empData, error: empError } = await supabase
        .from('employee_master')
        .upsert(batch, { onConflict: 'employee_id' })
        .select();

      if (empError) {
        console.error(`배치 ${Math.floor(i/batchSize) + 1} 업로드 오류:`, empError);
        errorCount += batch.length;
      } else {
        successCount += empData.length;
        console.log(`✅ 배치 ${Math.floor(i/batchSize) + 1} 완료: ${empData.length}명`);
      }
    }

    console.log(`\n🎉 업로드 완료!`);
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${errorCount}명`);

    // 4. 김민혁 계정 생성 (테스트용)
    console.log('\n🔧 김민혁 테스트 계정 생성 중...');
    
    // 김민혁 직원 정보 찾기
    const { data: kimData, error: kimError } = await supabase
      .from('employee_master')
      .select('id, employee_id, name')
      .eq('employee_id', '1475')
      .single();

    if (kimError || !kimData) {
      console.error('김민혁 직원 정보를 찾을 수 없습니다:', kimError);
      return;
    }

    // 김민혁 사용자 계정 생성
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        employee_id: '1475',
        password_hash: 'test1234', // 실제로는 해시화된 비밀번호여야 함
        email_verified: true
      }, { onConflict: 'employee_id' })
      .select();

    if (userError) {
      console.error('김민혁 사용자 계정 생성 오류:', userError);
    } else {
      console.log('✅ 김민혁 테스트 계정 생성 완료');
      console.log(`   사번: 1475`);
      console.log(`   비밀번호: test1234`);
    }

  } catch (error) {
    console.error('❌ 업로드 중 오류 발생:', error);
  }
}

// 실행
uploadEmployees();
