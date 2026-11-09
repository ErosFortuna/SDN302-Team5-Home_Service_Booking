import { apiRequest } from './client';

export interface PriceRange {
  min: number;
  max: number;
}

export interface AiPossibility {
  cause: string;
  probability: number;
  estimatedPrice: PriceRange;
  explanation: string;
}

export interface AiPriceBreakdownResult {
  possibilities: AiPossibility[];
  suggestedQuestions: string[];
  recommendations: string[];
  disclaimer: string;
  overallEstimate: PriceRange;
  meta: {
    model: string;
    isAiGenerated: boolean;
    analyzedAt: string;
  };
}

export interface EstimatePricePayload {
  description: string;
  serviceCategoryName: string;
}

export const aiAssistantApi = {
  /**
   * Request AI Price Breakdown and Anti-Overcharge analysis.
   */
  async estimatePrice(payload: EstimatePricePayload): Promise<AiPriceBreakdownResult> {
    const res = await apiRequest<{
      success: boolean;
      message: string;
      data: AiPriceBreakdownResult;
    }>('/ai/estimate-price', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.data;
  },
};
