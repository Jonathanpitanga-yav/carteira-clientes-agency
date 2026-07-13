import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

const supabase = createClient()

export type QueueStatus = {
  queue_name: string
  pending: number
  archived: number
}

export function useQueueStatus() {
  return useQuery({
    queryKey: [QUERY_KEYS.QUEUES],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgmq_queues")
        .select("*")

      if (error) {
        const { data: fallback, error: fallbackError } = await supabase
          .rpc("get_queue_status")

        if (fallbackError) throw fallbackError
        return fallback as QueueStatus[]
      }

      return data as QueueStatus[]
    },
  })
}
