import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const debugInfo: any[] = [];

  try {
    debugInfo.push('🔧 권한 시스템 및 관리자 계정 설정 시작...');
    console.log('권한 시스템 및 관리자 계정 설정 시작...');

    // 1. 먼저 users 테이블 구조 확인
    debugInfo.push('📊 현재 users 테이블 구조 확인...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      debugInfo.push(`❌ users 테이블 접근 오류: ${tableError.message}`);
      return NextResponse.json({
        success: false,
        message: 'users 테이블에 접근할 수 없습니다.',
        debug: debugInfo,
        error: tableError
      });
    }

    debugInfo.push('✅ users 테이블 접근 성공');

    // 2. 김민혁(사번 1475) 직원 정보 확인
    debugInfo.push('👤 김민혁(사번 1475) 직원 정보 확인...');
    const { data: employee, error: empError } = await supabase
      .from('employee_master')
      .select('employee_id, name, is_active, status')
      .eq('employee_id', '1475')
      .single();

    if (empError || !employee) {
      debugInfo.push(`❌ 김민혁 직원 정보 찾기 실패: ${empError?.message || '데이터 없음'}`);
      return NextResponse.json({
        success: false,
        message: '김민혁(사번 1475) 직원 정보를 찾을 수 없습니다.',
        details: 'employee_master 테이블에 해당 사원이 없습니다.',
        debug: debugInfo,
        error: empError
      });
    }

    debugInfo.push(`✅ 김민혁 직원 정보 확인: 활성=${employee.is_active}, 상태=${employee.status}`);

    if (!employee.is_active || employee.status !== 'approved') {
      debugInfo.push(`❌ 김민혁 직원 상태 문제: 활성=${employee.is_active}, 상태=${employee.status}`);
      return NextResponse.json({
        success: false,
        message: '김민혁 직원이 비활성화되었거나 승인되지 않은 상태입니다.',
        employee_status: { is_active: employee.is_active, status: employee.status },
        debug: debugInfo
      });
    }

    // 3. 기존 사용자 계정 확인
    debugInfo.push('🔍 기존 사용자 계정 확인...');
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('employee_id, password_hash')
      .eq('employee_id', '1475')
      .single();

    let userAccount;

    if (userError && userError.code === 'PGRST116') {
      // 사용자 계정이 없으면 생성
      debugInfo.push('➕ 김민혁 사용자 계정 생성 중...');
      console.log('김민혁 사용자 계정 생성 중...');

      const defaultPassword = 'admin123';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

      const insertData: any = {
        employee_id: '1475',
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single();

        if (createError) {
          debugInfo.push(`❌ 사용자 계정 생성 실패: ${createError.message}`);
          return NextResponse.json({
            success: false,
            message: '사용자 계정 생성 중 오류가 발생했습니다.',
            debug: debugInfo,
            error: createError
          });
        }

        userAccount = newUser;
        debugInfo.push('✅ 기본 사용자 계정 생성 완료');
        console.log('기본 사용자 계정 생성 완료');

      } catch (error) {
        debugInfo.push(`❌ 계정 생성 예외: ${error}`);
        return NextResponse.json({
          success: false,
          message: '사용자 계정 생성 중 오류가 발생했습니다.',
          debug: debugInfo,
          error: error
        });
      }
    } else if (existingUser) {
      debugInfo.push('✅ 기존 계정 발견');
      userAccount = existingUser;
    } else {
      debugInfo.push(`❌ 사용자 계정 조회 오류: ${userError?.message}`);
      return NextResponse.json({
        success: false,
        message: '사용자 계정 조회 중 오류가 발생했습니다.',
        debug: debugInfo,
        error: userError
      });
    }

    // 4. 결과 반환
    debugInfo.push('🎉 시스템 설정 완료');
    return NextResponse.json({
      success: true,
      message: '시스템 설정이 완료되었습니다.',
      debug: debugInfo,
      data: {
        employee_info: employee,
        user_account: {
          employee_id: userAccount.employee_id,
          created: userAccount.created_at
        },
        login_credentials: {
          employee_id: '1475',
          password: 'admin123',
          note: '보안을 위해 로그인 후 반드시 비밀번호를 변경해주세요.'
        }
      }
    });

  } catch (error) {
    debugInfo.push(`❌ 예외 발생: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('시스템 설정 오류:', error);
    return NextResponse.json({
      success: false,
      message: '시스템 설정 중 오류가 발생했습니다.',
      debug: debugInfo,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}