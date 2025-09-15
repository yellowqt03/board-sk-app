import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 사용자 목록 조회 (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(`
        employee_id,
        is_admin,
        created_at,
        employee_master!inner(
          name,
          email,
          department_id,
          position_id,
          is_active,
          status,
          departments(name),
          positions(name)
        )
      `);

    // 검색 조건 추가
    if (search) {
      query = query.or(`employee_master.name.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }

    // 권한 필터 추가
    if (role) {
      if (role === 'admin') {
        query = query.eq('is_admin', true);
      }
      // is_super_admin 컬럼이 없으므로 super_admin 필터링 제거
      // role 컬럼이 없으므로 role 기반 필터링 제거
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);
    query = query.order('employee_id', { ascending: true });

    const { data: users, error, count } = await query;

    if (error) {
      console.error('사용자 목록 조회 오류:', error);
      return NextResponse.json(
        { success: false, message: '사용자 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 전체 사용자 수는 현재 페이지의 사용자 수로 간단히 처리
    const totalCount = users?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('사용자 목록 API 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 권한 업데이트 (최고 관리자 전용)
export async function PATCH(request: NextRequest) {
  try {
    const { employeeId, role, is_admin, is_super_admin } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: '사번이 필요합니다.' },
        { status: 400 }
      );
    }

    // 자기 자신의 최고 관리자 권한은 해제할 수 없음
    const requestorHeader = request.headers.get('x-employee-id');
    if (requestorHeader === employeeId && is_super_admin === false) {
      return NextResponse.json(
        { success: false, message: '자신의 최고 관리자 권한은 해제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // role 컬럼이 없으므로 role 업데이트 제거
    // if (role !== undefined) updateData.role = role;
    if (is_admin !== undefined) updateData.is_admin = is_admin;
    // is_super_admin 컬럼이 없으므로 제거
    // if (is_super_admin !== undefined) updateData.is_super_admin = is_super_admin;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('employee_id', employeeId);

    if (error) {
      console.error('사용자 권한 업데이트 오류:', error);
      return NextResponse.json(
        { success: false, message: '권한 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '사용자 권한이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('사용자 권한 업데이트 API 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}