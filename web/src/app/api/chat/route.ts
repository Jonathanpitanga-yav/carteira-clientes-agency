import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOpenAI } from "@/lib/assistant/client"
import { buildSystemPrompt } from "@/lib/assistant/context-builder"
import { tools, executeToolCall } from "@/lib/assistant/tools"

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

    const { messages } = await req.json() as { messages: { role: string; content: string }[] }
    if (!messages?.length) return NextResponse.json({ error: "Mensagens obrigatórias" }, { status: 400 })

    const systemPrompt = await buildSystemPrompt()
    const openai = getOpenAI()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      tools,
      tool_choice: "auto",
      stream: true,
      max_tokens: 4096,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const toolCallAccumulators: Map<number, { id: string; name: string; args: string }> = new Map()
        let contentBuffer = ""

        for await (const chunk of completion) {
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_status", message: "Consultando dados..." })}\n\n`))

            const toolMessages = []
            for (const [, acc] of toolCallAccumulators) {
              const args = JSON.parse(acc.args || "{}")
              const result = await executeToolCall(acc.name, args, acc.id)
              toolMessages.push(result)
            }
            toolCallAccumulators.clear()

            const followUp = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
                { role: "assistant", content: contentBuffer || null, tool_calls: [...toolCallAccumulators.values()].map((a) => ({ id: a.id, type: "function" as const, function: { name: a.name, arguments: a.args } })) },
                ...toolMessages,
              ],
              stream: true,
              max_tokens: 4096,
            })

            contentBuffer = ""
            for await (const chunk2 of followUp) {
              const text = chunk2.choices?.[0]?.delta?.content
              if (text) {
                contentBuffer += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`))
              }
            }
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
