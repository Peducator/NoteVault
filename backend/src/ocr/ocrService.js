const config = require('../config/env');

const GEMINI_SYSTEM_PROMPT = `Bạn là chuyên gia AI FinTech kiêm Kế toán trưởng chuyên trách bóc tách, chuẩn hóa dữ liệu hóa đơn và chứng từ thanh toán tại Việt Nam.
Hãy phân tích hình ảnh chứng từ và trích xuất dữ liệu, CHỈ TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (không kèm bất kỳ văn bản giải thích hay khối markdown \`\`\`json\`\`\` nào):
{
  "invoiceNumber": "Số hóa đơn hoặc số phiếu biên nhận nếu có (ví dụ: H190005/21-Q001, 1149405, HD-001...), nếu không có để null",
  "taxCode": "Mã số thuế người bán (10 hoặc 13 chữ số, nếu không có để null)",
  "buyerTaxCode": "Mã số thuế người mua nếu có, hoặc null",
  "vendorName": "Tên quán hoặc tên công ty bán",
  "amount": số tiền tổng thanh toán cuối cùng bằng số nguyên (ví dụ 350000, không có ký tự lạ),
  "vatAmount": tiền thuế VAT nếu có (số nguyên) hoặc null,
  "vatRate": "thuế suất VAT (8%, 10%...) hoặc null",
  "category": "chọn 1 trong 5 danh mục: Ăn uống, Đi lại, Mua sắm, Phần mềm, Khác",
  "purpose": "tóm tắt ngắn gọn mục đích chi tiêu hoặc tên hàng hóa dịch vụ chính (dưới 15 từ)",
  "date": "ngày lập hóa đơn định dạng YYYY-MM-DD (ví dụ 2025-08-03, nếu không có thì null)",
  "isVatInvoice": true nếu là hóa đơn GTGT chính thức có ký hiệu/số hóa đơn, false nếu là bill nhiệt hoặc phiếu biên nhận
}`;

/**
 * Tạm thời vô hiệu hóa tra cứu VietQR để tập trung kiểm tra dữ liệu gốc từ Gemini
 */
const lookupTaxCode = async () => null;



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

  // Cố định 1 mô hình duy nhất (Mặc định: gemini-flash-lite-latest, hoặc chỉ định qua GEMINI_MODEL)
  const targetModel = (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest').trim();
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  console.log(`[OCR Service] Bóc tách ảnh với mô hình cố định: "${targetModel}"...`);

  const startTime = Date.now();
  let response;

  try {
    response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000), // Cho phép tối đa 30s
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
  } catch (fetchErr) {
    console.error('[OCR Service] Lỗi kết nối tới model "%s":', targetModel, fetchErr.message);
    const error = new Error(`Lỗi kết nối tới Gemini API (${targetModel}): ${fetchErr.message}`);
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OCR Service] Model "${targetModel}" trả về lỗi (${response.status}): ${errorText.slice(0, 200)}`);
    const error = new Error(`Gemini API Error (${response.status}): ${errorText}`);
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }

  console.log(`[OCR Service] 🎉 Model "${targetModel}" bóc tách thành công sau ${Date.now() - startTime}ms!`);

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

  // Chuẩn hóa vatAmount nếu có
  if (parsed.vatAmount !== undefined && parsed.vatAmount !== null) {
    if (typeof parsed.vatAmount === 'string') {
      const cleanVat = parsed.vatAmount.replace(/[^0-9]/g, '');
      parsed.vatAmount = cleanVat ? parseInt(cleanVat, 10) : null;
    } else {
      parsed.vatAmount = Math.round(Number(parsed.vatAmount) || 0);
    }
  }

  return {
    ...parsed,
    totalAmount: parsed.amount,
    suggestedCategory: parsed.category,
    invoiceNumber: parsed.invoiceNumber || null,
    vatAmount: parsed.vatAmount || null,
    date: parsed.date || null,
    mode: 'gemini_flash_backend',
  };
};

module.exports = {
  scanInvoice,
  lookupTaxCode,
  GEMINI_SYSTEM_PROMPT,
};
