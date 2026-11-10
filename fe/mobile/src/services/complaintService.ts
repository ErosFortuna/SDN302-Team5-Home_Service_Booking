import { apiRequest } from './apiClient';
import { Complaint, CreateComplaintInput, ComplaintStatus, ComplaintReply } from '../types';

function mapBackendComplaint(item: any): Complaint {
  return {
    id: item._id || item.id || '',
    bookingId: item.booking?._id || item.booking?.id || item.booking || '',
    bookingTitle: item.booking?.service?.name || item.title || '',
    reporterId: item.reporter?._id || item.reporter?.id || item.reporter || '',
    reporterName: item.reporter?.fullName || item.reporter?.name || '',
    againstId: item.against?._id || item.against?.id || item.against || '',
    againstName: item.against?.fullName || item.against?.name || '',
    category: item.category,
    title: item.title,
    description: item.description,
    evidenceUrls: item.evidenceUrls || [],
    status: item.status,
    resolutionNote: item.resolutionNote,
    resolvedBy: item.resolvedBy?.fullName || item.resolvedBy,
    resolvedAt: item.resolvedAt ? new Date(item.resolvedAt).toLocaleString('vi-VN') : undefined,
    providerResponse: item.providerResponse,
    replies: (item.replies || []).map((reply: any) => ({
      id: reply._id || reply.id || '',
      senderId: reply.sender?._id || reply.sender?.id || reply.sender || '',
      senderName: reply.sender?.fullName || reply.senderRole || '',
      senderRole: (reply.senderRole || 'customer').toLowerCase(),
      message: reply.message,
      evidenceUrls: reply.evidenceUrls || [],
      createdAt: reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
    })),
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
  };
}

/**
 * Fetch complaints from backend API
 */
export async function getBackendComplaints(status?: string): Promise<Complaint[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiRequest(`/complaints${query}`, { method: 'GET' });
  if (res.success && Array.isArray(res.data)) {
    return res.data.map(mapBackendComplaint);
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
    const complaint = mapBackendComplaint(res.data);
    if (!complaint.id) throw new Error('Máy chủ không trả về mã khiếu nại.');
    return complaint;
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
      id: last._id || last.id || '',
      senderId: last.sender?._id || last.sender?.id || last.sender || '',
      senderName: last.sender?.fullName || '',
      senderRole: (last.senderRole || senderRole).toLowerCase(),
      message: last.message,
      evidenceUrls: last.evidenceUrls || [],
      createdAt: last.createdAt ? new Date(last.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
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
