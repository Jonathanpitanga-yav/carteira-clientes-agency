import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

const supabase = createClient()

export type ProductRanking = {
  product_id: string | null
  product_name: string | null
  sku: string | null
  client_id: string | null
  client_name: string | null
  total_orders: number | null
  total_quantity: number | null
  total_revenue: number | null
}

export function useProductRanking(clientId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, clientId],
    queryFn: async () => {
      let query = supabase
        .from("product_ranking")
        .select("*")
        .order("total_revenue", { ascending: false })
        .limit(50)

      if (clientId) query = query.eq("client_id", clientId)

      const { data, error } = await query
      if (error) throw error
      return data as ProductRanking[]
    },
  })
}
