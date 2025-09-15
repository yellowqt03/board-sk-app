import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { employeeId } = await request.json();
    const debugInfo: any[] = [];

    debugInfo.push(`🔍 로그인 디버깅 시작 - 입력 사번: ${employeeId}`);

    // 1. 원본 사번으로 조회
    debugInfo.push(`1️⃣ 원본 사번으로 조회: ${employeeId}`);
    const { data: originalEmployee, error: originalError } = await supabase
      .from('employee_master')
      .select('employee_id, name, is_active, status')
      .eq('employee_id', employeeId)
      .single();

    if (originalEmployee) {
      debugInfo.push(`✅ 원본 사번으로 발견: ${originalEmployee.name}`);
    } else {
      debugInfo.push(`❌ 원본 사번으로 찾기 실패: ${originalError?.message}`);
    }

    // 2. 4자리 패딩으로 조회
    const paddedEmployeeId = employeeId.padStart(4, '0');
    debugInfo.push(`2️⃣ 4자리 패딩으로 조회: ${paddedEmployeeId}`);
    const { data: paddedEmployee, error: paddedError } = await supabase
      .from('employee_master')
      .select('employee_id, name, is_active, status')
      .eq('employee_id', paddedEmployeeId)
      .single();

    if (paddedEmployee) {
      debugInfo.push(`✅ 4자리 패딩으로 발견: ${paddedEmployee.name}`);
    } else {
      debugInfo.push(`❌ 4자리 패딩으로 찾기 실패: ${paddedError?.message}`);
    }

    // 3. 모든 김민혁 사용자 검색
    debugInfo.push(`3️⃣ 이름으로 김민혁 검색`);
    const { data: allKimMinHyuk, error: nameError } = await supabase
      .from('employee_master')
      .select('employee_id, name, is_active, status')
      .eq('name', '김민혁');

    if (allKimMinHyuk && allKimMinHyuk.length > 0) {
      debugInfo.push(`✅ 김민혁 발견 (${allKimMinHyuk.length}명):`);
      allKimMinHyuk.forEach((emp, index) => {
        debugInfo.push(`   ${index + 1}. 사번: ${emp.employee_id}, 활성: ${emp.is_active}, 상태: ${emp.status}`);
      });
    } else {
      debugInfo.push(`❌ 김민혁 이름으로 찾기 실패: ${nameError?.message}`);
    }

    // 4. users 테이블에서 1475 계정 확인
    debugInfo.push(`4️⃣ users 테이블에서 계정 확인`);
    const { data: userAccounts, error: userError } = await supabase
      .from('users')
      .select('employee_id, created_at')
      .or(`employee_id.eq.${employeeId},employee_id.eq.${paddedEmployeeId}`);

    if (userAccounts && userAccounts.length > 0) {
      debugInfo.push(`✅ users 테이블에서 계정 발견:`);
      userAccounts.forEach((user, index) => {
        debugInfo.push(`   ${index + 1}. 사번: ${user.employee_id}, 생성일: ${user.created_at}`);
      });
    } else {
      debugInfo.push(`❌ users 테이블에서 계정 찾기 실패: ${userError?.message}`);
    }

    // 5. 결과 요약
    let foundEmployee = originalEmployee || paddedEmployee;
    let hasUserAccount = userAccounts && userAccounts.length > 0;

    debugInfo.push(`📊 요약:`);
    debugInfo.push(`   직원 정보: ${foundEmployee ? `✅ 발견 (${foundEmployee.name})` : '❌ 없음'}`);
    debugInfo.push(`   사용자 계정: ${hasUserAccount ? '✅ 있음' : '❌ 없음'}`);

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      data: {
        input_employee_id: employeeId,
        padded_employee_id: paddedEmployeeId,
        found_employee: foundEmployee,
        user_accounts: userAccounts,
        all_kim_min_hyuk: allKimMinHyuk
      }
    });

  } catch (error) {
    console.error('로그인 디버그 오류:', error);
    return NextResponse.json({
      success: false,
      message: '디버깅 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}