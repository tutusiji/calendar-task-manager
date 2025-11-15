/**
 * 确保 loading 状态至少持续指定的时间
 * @param minDuration 最小持续时间（毫秒），默认 1200ms
 * @returns 返回一个函数，用于延迟关闭 loading
 */
export function useLoadingDelay(minDuration: number = 800) {
  let startTime: number | null = null

  const start = () => {
    startTime = Date.now()
  }

  const waitForMinDuration = async () => {
    if (startTime === null) return

    const elapsedTime = Date.now() - startTime
    const remainingTime = Math.max(0, minDuration - elapsedTime)
    
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    }
    
    startTime = null
  }

  return { start, waitForMinDuration }
}
