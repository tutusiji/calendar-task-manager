export const NOTIFICATION_RETENTION_DAYS = 30

export function getNotificationCutoffDate() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS)
  return cutoffDate
}
