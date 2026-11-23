import { del, get, patch, post } from "@/lib/request"
import type { PlanningScopeType } from "@/lib/planning"

export interface PlanningUserSummary {
  id: string
  username: string
  name: string
  email: string
  avatar?: string | null
}

export interface PlanningCardAssignee {
  id: string
  cardId: string
  userId: string
  createdAt: string
  user: PlanningUserSummary
}

export interface PlanningCardItem {
  id: string
  cardId: string
  content: string
  isCompleted: boolean
  sortOrder: number
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PlanningItemReorderResult {
  item: PlanningCardItem | null
  affectedItems: Array<{
    id: string
    sortOrder: number
  }>
}

export interface PlanningCard {
  id: string
  bucketId: string
  title: string
  description?: string | null
  headerColor: string
  sortOrder: number
  creatorId: string
  createdAt: string
  updatedAt: string
  items: PlanningCardItem[]
  assignees: PlanningCardAssignee[]
}

export interface PlanningBucket {
  id: string
  boardId: string
  title: string
  width: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  cards: PlanningCard[]
}

export interface PlanningBoardSummary {
  id: string
  name: string
  description?: string | null
  color: string
  scopeType: PlanningScopeType
  ownerUserId?: string | null
  teamId?: string | null
  projectId?: string | null
  creatorId: string
  createdAt: string
  updatedAt: string
}

export interface PlanningBoard extends PlanningBoardSummary {
  buckets: PlanningBucket[]
}

export const planningAPI = {
  async getBoardSummaries(scopeType: PlanningScopeType, scopeId: string, signal?: AbortSignal) {
    return get<PlanningBoardSummary[]>("/plans/boards", {
      scopeType,
      scopeId,
      summary: true,
    }, { signal, showError: false })
  },

  async getBoard(id: string, signal?: AbortSignal) {
    return get<PlanningBoard>(`/plans/boards/${id}`, undefined, { signal, showError: false })
  },

  async createBoard(payload: {
    scopeType: PlanningScopeType
    scopeId: string
    name: string
    description?: string
    color?: string
  }) {
    return post<PlanningBoard>("/plans/boards", payload)
  },

  async updateBoard(
    id: string,
    payload: {
      name?: string
      description?: string
      color?: string
    }
  ) {
    return patch<PlanningBoardSummary>(`/plans/boards/${id}`, payload)
  },

  async deleteBoard(id: string) {
    return del(`/plans/boards/${id}`)
  },

  async createBucket(payload: {
    boardId: string
    title: string
    width?: number
  }) {
    return post<PlanningBucket>("/plans/buckets", payload)
  },

  async updateBucket(
    id: string,
    payload: {
      title?: string
      width?: number
      sortOrder?: number
    }
  ) {
    return patch(`/plans/buckets/${id}`, payload)
  },

  async deleteBucket(id: string) {
    return del(`/plans/buckets/${id}`)
  },

  async createCard(payload: {
    bucketId: string
    title: string
    description?: string
    headerColor?: string
    assigneeIds?: string[]
  }) {
    return post<PlanningCard>("/plans/cards", payload)
  },

  async updateCard(
    id: string,
    payload: {
      title?: string
      description?: string
      headerColor?: string
      assigneeIds?: string[]
      sortOrder?: number
    }
  ) {
    return patch(`/plans/cards/${id}`, payload)
  },

  async deleteCard(id: string) {
    return del(`/plans/cards/${id}`)
  },

  async createItem(payload: {
    cardId: string
    content: string
  }) {
    return post<PlanningCardItem>("/plans/items", payload)
  },

  async updateItem(
    id: string,
    payload: {
      content?: string
      isCompleted?: boolean
      sortOrder?: number
    }
  ) {
    return patch<PlanningCardItem>(`/plans/items/${id}`, payload)
  },

  async reorderItem(
    id: string,
    payload: {
      targetItemId: string
      position: "before" | "after"
    }
  ) {
    return patch<PlanningItemReorderResult>(`/plans/items/${id}`, payload)
  },

  async deleteItem(id: string) {
    return del(`/plans/items/${id}`)
  },
}
