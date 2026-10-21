const config = require('../config/env');

const GEMINI_SYSTEM_PROMPT = `Bạn là chuyên gia AI FinTech kiêm Kế toán trưởng chuyên trách bóc tách, chuẩn hóa dữ liệu hóa đơn và chứng từ thanh toán tại Việt Nam.
Hãy phân tích hình ảnh chứng từ và trích xuất dữ liệu, CHỈ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (không kèm bất kỳ văn bản giải thích hay khối markdown \`\`\`json\`\`\` nào):
{
  "taxCode": "Mã số thuế người bán (10 hoặc 13 chữ số, nếu không có để null)",
  "buyerTaxCode": "Mã số thuế người mua nếu có, hoặc null",
  "vendorName": "Tên quán hoặc tên công ty bán",
  "amount": số tiền tổng thanh toán cuối cùng bằng số nguyên (ví dụ 350000, không có ký tự lạ),
  "vatAmount": tiền thuế VAT nếu có (số nguyên) hoặc null,
  "vatRate": "thuế suất VAT (8%, 10%...) hoặc null",
  "category": "chọn 1 trong 4 danh mục chuẩn: Ăn uống, Đi lại, Mua sắm, Phần mềm",
  "purpose": "tóm tắt ngắn gọn mục đích chi tiêu (dưới 15 từ)",
  "date": "YYYY-MM-DD",
  "isVatInvoice": true nếu là hóa đơn GTGT chính thức có ký hiệu/số hóa đơn, false nếu là bill nhiệt
}`;

/**
 * Tạm thời vô hiệu hóa tra cứu VietQR để tập trung kiểm tra dữ liệu gốc từ Gemini
 */
const lookupTaxCode = async () => null;

let cachedWorkingModel = 'gemini-3.5-flash-lite';

/**
 * Tự động lấy danh sách model khả dụng từ Google theo API Key hiện tại
 */
const getAvailableModel = async (apiKey) => {
  if (cachedWorkingModel) return cachedWorkingModel;

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const res = await fetch(listUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const models = data.models || [];
      const flashModel = models.find(m => 
        (m.supportedGenerationMethods || []).includes('generateContent') && 
        (m.name.includes('3.6-flash') || m.name.includes('3.7-flash') || m.name.includes('3.5-flash'))
      );
      if (flashModel) {
        cachedWorkingModel = flashModel.name.replace(/^models\//, '');
        console.log(`[OCR Service] Tự động chọn model Flash: "${cachedWorkingModel}"`);
        return cachedWorkingModel;
      }
    }
  } catch (err) {
    console.warn('[OCR Service] Lỗi khi gọi ListModels:', err.message);
  }

  return 'gemini-3.6-flash';
};

/**
 * Bóc tách dữ liệu hóa đơn bằng Google Gemini Flash
 * @param {Object} params
 * @param {string} params.imageBase64 - Dữ liệu ảnh dạng base64 (không kèm prefix data:image/...)
 * @param {string} [params.mimeType='image/jpeg'] - Định dạng mime của ảnh
 */
const scanInvoice = async ({ imageBase64, mimeType = 'image/jpeg' }) => {
  if (!imageBase64) {
    const error = new Error('Dữ liệu ảnh hóa đơn (imageBase64) là bắt buộc');
    error.statusCode = 400;
    throw error;
  }

  // Làm sạch chuỗi base64 nếu client gửi kèm data URL prefix
  const cleanBase64 = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;

  const apiKey = (config.gemini && config.gemini.apiKey) || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ Backend');
    error.statusCode = 500;
    throw error;
  }

  // Danh sách model ưu tiên (Ưu tiên dòng Flash-Lite cực nhẹ, không bị High Demand 503)
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
  ].filter(Boolean);

  // Loại bỏ model trùng nhau
  const uniqueModels = [...new Set(candidateModels)];

  let response = null;
  let lastErrorText = '';
  const startTime = Date.now();

  for (const model of uniqueModels) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    console.log(`[OCR Service] Đang gửi ảnh sang model "${model}"...`);

    try {
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000), // Tối đa 15s cho mỗi model
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: GEMINI_SYSTEM_PROMPT },
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        response = res;
        cachedWorkingModel = model; // Lưu lại model chạy thành công
        console.log(`[OCR Service] 🎉 Model "${model}" bóc tách thành công sau ${Date.now() - startTime}ms!`);
        break;
      } else {
        lastErrorText = await res.text();
        console.warn(`[OCR Service] Model "${model}" trả về mã ${res.status}: ${lastErrorText.slice(0, 120)}`);
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          continue;
        } else {
          const error = new Error(`Gemini API Error (${res.status}): ${lastErrorText}`);
          error.statusCode = res.status >= 500 ? 502 : 400;
          throw error;
        }
      }
    } catch (fetchErr) {
      console.warn('[OCR Service] Lỗi khi gọi model:', model, fetchErr.message);
      lastErrorText = fetchErr.message;
      continue;
    }
  }

  if (!response) {
    const error = new Error(`Gemini API Error: ${lastErrorText}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Trích xuất chuỗi JSON sạch
  let cleanJson = textOutput.trim();
  const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanJson = jsonMatch[0];
  }

  let parsed = {};
  try {
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('[OCR Service] JSON parse error:', err.message, 'Raw text:', textOutput);
    parsed = {
      vendorName: 'Hóa đơn chưa nhận dạng',
      amount: 0,
      category: 'Ăn uống',
      purpose: 'Chi tiêu',
    };
  }

  // Chuẩn hóa amount thành số nguyên
  if (parsed.amount !== undefined && parsed.amount !== null) {
    if (typeof parsed.amount === 'string') {
      const cleanNum = parsed.amount.replace(/[^0-9]/g, '');
      parsed.amount = cleanNum ? parseInt(cleanNum, 10) : 0;
    } else {
      parsed.amount = Math.round(Number(parsed.amount) || 0);
    }
  }

  return {
    ...parsed,
    mode: 'gemini_flash_backend',
  };
};

module.exports = {
  scanInvoice,
  lookupTaxCode,
  GEMINI_SYSTEM_PROMPT,
};
