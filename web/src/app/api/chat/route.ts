import { NextResponse } from "next/server"
import { createClient, createCoreClient, createSalesClient } from "@/lib/supabase/server"
import { getOpenAI, CHAT_MODEL } from "@/lib/assistant/client"
import { buildSystemPrompt } from "@/lib/assistant/context-builder"
import { tools, executeToolCall } from "@/lib/assistant/tools"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const profile = await supabase
      .schema("core")
      .from("profiles")
      .select("roles, role")
      .eq("id", user.id)
      .single()

    const roles = (profile.data?.roles?.length ? profile.data.roles : [profile.data?.role]).filter(Boolean)
    if (!roles.some((r: string) => ["admin", "leader", "analyst"].includes(r))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { messages: rawMessages } = await req.json() as { messages: { role: string; content: string }[] }
    if (!rawMessages?.length) return NextResponse.json({ error: "Mensagens obrigatórias" }, { status: 400 })

    const systemPrompt = await buildSystemPrompt()
    const openai = getOpenAI()

    const core = await createCoreClient()
    const sales = await createSalesClient()

    const apiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...rawMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ]

    let response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: apiMessages,
      tools,
      tool_choice: "auto",
      stream: false,
      max_tokens: 8192,
    })

    let turnCount = 0
    while (response.choices[0]?.finish_reason === "tool_calls" && turnCount < 5) {
      turnCount++
      const toolCalls = response.choices[0].message.tool_calls
      if (!toolCalls?.length) break

      const toolMessages: ChatCompletionMessageParam[] = []
      for (const tc of toolCalls) {
        if (tc.type !== "function") continue
        const fn = tc.function as { name: string; arguments: string }
        const args = JSON.parse(fn.arguments)
        const result = await executeToolCall(fn.name, args, tc.id, core, sales)
        toolMessages.push(result)
      }

      response = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          ...apiMessages,
          response.choices[0].message as ChatCompletionMessageParam,
          ...toolMessages,
        ],
        tools,
        tool_choice: "auto",
        stream: false,
        max_tokens: 8192,
      })
    }

    const finalContent = response.choices[0]?.message?.content || "Nenhum dado encontrado para essa consulta."

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const words = finalContent.split(/(?<=\s)/)
        for (const word of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: word })}\n\n`))
          await new Promise((r) => setTimeout(r, 15))
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    console.error("Chat API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no servidor" },
      { status: 500 },
    )
  }
}
