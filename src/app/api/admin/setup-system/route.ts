import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('권한 시스템 및 관리자 계정 설정 시작...');

    // 1. users 테이블에 role 컬럼 추가 (있으면 무시)
    try {
      await supabase.rpc('add_role_column_if_not_exists');
    } catch (error) {
      // 함수가 없으면 직접 실행
      console.log('role 컬럼 추가 시도...');
    }

    // 2. users 테이블에 is_super_admin 컬럼 추가 (있으면 무시)
    try {
      await supabase.rpc('add_super_admin_column_if_not_exists');
    } catch (error) {
      console.log('is_super_admin 컬럼 추가 시도...');
    }

    // 3. 김민혁(사번 1475) 직원 정보 확인
    const { data: employee, error: empError } = await supabase
      .from('employee_master')
      .select('employee_id, name, is_active, status')
      .eq('employee_id', '1475')
      .single();

    if (empError || !employee) {
      return NextResponse.json({
        success: false,
        message: '김민혁(사번 1475) 직원 정보를 찾을 수 없습니다.',
        details: 'employee_master 테이블에 해당 사원이 없습니다.',
        error: empError
      });
    }

    if (!employee.is_active || employee.status !== 'approved') {
      return NextResponse.json({
        success: false,
        message: '김민혁 직원이 비활성화되었거나 승인되지 않은 상태입니다.',
        employee_status: { is_active: employee.is_active, status: employee.status }
      });
    }

    // 4. 기존 사용자 계정 확인
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('employee_id, role, is_admin, is_super_admin')
      .eq('employee_id', '1475')
      .single();

    let userAccount;

    if (userError && userError.code === 'PGRST116') {
      // 사용자 계정이 없으면 생성
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

      // role과 is_super_admin 컬럼이 존재하면 추가
      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            ...insertData,
            role: 'super_admin',
            is_admin: true,
            is_super_admin: true
          })
          .select()
          .single();

        if (createError) {
          // role 컬럼이 없으면 기본 정보만으로 생성
          const { data: basicUser, error: basicError } = await supabase
            .from('users')
            .insert(insertData)
            .select()
            .single();

          if (basicError) {
            throw basicError;
          }
          userAccount = basicUser;
          console.log('기본 사용자 계정 생성 완료');
        } else {
          userAccount = newUser;
          console.log('권한 포함 사용자 계정 생성 완료');
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: '사용자 계정 생성 중 오류가 발생했습니다.',
          error: error
        });
      }
    } else if (existingUser) {
      // 기존 계정이 있으면 권한 업데이트 시도
      console.log('기존 계정 발견, 권한 업데이트 시도...');

      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'super_admin',
            is_admin: true,
            is_super_admin: true,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', '1475');

        if (updateError) {
          console.log('권한 업데이트 실패, 기존 계정 유지:', updateError);
        } else {
          console.log('권한 업데이트 성공');
        }
      } catch (error) {
        console.log('권한 업데이트 중 오류:', error);
      }

      userAccount = existingUser;
    } else {
      return NextResponse.json({
        success: false,
        message: '사용자 계정 조회 중 오류가 발생했습니다.',
        error: userError
      });
    }

    // 5. 결과 반환
    return NextResponse.json({
      success: true,
      message: '시스템 설정이 완료되었습니다.',
      data: {
        employee_info: employee,
        user_account: {
          employee_id: userAccount.employee_id,
          role: userAccount.role || 'user',
          is_admin: userAccount.is_admin || false,
          is_super_admin: userAccount.is_super_admin || false
        },
        login_credentials: {
          employee_id: '1475',
          password: 'admin123',
          note: '보안을 위해 로그인 후 반드시 비밀번호를 변경해주세요.'
        }
      }
    });

  } catch (error) {
    console.error('시스템 설정 오류:', error);
    return NextResponse.json({
      success: false,
      message: '시스템 설정 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}