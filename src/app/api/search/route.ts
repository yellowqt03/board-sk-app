import { NextRequest, NextResponse } from 'next/server';
import { searchAll, SearchOptions } from '@/lib/search';
import { validateSearchQuery } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: '검색어가 필요합니다.' },
        { status: 400 }
      );
    }

    // 검색어 유효성 검사
    const validation = validateSearchQuery(query);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 검색 옵션 파싱
    const options: SearchOptions = {
      query: validation.sanitizedValue || query,
      type: (searchParams.get('type') as 'all' | 'announcements' | 'posts') || 'all',
      category: searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined,
      author: searchParams.get('author') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      priority: (searchParams.get('priority') as 'urgent' | 'normal') || undefined,
      sortBy: (searchParams.get('sortBy') as 'relevance' | 'date' | 'title') || 'relevance',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    // 검색 실행
    const results = await searchAll(options);

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query: options.query,
    });

  } catch (error) {
    console.error('검색 API 오류:', error);
    return NextResponse.json(
      { 
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, ...filters } = body;

    if (!query) {
      return NextResponse.json(
        { error: '검색어가 필요합니다.' },
        { status: 400 }
      );
    }

    // 검색어 유효성 검사
    const validation = validateSearchQuery(query);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const options: SearchOptions = {
      query: validation.sanitizedValue || query,
      ...filters
    };

    // 검색 실행
    const results = await searchAll(options);

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query: options.query,
    });

  } catch (error) {
    console.error('검색 API 오류:', error);
    return NextResponse.json(
      { 
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}