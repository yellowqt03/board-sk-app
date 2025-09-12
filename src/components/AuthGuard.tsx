'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isLoggedIn } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      console.log('AuthGuard: 인증 상태 확인 시작');
      const loggedIn = isLoggedIn();
      console.log('AuthGuard: isLoggedIn 결과:', loggedIn);
      console.log('AuthGuard: requireAuth:', requireAuth);
      
      setIsAuthenticated(loggedIn);
      setIsLoading(false);

      // 인증이 필요한 페이지인데 로그인하지 않은 경우
      if (requireAuth && !loggedIn) {
        console.log('AuthGuard: 인증 필요하지만 로그인되지 않음, 로그인 페이지로 리다이렉션');
        router.push('/login');
      } else {
        console.log('AuthGuard: 인증 확인 완료, 페이지 렌더링 허용');
      }
    };

    checkAuth();
  }, [requireAuth, router]);

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증이 필요한 페이지인데 로그인하지 않은 경우
  if (requireAuth && !isAuthenticated) {
    return null; // 리다이렉트 중이므로 아무것도 렌더링하지 않음
  }

  return <>{children}</>;
}

