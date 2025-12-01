/**
 * 通知相关 API
 */

import { get, post, patch, del } from '../request'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content: string
  isRead: boolean
  relatedId?: string
  relatedType?: string
  createdAt: string
  metadata?: any
}

export const notificationAPI = {
  /**
   * 获取通知列表
   */
  async getAll(params?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return get<Notification[]>('/notifications', params)
  },

  /**
   * 获取未读数量
   */
  async getUnreadCount(): Promise<number> {
    return get<number>('/notifications/unread-count')
  },

  /**
   * 标记为已读
   */
  async markAsRead(id: string): Promise<void> {
    return patch<void>(`/notifications/${id}/read`)
  },

  /**
   * 标记所有为已读
   */
  async markAllAsRead(): Promise<void> {
    return post<void>('/notifications/mark-all-read')
  },

  /**
   * 接受邀请
   */
  async acceptInvite(id: string, accept: boolean): Promise<void> {
    return post<void>('/notifications/accept-invite', { notificationId: id, accept })
  },

  /**
   * 删除单条通知
   */
  async delete(id: string): Promise<void> {
    return del<void>(`/notifications/${id}`)
  },

  /**
   * 清空所有通知
   */
  async clearAll(): Promise<void> {
    return del<void>('/notifications/clear')
  },
}
