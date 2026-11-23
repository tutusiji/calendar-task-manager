import type { PlanningScopeType } from "@/lib/planning"

export type PlanningScope =
  | {
      ready: true
      scopeType: PlanningScopeType
      scopeId: string
      scopeKey: string
      scopeName: string
      scopeCaption: string
    }
  | {
      ready: false
      scopeType?: undefined
      scopeId?: undefined
      scopeKey?: undefined
      scopeName: string
      scopeCaption: string
    }
