import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 김민혁 사용자 정보 조회
    const { data: employeeData, error: employeeError } = await supabase
      .from('employee_master')
      .select('*')
      .eq('name', '김민혁')
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({
        success: false,
        message: '김민혁 사용자를 찾을 수 없습니다.',
        error: employeeError
      });
    }

    // 사용자 계정 정보 조회
    const { data: userAccount, error: userError } = await supabase
      .from('users')
      .select('employee_id, role, is_admin, is_super_admin, created_at')
      .eq('employee_id', employeeData.employee_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        employee_info: employeeData,
        user_account: userAccount || null,
        user_error: userError
      }
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error
    }, { status: 500 });
  }
}