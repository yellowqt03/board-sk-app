/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // 파일 감시 최적화 - ENOSPC 오류 해결
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 2000, // 폴링 간격 증가
        aggregateTimeout: 500, // 집계 시간 증가
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/data/**',
          '**/coverage/**',
          '**/dist/**',
          '**/build/**',
          '**/.vscode/**',
          '**/.idea/**',
          '**/logs/**',
          '**/*.log',
          '**/tmp/**',
          '**/temp/**'
        ]
      }
    }
    return config
  },
  // 개발 서버 설정
  experimental: {
    // 파일 감시 비활성화 (폴링만 사용)
    esmExternals: false
  }
};

module.exports = nextConfig;
