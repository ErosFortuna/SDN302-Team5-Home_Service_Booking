'use client';

import { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Loader2,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  aiAssistantApi,
  type AiPriceBreakdownResult,
  type AiPossibility,
} from '@/lib/api/ai-assistant';
import { formatVND } from '@/lib/utils';
import { useToast } from '@/components/provider-booking/toast';
import { cn } from '@/lib/utils';

interface AiPriceCalculatorProps {
  description: string;
  categoryName: string;
  onApplyEstimate?: (min: number, max: number) => void;
  className?: string;
}

export function AiPriceCalculator({
  description,
  categoryName,
  onApplyEstimate,
  className,
}: AiPriceCalculatorProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiPriceBreakdownResult | null>(null);
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);
  const [expandedCauseIndex, setExpandedCauseIndex] = useState<number | null>(0);

  const handleAnalyze = async () => {
    if (!description.trim() || description.trim().length < 5) {
      toast.error('Vui lòng nhập mô tả sự cố cụ thể hơn (tối thiểu 5 ký tự) để AI phân tích.');
      return;
    }
    if (!categoryName) {
      toast.error('Vui lòng chọn danh mục dịch vụ.');
      return;
    }

    try {
      setLoading(true);
      const data = await aiAssistantApi.estimatePrice({
        description: description.trim(),
        serviceCategoryName: categoryName,
      });
      setResult(data);
      setExpandedCauseIndex(0);
      toast.success('AI đã phân tích xong nguyên nhân và định giá!');
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối dịch vụ AI. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQuestion = (question: string, index: number) => {
    navigator.clipboard.writeText(question);
    setCopiedQuestionIndex(index);
    toast.success('Đã sao chép câu hỏi để gửi cho thợ!');
    setTimeout(() => {
      setCopiedQuestionIndex(null);
    }, 2000);
  };

  return (
    <div
      className={cn(
        'rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/5 via-card to-card p-5 shadow-lg relative overflow-hidden transition-all',
        className
      )}
    >
      {/* Background Glow */}
      <div className="absolute -right-16 -top-16 size-44 rounded-full bg-brand/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-md shadow-brand/25">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black tracking-tight text-foreground">
                AI Price Breakdown & Anti-Overcharge
              </h3>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="size-3 mr-1" /> Chống vẽ bệnh
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dự toán minh bạch & bộ câu hỏi độc quyền giúp bạn nắm thế chủ động khi thợ báo giá.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading || !description.trim() || description.trim().length < 5}
          onClick={handleAnalyze}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Đang định giá AI...
            </>
          ) : (
            <>
              <BrainCircuit className="size-3.5" /> Phân tích bằng AI
            </>
          )}
        </button>
      </div>

      {/* Empty / Initial State Guide */}
      {!result && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center">
          <div className="flex justify-center mb-1.5 text-brand">
            <Sparkles className="size-5 opacity-70" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            Bạn chưa rõ chi phí sửa chữa là bao nhiêu?
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md mx-auto">
            Nhập mô tả sự cố ở trên rồi bấm <b>"Phân tích bằng AI"</b>. Hệ thống sẽ dự đoán các nguyên nhân phổ biến và cung cấp câu hỏi chuyên môn để bạn kiểm tra thợ.
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      )}

      {/* AI Analysis Result */}
      {result && !loading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Overall Estimate Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div>
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="size-3.5" /> Khoảng giá dự toán tổng quan
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatVND(result.overallEstimate.min)} — {formatVND(result.overallEstimate.max)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Mức giá tham khảo hợp lý tại thị trường theo mô tả của bạn.
              </div>
            </div>

            {onApplyEstimate && (
              <button
                type="button"
                onClick={() => onApplyEstimate(result.overallEstimate.min, result.overallEstimate.max)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-emerald-500/10 transition-colors shrink-0"
              >
                Áp dụng ngân sách này
              </button>
            )}
          </div>

          {/* Safety Recommendations (Hướng dẫn tiền xử lý an toàn) */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                <ShieldAlert className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Hướng dẫn tiền xử lý an toàn (Cần làm ngay trước khi thợ đến)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Để bảo vệ an toàn cho gia đình và tránh hư hại thêm cho thiết bị, vui lòng lưu ý:
              </p>
              <div className="space-y-2">
                {result.recommendations.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-card p-3 text-xs leading-relaxed"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-black text-rose-600 dark:text-rose-400 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Probable Causes & Price Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Các khả năng xảy ra & Bóc tách chi phí:</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {result.possibilities.length} nguyên nhân dự đoán
              </span>
            </div>

            <div className="space-y-2">
              {result.possibilities.map((item, idx) => {
                const isExpanded = expandedCauseIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border bg-card p-3.5 transition-all hover:border-brand/30"
                  >
                    <div
                      className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      onClick={() => setExpandedCauseIndex(isExpanded ? null : idx)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-secondary text-[11px] font-black text-brand shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">
                            {item.cause}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-brand">
                              Xác suất: {item.probability}%
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Dự kiến: {formatVND(item.estimatedPrice.min)} - {formatVND(item.estimatedPrice.max)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-border/60 text-xs text-muted-foreground leading-relaxed animate-in fade-in">
                        <p>{item.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anti-Overcharge Questions */}
          {result.suggestedQuestions.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <HelpCircle className="size-4" />
                Câu hỏi thông minh để hỏi thợ (Tránh bị kê giá / vẽ bệnh)
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Hỏi trực tiếp thợ những câu này khi thợ đến khảo sát hoặc nhắn tin. Thợ chuyên nghiệp sẽ giải thích rõ ràng và không dám báo khống:
              </p>

              <div className="space-y-2">
                {result.suggestedQuestions.map((q, idx) => {
                  const isCopied = copiedQuestionIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-card p-3 text-xs leading-relaxed"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
                          Q{idx + 1}:
                        </span>
                        <span className="text-foreground italic">"{q}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyQuestion(q, idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                        title="Sao chép câu hỏi"
                      >
                        {isCopied ? (
                          <>
                            <Check className="size-3 text-emerald-500" />
                            <span className="text-emerald-500">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
            <span>{result.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
