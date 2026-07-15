import { redirect } from "next/navigation"

export default function ActivityHistoryRedirectPage() {
  redirect("/admin/logs")
}
