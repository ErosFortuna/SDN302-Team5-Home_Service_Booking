import { apiRequest } from './client';

export type PolicyType = 'PRIVACY_POLICY' | 'TERMS_OF_SERVICE' | 'PROVIDER_CONTRACT';

export interface Policy {
  _id: string;
  title: string;
  type: PolicyType;
  content: string;
  version: string;
  isMandatory: boolean;
  isActive: boolean;
  summary?: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

export interface UserConsent {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
  };
  policy: {
    _id: string;
    title: string;
    type: PolicyType;
    version: string;
    effectiveDate: string;
  };
  type: PolicyType;
  version: string;
  acceptedAt: string;
  ipAddress: string;
  userAgent?: string;
}

export interface PendingConsentsResponse {
  required: boolean;
  pendingCount: number;
  policies: Policy[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PolicyStats {
  totalPolicies: number;
  activePolicies: number;
  totalConsents: number;
}

export interface CreatePolicyPayload {
  title: string;
  type: PolicyType;
  content: string;
  version: string;
  isMandatory?: boolean;
  isActive?: boolean;
  summary?: string;
  effectiveDate?: string;
}

export interface UpdatePolicyPayload {
  title?: string;
  content?: string;
  isMandatory?: boolean;
  isActive?: boolean;
  summary?: string;
  effectiveDate?: string;
}

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  PRIVACY_POLICY: 'Chính sách bảo mật',
  TERMS_OF_SERVICE: 'Điều khoản sử dụng',
  PROVIDER_CONTRACT: 'Hợp đồng đối tác',
};

export const policyApi = {
  /** Public: get all currently active policies */
  async getActivePolicies(type?: PolicyType): Promise<Policy[]> {
    const q = type ? `?type=${type}` : '';
    const res = await apiRequest<{ success: boolean; data: Policy[] }>(`/policies/active${q}`);
    return res.data;
  },

  /** Public: get latest active policy for a specific type */
  async getActivePolicyByType(type: PolicyType): Promise<Policy> {
    const res = await apiRequest<{ success: boolean; data: Policy }>(`/policies/active/${type}`);
    return res.data;
  },

  /** Public/Auth: get policy by ID */
  async getPolicyById(id: string): Promise<Policy> {
    const res = await apiRequest<{ success: boolean; data: Policy }>(`/policies/${id}`);
    return res.data;
  },

  /** Auth: get active mandatory policies needing consent for current user */
  async getPendingConsents(): Promise<PendingConsentsResponse> {
    const res = await apiRequest<{ success: boolean; data: PendingConsentsResponse }>('/policies/pending-consent');
    return res.data;
  },

  /** Auth: submit consent for a policy or list of policies */
  async submitConsent(payload: { policyId?: string; policyIds?: string[] }): Promise<UserConsent[]> {
    const res = await apiRequest<{ success: boolean; data: UserConsent[] }>('/policies/consent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /** Auth: get current user consent history */
  async getMyConsents(page = 1, limit = 20): Promise<{ consents: UserConsent[]; pagination: Pagination }> {
    const res = await apiRequest<{ success: boolean; data: UserConsent[]; pagination: Pagination }>(
      `/policies/my-consents?page=${page}&limit=${limit}`
    );
    return { consents: res.data, pagination: res.pagination };
  },

  /** Admin: get policy statistics */
  async getAdminPolicyStats(): Promise<PolicyStats> {
    const res = await apiRequest<{ success: boolean; data: PolicyStats }>('/admin/policies/stats');
    return res.data;
  },

  /** Admin: list policies with filters and pagination */
  async getAdminPolicies(params?: {
    type?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ policies: Policy[]; pagination: Pagination }> {
    const sp = new URLSearchParams();
    if (params?.type) sp.set('type', params.type);
    if (params?.isActive !== undefined) sp.set('isActive', String(params.isActive));
    if (params?.search) sp.set('search', params.search);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));

    const query = sp.toString() ? `?${sp.toString()}` : '';
    const res = await apiRequest<{ success: boolean; data: Policy[]; pagination: Pagination }>(
      `/admin/policies${query}`
    );
    return { policies: res.data, pagination: res.pagination };
  },

  /** Admin: get policy details */
  async getAdminPolicy(id: string): Promise<Policy> {
    const res = await apiRequest<{ success: boolean; data: Policy }>(`/admin/policies/${id}`);
    return res.data;
  },

  /** Admin: create new policy or new version */
  async createAdminPolicy(payload: CreatePolicyPayload): Promise<Policy> {
    const res = await apiRequest<{ success: boolean; data: Policy }>('/admin/policies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /** Admin: update policy */
  async updateAdminPolicy(id: string, payload: UpdatePolicyPayload): Promise<Policy> {
    const res = await apiRequest<{ success: boolean; data: Policy }>(`/admin/policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /** Admin: view consent audit log for a policy */
  async getAdminPolicyConsents(
    id: string,
    page = 1,
    limit = 20
  ): Promise<{ consents: UserConsent[]; policy: Policy; pagination: Pagination }> {
    const res = await apiRequest<{
      success: boolean;
      data: UserConsent[];
      policy: Policy;
      pagination: Pagination;
    }>(`/admin/policies/${id}/consents?page=${page}&limit=${limit}`);
    return { consents: res.data, policy: res.policy, pagination: res.pagination };
  },
};
