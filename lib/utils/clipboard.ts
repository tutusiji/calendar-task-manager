/**
 * 复制文本到剪贴板
 * 使用 Clipboard API，如果不支持则降级到 document.execCommand
 * 
 * @param text - 要复制的文本内容
 * @returns Promise<boolean> - 复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 检查是否支持 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
      return true
    } else {
      // 降级方案：使用传统的 document.execCommand
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        textArea.remove()
        return true
      } catch (err) {
        textArea.remove()
        throw new Error("复制失败")
      }
    }
  } catch (error) {
    console.error("复制失败:", error)
    return false
  }
}
