import { NextResponse } from "next/server"
import { createClient, createCoreClient, createSalesClient } from "@/lib/supabase/server"
import { getOpenAI, CHAT_MODEL } from "@/lib/assistant/client"
import { buildSystemPrompt } from "@/lib/assistant/context-builder"
import { tools, executeToolCall } from "@/lib/assistant/tools"
import type OpenAI from "openai"

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
    const encoder = new TextEncoder()

    const core = await createCoreClient()
    const sales = await createSalesClient()

    async function handleToolCalls(
      toolCallAccumulators: Map<number, { id: string; name: string; args: string }>,
      contentBuffer: string,
      controller: ReadableStreamDefaultController,
    ): Promise<string> {
      const toolCallEntries = [...toolCallAccumulators.entries()].sort(([a], [b]) => a - b).map(([, acc]) => acc)
      const assistantToolCalls = toolCallEntries.map((acc) => ({
        id: acc.id,
        type: "function" as const,
        function: { name: acc.name, arguments: acc.args },
      }))

      const toolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []
      for (const acc of toolCallEntries) {
        const args = JSON.parse(acc.args || "{}")
        const result = await executeToolCall(acc.name, args, acc.id, core, sales)
        toolMessages.push(result)
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_status", message: "Consultando dados..." })}\n\n`))

      const followUpMsgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...rawMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "assistant", content: contentBuffer || null, tool_calls: assistantToolCalls } as OpenAI.Chat.ChatCompletionMessageParam,
        ...toolMessages,
      ]

      const followUpStream = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: followUpMsgs,
        stream: true,
        max_tokens: 8192,
      })

      let responseContent = ""
      for await (const chunk of followUpStream) {
        const text = chunk.choices?.[0]?.delta?.content
        if (text) {
          responseContent += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`))
        }
      }

      return responseContent
    }

    const stream = new ReadableStream({
      async start(controller) {
        const stream = await openai.chat.completions.create({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...rawMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
          tools,
          tool_choice: "auto",
          stream: true,
          max_tokens: 8192,
        })

        const toolCallAccumulators: Map<number, { id: string; name: string; args: string }> = new Map()
        let contentBuffer = ""

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta

          if (delta?.content) {
            contentBuffer += delta.content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`))
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index ?? 0
              if (!toolCallAccumulators.has(index)) {
                toolCallAccumulators.set(index, { id: "", name: "", args: "" })
              }
              const acc = toolCallAccumulators.get(index)!
              if (tc.id) acc.id += tc.id
              if (tc.function?.name) acc.name += tc.function.name
              if (tc.function?.arguments) acc.args += tc.function.arguments
            }
          }

          if (chunk.choices?.[0]?.finish_reason === "tool_calls") {
            contentBuffer = await handleToolCalls(toolCallAccumulators, contentBuffer, controller)
          }
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
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 })
  }
}
