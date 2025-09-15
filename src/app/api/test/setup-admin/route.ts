import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // 1. 먼저 users 테이블에 필요한 컬럼들이 있는지 확인하고 추가
    console.log('권한 시스템 설정 시작...');

    // 2. 김민혁의 사용자 계정이 있는지 확인
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('employee_id, password_hash')
      .eq('employee_id', '1475')
      .single();

    let userAccount;

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // 사용자가 없으면 생성
      console.log('김민혁 계정이 없어서 생성합니다...');

      // 기본 비밀번호 해시화 (password: admin123)
      const defaultPassword = 'admin123';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          employee_id: '1475',
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('사용자 계정 생성 오류:', createError);
        return NextResponse.json({
          success: false,
          message: '사용자 계정 생성에 실패했습니다.',
          error: createError
        });
      }

      userAccount = newUser;
      console.log('김민혁 계정 생성 완료');
    } else if (existingUser) {
      userAccount = existingUser;
      console.log('김민혁 계정이 이미 존재합니다.');
    } else {
      console.error('사용자 조회 오류:', userCheckError);
      return NextResponse.json({
        success: false,
        message: '사용자 조회 중 오류가 발생했습니다.',
        error: userCheckError
      });
    }

    return NextResponse.json({
      success: true,
      message: '관리자 계정 설정이 완료되었습니다.',
      data: {
        employee_id: '1475',
        name: '김민혁',
        default_password: 'admin123',
        note: '보안을 위해 로그인 후 비밀번호를 변경해주세요.'
      }
    });

  } catch (error) {
    console.error('관리자 설정 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error
    }, { status: 500 });
  }
}