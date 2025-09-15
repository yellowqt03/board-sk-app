import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// 실시간 기능이 포함된 Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// 데이터베이스 타입 정의
export interface Department {
  id: number
  name: string
  created_at: string
}

export interface Position {
  id: number
  name: string
  level: number
  created_at: string
}

export interface Employee {
  id: number
  employee_id: string
  name: string
  email?: string
  department_id?: number
  position_id?: number
  is_active: boolean
  status: string
  created_by?: number
  approved_by?: number
  created_at: string
  approved_at?: string
}