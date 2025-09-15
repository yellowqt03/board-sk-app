import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPassword } from '@/lib/password';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { employeeId, currentPassword, newPassword } = await request.json();

    // 입력값 검증
    if (!employeeId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 새 비밀번호 강도 검증
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: '새 비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 사번을 4자리 패딩 형식으로 변환
    const paddedEmployeeId = employeeId.padStart(4, '0');

    // 현재 사용자 정보 및 비밀번호 확인
    const { data: userAccount, error: userError } = await supabase
      .from('users')
      .select('password_hash, employee_id')
      .eq('employee_id', paddedEmployeeId)
      .single();

    if (userError || !userAccount) {
      return NextResponse.json(
        { success: false, message: '사용자 계정을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await verifyPassword(currentPassword, userAccount.password_hash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, message: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // 새 비밀번호가 현재 비밀번호와 같은지 확인
    const isSamePassword = await verifyPassword(newPassword, userAccount.password_hash);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' },
        { status: 400 }
      );
    }

    // 새 비밀번호 해시화
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', paddedEmployeeId);

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError);
      return NextResponse.json(
        { success: false, message: '비밀번호 변경 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('비밀번호 변경 API 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}