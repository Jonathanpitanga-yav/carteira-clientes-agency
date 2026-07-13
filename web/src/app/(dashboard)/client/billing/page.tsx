"use client"

import { useMonthlyBilling } from "@/hooks/use-billing"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils/format"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export default function ClientBillingPage() {
  const { data: monthly, isLoading } = useMonthlyBilling()

  const chartData = (monthly ?? [])
    .filter((r) => r.total_approved !== null)
    .slice(0, 12)
    .reverse()
    .map((r) => ({
      month: r.year_month?.slice(0, 7) ?? "",
      receita: r.total_approved ?? 0,
    }))

  return (
    <PageContainer>
      <PageHeader title="Faturamento" description="Histórico de faturamento da sua conta" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Faturamento mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Faturamento</TableHead>
              <TableHead>Cancelado</TableHead>
              <TableHead>Pedidos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              : monthly?.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {row.year_month?.slice(0, 7)}
                    </TableCell>
                    <TableCell>{formatCurrency(row.total_approved ?? 0)}</TableCell>
                    <TableCell className="text-destructive">
                      {formatCurrency(row.total_canceled ?? 0)}
                    </TableCell>
                    <TableCell>{row.approved_count}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  )
}
