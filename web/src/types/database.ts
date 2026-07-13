export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          document: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          document?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          document?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      client_monthly_billing: {
        Row: {
          client_id: string | null
          client_name: string | null
          year_month: string | null
          total_approved: number | null
          total_canceled: number | null
          total_gross: number | null
          approved_count: number | null
        }
      }
      daily_billing: {
        Row: {
          client_id: string | null
          date: string | null
          total_approved: number | null
          order_count: number | null
        }
      }
      product_ranking: {
        Row: {
          product_id: string | null
          product_name: string | null
          sku: string | null
          client_id: string | null
          client_name: string | null
          total_orders: number | null
          total_quantity: number | null
          total_revenue: number | null
        }
      }
    }
  }
}
