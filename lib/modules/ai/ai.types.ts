export interface AiSummaryTask {
  title: string
  description: string | null
  startDate: string
  endDate: string
  startTime: string | null
  type: string
  progress?: number
}

export interface AiSummaryInput {
  title: string
  tasks: AiSummaryTask[]
}

export class AiServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "AiServiceError"
  }
}

export function isAiServiceError(error: unknown): error is AiServiceError {
  return error instanceof AiServiceError
}
