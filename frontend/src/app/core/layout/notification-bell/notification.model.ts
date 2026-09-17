export type NotificationStatus = 'success' | 'error' | 'warning' | 'info' | 'pending';

export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  timestamp: string | Date;
  read: boolean;
  status: NotificationStatus;
  leaveRequestId?: string;
}

export type NotificationType = 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED';

export interface NotificationResponse {
  id: string;
  recipientUserId: string;
  recipientEmployeeId?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  leaveRequestId?: string;
  createdAt: string;
}
