import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mpdbzypvrstdwsutttps.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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