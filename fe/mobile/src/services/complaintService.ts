import { apiRequest } from './apiClient';
import { Complaint, CreateComplaintInput, ComplaintStatus, ComplaintReply } from '../types';

export const INITIAL_MOBILE_COMPLAINTS: Complaint[] = [
  {
    id: 'c1',
    bookingId: 'b1',
    bookingTitle: 'Sửa rò rỉ bồn rửa chén',
    reporterId: 'u_customer_1',
    reporterName: 'Alex Trần',
    againstId: 'u_provider_1',
    againstName: 'AquaFix Plumbing',
    category: 'QUALITY',
    title: 'Thợ sửa xong nhưng nước vẫn rỉ và tính thêm tiền linh kiện',
    description:
      'Thợ tới muộn 30 phút, sau khi sửa xong thông báo phát sinh 200k tiền gioăng cao su nhưng không có hóa đơn. Tối cùng ngày bồn rửa lại tiếp tục rò rỉ nước ngập sàn bếp.',
    evidenceUrls: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500'],
    status: 'UNDER_REVIEW',
    createdAt: 'Hôm qua, 14:30',
    providerResponse: {
      note: 'Chào bạn, gioăng cao su cũ của bồn rửa bị mục nát hoàn toàn nên tôi đã thay loại chịu nhiệt. Tôi sẵn sàng qua bảo hành lại trong hôm nay.',
      respondedAt: 'Hôm qua, 17:15',
    },
    replies: [
      {
        id: 'r1',
        senderId: 'u_customer_1',
        senderName: 'Alex Trần',
        senderRole: 'customer',
        message: 'Nước rò rỉ nhiều hơn trước, đề nghị cử thợ có tay nghề hoặc hoàn trả phí.',
        createdAt: 'Hôm qua, 14:35',
      },
      {
        id: 'r2',
        senderId: 'u_provider_1',
        senderName: 'AquaFix Plumbing',
        senderRole: 'provider',
        message: 'Tôi xin lỗi vì sự cố, tôi sẽ ghé kiểm tra lại van nối miễn phí cho gia đình chiều nay lúc 16h.',
        createdAt: 'Hôm qua, 17:15',
      },
      {
        id: 'r3',
        senderId: 'u_staff_1',
        senderName: 'Trần Thị CSKH',
        senderRole: 'staff',
        message: 'Hệ thống đã tiếp nhận khiếu nại. CSKH đang theo dõi tiến độ bảo hành từ phía thợ. Nếu sự cố không được khắc phục hoàn toàn, hệ thống sẽ thực hiện bồi hoàn theo chính sách bảo hành 7 ngày.',
        createdAt: 'Hôm nay, 08:30',
      },
    ],
  },
  {
    id: 'c2',
    bookingId: 'b2',
    bookingTitle: 'Vệ sinh máy lạnh Daikin Inverter',
    reporterId: 'u_customer_1',
    reporterName: 'Alex Trần',
    againstId: 'u_provider_2',
    againstName: 'Điện Lạnh Siêu Tốc',
    category: 'NO_SHOW',
    title: 'Thợ không đến và không liên hệ báo trước',
    description:
      'Lịch hẹn lúc 9:00 sáng nhưng quá 10:30 vẫn không thấy thợ xuất hiện, gọi điện thoại thì thợ không bắt máy làm ảnh hưởng công việc gia đình.',
    status: 'RESOLVED',
    resolutionNote: 'Đã nhắc nhở cảnh cáo thợ vì vi phạm lịch hẹn, đồng ý hoàn 100% tiền cọc và tặng voucher 50.000 VNĐ cho khách hàng.',
    refundAmount: 150000,
    resolvedBy: 'CSKH Nguyễn Linh',
    resolvedAt: '12/10/2026',
    createdAt: '11/10/2026',
    replies: [
      {
        id: 'r4',
        senderId: 'u_customer_1',
        senderName: 'Alex Trần',
        senderRole: 'customer',
        message: 'Gọi 3 cuộc nhưng thợ không bắt máy, tôi phải dời lịch công tác.',
        createdAt: '11/10/2026',
      },
      {
        id: 'r5',
        senderId: 'u_staff_1',
        senderName: 'CSKH Nguyễn Linh',
        senderRole: 'staff',
        message: '[Xử lý khiếu nại - RESOLVED] Đã nhắc nhở cảnh cáo thợ vì vi phạm lịch hẹn, đồng ý hoàn 100% tiền cọc và tặng voucher 50.000 VNĐ cho khách hàng. (Mức bồi thường: 150.000 VNĐ)',
        createdAt: '12/10/2026',
      },
    ],
  },
];

const isMockEnabled = () => process.env.EXPO_PUBLIC_USE_MOCK === 'true';

/**
 * Fetch complaints from backend API (KAN-19)
 */
export async function getBackendComplaints(status?: string): Promise<Complaint[]> {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await apiRequest(`/complaints${query}`, { method: 'GET' });
    if (res.success && Array.isArray(res.data)) {
      return res.data.map((item: any) => ({
        id: item._id || item.id,
        bookingId: item.booking?._id || item.booking?.id || item.booking || 'b1',
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
        refundAmount: item.refundAmount,
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
  } catch (err: any) {
    if (isMockEnabled()) {
      console.warn('Backend getComplaints failed, using mock data because EXPO_PUBLIC_USE_MOCK=true');
      return INITIAL_MOBILE_COMPLAINTS;
    }
    throw err;
  }
}

/**
 * Submit a new complaint (KAN-13)
 * Maps input to backend schema { booking, category, title, description, evidenceUrls }
 */
export async function postCreateComplaint(input: CreateComplaintInput): Promise<Complaint> {
  try {
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
  } catch (err: any) {
    if (isMockEnabled()) {
      console.warn('Backend postCreateComplaint failed, creating locally because EXPO_PUBLIC_USE_MOCK=true');
      return {
        id: `c_${Date.now()}`,
        bookingId: input.bookingId,
        bookingTitle: input.title,
        reporterId: 'me',
        reporterName: 'Bạn (Khách hàng)',
        againstId: 'provider',
        againstName: 'Thợ đối tác',
        category: input.category,
        title: input.title,
        description: input.description,
        evidenceUrls: input.evidenceUrls || [],
        status: 'OPEN',
        createdAt: 'Vừa xong',
        replies: [],
      };
    }
    throw err;
  }
}

/**
 * Reply to an existing complaint (KAN-26)
 */
export async function postReplyComplaint(
  id: string,
  message: string,
  senderRole: 'customer' | 'provider' | 'staff' | 'admin' = 'customer'
): Promise<ComplaintReply> {
  try {
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
  } catch (err: any) {
    if (isMockEnabled()) {
      return {
        id: `r_${Date.now()}`,
        senderId: 'me',
        senderName: senderRole === 'staff' ? 'CSKH' : senderRole === 'provider' ? 'Thợ' : 'Bạn',
        senderRole,
        message,
        createdAt: 'Vừa xong',
      };
    }
    throw err;
  }
}

/**
 * Resolve complaint (KAN-26)
 */
export async function patchResolveComplaint(
  id: string,
  resolutionNote: string,
  refundAmount?: number,
  status: ComplaintStatus = 'RESOLVED'
): Promise<boolean> {
  try {
    const res = await apiRequest(`/complaints/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({
        resolutionNote,
        refundAmount: refundAmount || 0,
        status,
      }),
    });
    return res.success;
  } catch (err: any) {
    if (isMockEnabled()) {
      return true;
    }
    throw err;
  }
}
