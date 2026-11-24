import { AiServiceError } from "./ai.types"

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

interface ChatMessage {
  role: "system" | "user"
  content: string
}

export async function completeWithDeepSeek(messages: ChatMessage[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new AiServiceError(503, "尚未配置 DeepSeek API Key")
  }

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.2,
        max_tokens: 500,
        messages,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const result = await response.json().catch(() => null)
    if (!response.ok) {
      console.error("DeepSeek request failed", response.status)
      throw new AiServiceError(502, "AI 服务暂时不可用")
    }

    const content = result?.choices?.[0]?.message?.content
    if (typeof content !== "string" || !content.trim()) {
      throw new AiServiceError(502, "AI 没有返回有效内容")
    }

    return content.trim()
  } catch (error) {
    if (error instanceof AiServiceError) throw error
    console.error("DeepSeek request failed", error)
    throw new AiServiceError(502, "AI 请求失败，请稍后重试")
  }
}
