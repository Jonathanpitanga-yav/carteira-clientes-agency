"use client"

import { useApiTokens } from "@/hooks/use-api-tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Key, XCircle } from "lucide-react"
import { useState } from "react"
import { TokenCreateDialog } from "./token-create-dialog"
import { useRevokeApiToken } from "@/hooks/use-api-tokens"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function TokenList() {
  const { data: tokens, isLoading, error } = useApiTokens()
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const revoke = useRevokeApiToken()

  if (error) {
    return <div className="text-destructive">Erro ao carregar tokens.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">
          {tokens?.length ?? 0} token(s)
        </h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Key className="mr-2 h-4 w-4" /> Novo token
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prefixo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              : tokens?.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-mono text-sm">
                      {token.prefix}...
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={token.status === "active" ? "default" : "secondary"}
                        className={
                          token.status === "active"
                            ? "bg-emerald-600 text-white"
                            : token.status === "revoked"
                              ? "bg-red-600 text-white"
                              : ""
                        }
                      >
                        {token.status === "active" ? "Ativo" : "Revogado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {token.expires_at
                        ? new Date(token.expires_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {token.last_used_at
                        ? new Date(token.last_used_at).toLocaleString("pt-BR")
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      {token.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRevokeId(token.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <TokenCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={!!revokeId} onOpenChange={(o) => { if (!o) setRevokeId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar token</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (revokeId) {
                  await revoke.mutateAsync(revokeId)
                  setRevokeId(null)
                }
              }}
              disabled={revoke.isPending}
            >
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
