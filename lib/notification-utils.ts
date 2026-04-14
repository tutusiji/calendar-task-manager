export const NOTIFICATION_RETENTION_DAYS = 45

export function getNotificationCutoffDate() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS)
  return cutoffDate
}
