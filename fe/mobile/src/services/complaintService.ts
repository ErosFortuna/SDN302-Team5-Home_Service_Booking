import { apiRequest } from './apiClient';
import { Complaint, CreateComplaintInput, ComplaintStatus, ComplaintReply } from '../types';

/**
 * Fetch complaints from backend API
 */
export async function getBackendComplaints(status?: string): Promise<Complaint[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiRequest(`/complaints${query}`, { method: 'GET' });
  if (res.success && Array.isArray(res.data)) {
    return res.data.map((item: any) => ({
      id: item._id || item.id,
      bookingId: item.booking?._id || item.booking?.id || item.booking || '',
      bookingTitle: item.booking?.service?.name || item.title || 'Dịch vụ tại nhà',
      reporterId: item.reporter?._id || item.reporter?.id || item.reporter,
      reporterName: item.reporter?.fullName || item.reporter?.name || 'Khách hàng',
      againstId: item.against?._id || item.against?.id || item.against,
      againstName: item.against?.fullName || item.against?.name || 'Thợ đối tác',
      category: item.category,
      title: item.title,
      description: item.description,
      evidenceUrls: item.evidenceUrls || [],
      status: item.status,
      resolutionNote: item.resolutionNote,
      resolvedBy: item.resolvedBy?.fullName || item.resolvedBy,
      resolvedAt: item.resolvedAt,
      providerResponse: item.providerResponse,
      replies: (item.replies || []).map((r: any) => ({
        id: r._id || r.id || `${Date.now()}`,
        senderId: r.sender?._id || r.sender?.id || r.sender,
        senderName: r.sender?.fullName || r.senderRole || 'Người gửi',
        senderRole: (r.senderRole || 'customer').toLowerCase(),
        message: r.message,
        evidenceUrls: r.evidenceUrls || [],
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
      })),
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
    }));
  }
  return [];
}

/**
 * Submit a new complaint
 */
export async function postCreateComplaint(input: CreateComplaintInput): Promise<Complaint> {
  const res = await apiRequest('/complaints', {
    method: 'POST',
    body: JSON.stringify({
      booking: input.bookingId,
      bookingId: input.bookingId,
      category: input.category,
      title: input.title,
      description: input.description,
      evidenceUrls: input.evidenceUrls || [],
    }),
  });

  if (res.success && res.data) {
    const item = res.data;
    return {
      id: item._id || item.id,
      bookingId: input.bookingId,
      bookingTitle: item.booking?.service?.name || input.title,
      reporterId: item.reporter?._id || 'me',
      reporterName: item.reporter?.fullName || 'Bạn',
      againstId: item.against?._id || 'provider',
      againstName: item.against?.fullName || 'Thợ dịch vụ',
      category: input.category,
      title: input.title,
      description: input.description,
      evidenceUrls: input.evidenceUrls || [],
      status: 'OPEN',
      createdAt: 'Vừa xong',
      replies: [],
    };
  }
  throw new Error(res.message || 'Không thể tạo khiếu nại.');
}

/**
 * Reply to an existing complaint
 */
export async function postReplyComplaint(
  id: string,
  message: string,
  senderRole: 'customer' | 'provider' | 'staff' | 'admin' = 'customer'
): Promise<ComplaintReply> {
  const res = await apiRequest(`/complaints/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  if (res.success && res.data?.replies) {
    const last = res.data.replies[res.data.replies.length - 1];
    return {
      id: last._id || `${Date.now()}`,
      senderId: last.sender?._id || 'me',
      senderName: last.sender?.fullName || 'Bạn',
      senderRole,
      message,
      createdAt: 'Vừa xong',
    };
  }
  throw new Error(res.message || 'Không thể gửi phản hồi.');
}

/**
 * Resolve complaint
 */
export async function patchResolveComplaint(
  id: string,
  resolutionNote: string,
  status: ComplaintStatus = 'RESOLVED'
): Promise<boolean> {
  const res = await apiRequest(`/complaints/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({
      resolutionNote,
      status,
    }),
  });
  return Boolean(res.success);
}
