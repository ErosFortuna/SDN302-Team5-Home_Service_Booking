const OpenAI = require('openai');
const mongoose = require('mongoose');
const { env } = require('../../config/env.js');
const { AppError } = require('../../shared/app-error.js');
const { AiEstimateAudit } = require('./ai-assistant.model.js');

let openaiClient = null;

function getOpenAIClient() {
  const apiKey = env.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Heuristic/rule-based fallback when OpenAI API key is not configured or offline.
 * Ensures the application is resilient and demo-ready at all times.
 */
function generateHeuristicBreakdown({ description, serviceCategoryName }) {
  const lowerDesc = (description || '').toLowerCase();
  const lowerCat = (serviceCategoryName || '').toLowerCase();

  let possibilities = [];
  let suggestedQuestions = [];

  if (lowerCat.includes('máy lạnh') || lowerCat.includes('điện lạnh') || lowerDesc.includes('lạnh') || lowerDesc.includes('gas') || lowerDesc.includes('chảy nước')) {
    possibilities = [
      {
        cause: 'Thiếu/hết gas hoặc xì đường ống đồng dẫn gas',
        probability: 55,
        estimatedPrice: { min: 200000, max: 450000 },
        explanation: 'Máy nén vẫn chạy nhưng hơi gió thổi ra không lạnh sâu hoặc có mùi ẩm. Cần nạp bổ sung gas lạnh chuẩn R32/R410A.',
      },
      {
        cause: 'Dàn lạnh quá bẩn hoặc nghẹt ống thoát nước ngưng',
        probability: 30,
        estimatedPrice: { min: 150000, max: 250000 },
        explanation: 'Bụi bẩn bám dày trên lưới lọc và máng thoát nước gây nhỏ giọt xuống sàn và cản trở lưu thông gió lạnh.',
      },
      {
        cause: 'Hỏng tụ quạt hoặc tụ khởi động block (máy nén)',
        probability: 15,
        estimatedPrice: { min: 350000, max: 650000 },
        explanation: 'Quạt dàn nóng không quay hoặc máy nén phát ra tiếng gừ nhưng không kích hoạt được.',
      },
    ];
    suggestedQuestions = [
      'Anh đo giúp em áp suất gas hiện tại bằng đồng hồ là bao nhiêu PSI trước khi nạp thêm nhé?',
      'Ống thoát nước có bị tắc nghẽn hay rỉ sét đoạn nào cần thay mới không anh?',
      'Linh kiện tụ thay thế có dán tem bảo hành và là hàng chính hãng không?',
    ];
  } else if (lowerCat.includes('nước') || lowerCat.includes('ống') || lowerDesc.includes('rò rỉ') || lowerDesc.includes('bồn cầu') || lowerDesc.includes('nghẹt')) {
    possibilities = [
      {
        cause: 'Hỏng gioăng cao su hoặc van khóa/ren nối bị nứt hở',
        probability: 60,
        estimatedPrice: { min: 120000, max: 250000 },
        explanation: 'Gioăng đệm bị lão hóa qua thời gian sử dụng, chỉ cần thay thế phụ kiện ron và quấn băng tan chống rò rỉ.',
      },
      {
        cause: 'Nứt bể ống PVC/PPR âm tường hoặc đoạn nối co lơ',
        probability: 25,
        estimatedPrice: { min: 250000, max: 550000 },
        explanation: 'Cần đục tỉa nhỏ để hàn nối lại ống nhiệt PPR hoặc thay đoạn ống nối chữ T/co.',
      },
      {
        cause: 'Dị vật kẹt trong ống xả hoặc xi phông bồn rửa',
        probability: 15,
        estimatedPrice: { min: 150000, max: 300000 },
        explanation: 'Cặn xà phòng, tóc và dầu mỡ đóng bánh. Cần sử dụng máy thông tắc lò xo hoặc tháo rửa bẫy cặn.',
      },
    ];
    suggestedQuestions = [
      'Hiện tượng rò rỉ nằm ở vị trí mối nối nổi hay phải đục phá tường/sàn vậy anh?',
      'Vật tư phụ kiện thay thế (van, dây cấp, gioăng) là của thương hiệu nào và bảo hành bao lâu?',
      'Sau khi sửa anh có test áp lực nước thử tải trước khi bàn giao không?',
    ];
  } else if (lowerCat.includes('điện') || lowerDesc.includes('sập') || lowerDesc.includes('chập') || lowerDesc.includes('attomat') || lowerDesc.includes('cb')) {
    possibilities = [
      {
        cause: 'Chập điện cục bộ tại ổ cắm, công tắc hoặc thiết bị tiêu thụ công suất lớn',
        probability: 50,
        estimatedPrice: { min: 150000, max: 350000 },
        explanation: 'Quá tải thiết bị làm nhảy aptomat (CB) bảo vệ hoặc cháy tiếp điểm tại ổ cắm điện.',
      },
      {
        cause: 'Aptomat (CB) tổng hoặc CB nhánh bị chai hỏng cơ cấu ngắt',
        probability: 30,
        estimatedPrice: { min: 200000, max: 400000 },
        explanation: 'Aptomat đã sử dụng lâu năm, lò xo phản xạ kém gây nhảy sai lệch dù không có dòng rò.',
      },
      {
        cause: 'Dây điện nguồn luồn ống ghen âm tường bị đứt ngầm hoặc ẩm cách điện',
        probability: 20,
        estimatedPrice: { min: 350000, max: 750000 },
        explanation: 'Cần dùng đồng hồ đo megohm kiểm tra điện trở cách điện và kéo lại dây mới vào ống ghen.',
      },
    ];
    suggestedQuestions = [
      'Anh dùng đồng hồ ampe kìm đo giúp em xem đang bị nhảy do dòng quá tải hay do chập rò rỉ điện nhé?',
      'CB thay mới là loại có chống giật (RCBO/ELCB) hay chỉ chống quá tải thông thường (MCB)?',
      'Anh có kiểm tra lại toàn bộ ổ cắm trên cùng đường dây sau khi khắc phục xong không?',
    ];
  } else {
    possibilities = [
      {
        cause: 'Hư hỏng linh kiện thông thường hoặc hao mòn cơ khí',
        probability: 60,
        estimatedPrice: { min: 150000, max: 350000 },
        explanation: 'Cần vệ sinh, căn chỉnh lại khớp nối, thay ron hoặc thay phụ kiện cơ bản định kỳ.',
      },
      {
        cause: 'Cần thay thế linh kiện chuyên dụng mới',
        probability: 40,
        estimatedPrice: { min: 350000, max: 650000 },
        explanation: 'Chi tiết bị vỡ hỏng không thể phục hồi, cần phụ tùng đúng model xuất xứ rõ ràng.',
      },
    ];
    suggestedQuestions = [
      'Linh kiện thay thế có nguyên hộp và tem niêm phong xuất xứ rõ ràng không anh?',
      'Anh giải thích cụ thể nguyên nhân hư hỏng trước khi tiến hành thay thế giúp em nhé.',
      'Chi phí này đã bao gồm công thợ và bảo hành tận nhà chưa anh?',
    ];
  }

  return {
    possibilities,
    suggestedQuestions,
    disclaimer: 'Đây là mức giá dự toán tham khảo dựa trên thống kê thị trường. Thợ cần khảo sát thực tế để báo giá chính xác.',
    modelUsed: 'heuristic-engine-v1',
    isAiGenerated: false,
  };
}

/**
 * Analyzes problem description and returns AI-powered transparent price breakdown
 * and anti-overcharge smart questions.
 */
async function estimatePriceBreakdown({
  description,
  serviceCategoryName,
  userId,
  ipAddress,
}) {
  const client = getOpenAIClient();

  let resultData = null;
  let modelUsed = env.openaiModel || 'gpt-4o-mini';
  let tokensUsed = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let isAiGenerated = false;

  if (client) {
    try {
      const systemPrompt = `Bạn là chuyên gia giám định kỹ thuật và chi phí sửa chữa dịch vụ gia đình độc lập (điện nước, điện lạnh, khóa, đồ gia dụng, xây dựng...) tại Việt Nam.
Nhiệm vụ của bạn là:
1. Phân tích mô tả sự cố của khách hàng để dự đoán từ 1 đến 3 nguyên nhân khả dĩ nhất kèm theo xác suất (probability: tổng khoảng 100%), khoảng giá thị trường hợp lý tại Việt Nam (estimatedPrice: min, max tính bằng VNĐ, là số nguyên), và lời giải thích kỹ thuật ngắn gọn, dễ hiểu.
2. Đưa ra danh sách từ 2 đến 4 "Câu hỏi thông minh" (suggestedQuestions) sắc sảo, lịch sự, đúng trọng tâm kỹ thuật để khách hàng hỏi thợ khi khảo sát, giúp tránh bị thợ "vẽ thêm bệnh", kê khống vật tư hoặc nâng khống giá.
3. Kèm theo câu miễn trừ trách nhiệm (disclaimer) ngắn gọn bằng tiếng Việt.

BẮT BUỘC trả về đúng cấu trúc JSON sau (không thêm bất kỳ định dạng Markdown hay văn bản nào ngoài JSON):
{
  "possibilities": [
    {
      "cause": "Tên nguyên nhân sự cố ngắn gọn",
      "probability": 60,
      "estimatedPrice": { "min": 150000, "max": 350000 },
      "explanation": "Giải thích kỹ thuật ngắn gọn..."
    }
  ],
  "suggestedQuestions": [
    "Câu hỏi 1 để hỏi thợ...",
    "Câu hỏi 2..."
  ],
  "disclaimer": "Đây chỉ là mức giá dự toán tham khảo. Thợ cần khảo sát thực tế để báo giá chính xác."
}`;

      const userPrompt = `Danh mục dịch vụ: ${serviceCategoryName}
Mô tả sự cố của khách hàng: "${description}"

Hãy phân tích kỹ thuật và định giá minh bạch cho khách hàng.`;

      const response = await client.chat.completions.create({
        model: modelUsed,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const messageContent = response.choices?.[0]?.message?.content;
      if (messageContent) {
        const parsed = JSON.parse(messageContent);
        if (Array.isArray(parsed.possibilities) && parsed.possibilities.length > 0) {
          resultData = {
            possibilities: parsed.possibilities.map((p) => ({
              cause: String(p.cause || 'Sự cố thiết bị'),
              probability: Number(p.probability) || 50,
              estimatedPrice: {
                min: Number(p.estimatedPrice?.min) || 150000,
                max: Number(p.estimatedPrice?.max) || 350000,
              },
              explanation: String(p.explanation || ''),
            })),
            suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
              ? parsed.suggestedQuestions.map((q) => String(q))
              : [],
            disclaimer:
              parsed.disclaimer ||
              'Đây chỉ là mức giá dự toán tham khảo. Thợ cần khảo sát thực tế để báo giá chính xác.',
          };
          isAiGenerated = true;
          if (response.usage) {
            tokensUsed = {
              promptTokens: response.usage.prompt_tokens || 0,
              completionTokens: response.usage.completion_tokens || 0,
              totalTokens: response.usage.total_tokens || 0,
            };
          }
        }
      }
    } catch (openaiErr) {
      console.warn('[AI Assistant] OpenAI API call failed or timed out, falling back to heuristic engine:', openaiErr.message);
    }
  }

  // Fallback to heuristic if OpenAI not configured or failed
  if (!resultData) {
    const fallback = generateHeuristicBreakdown({ description, serviceCategoryName });
    resultData = {
      possibilities: fallback.possibilities,
      suggestedQuestions: fallback.suggestedQuestions,
      disclaimer: fallback.disclaimer,
    };
    modelUsed = fallback.modelUsed;
    isAiGenerated = fallback.isAiGenerated;
  }

  // Calculate overall estimate min and max
  const allMins = resultData.possibilities.map((p) => p.estimatedPrice.min);
  const allMaxs = resultData.possibilities.map((p) => p.estimatedPrice.max);
  const overallEstimate = {
    min: Math.min(...allMins),
    max: Math.max(...allMaxs),
  };

  // Record audit log if MongoDB connection is ready (non-blocking)
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await AiEstimateAudit.create({
        user: userId || undefined,
        serviceCategoryName,
        description,
        possibilities: resultData.possibilities,
        suggestedQuestions: resultData.suggestedQuestions,
        disclaimer: resultData.disclaimer,
        overallEstimate,
        modelUsed,
        tokensUsed,
        ipAddress: ipAddress || 'Unknown',
      });
    } catch (auditErr) {
      console.error('[AI Assistant Audit Error]:', auditErr.message);
    }
  }

  return {
    ...resultData,
    overallEstimate,
    meta: {
      model: modelUsed,
      isAiGenerated,
      analyzedAt: new Date(),
    },
  };
}

module.exports = {
  estimatePriceBreakdown,
  generateHeuristicBreakdown,
};
