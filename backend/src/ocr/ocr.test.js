const request = require('supertest');
const app = require('../../app');
const ocrService = require('./ocrService');

describe('OCR Service & API Tests', () => {
  describe('lookupTaxCode helper', () => {
    it('trả về null nếu taxCode không hợp lệ hoặc quá ngắn', async () => {
      const result = await ocrService.lookupTaxCode('123');
      expect(result).toBeNull();
    });

    it('trả về null nếu taxCode rỗng', async () => {
      const result = await ocrService.lookupTaxCode(null);
      expect(result).toBeNull();
    });
  });

  describe('scanInvoice validation', () => {
    it('báo lỗi 400 nếu không có imageBase64', async () => {
      await expect(ocrService.scanInvoice({})).rejects.toThrow(
        'Dữ liệu ảnh hóa đơn (imageBase64) là bắt buộc'
      );
    });
  });

  describe('POST /api/ocr/scan Endpoint', () => {
    it('trả về 400 nếu body rỗng không có imageBase64', async () => {
      const res = await request(app)
        .post('/api/ocr/scan')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Thiếu dữ liệu ảnh hóa đơn');
    });

    it('bóc tách thành công khi mock lệnh gọi Gemini API', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          taxCode: '0303886515',
                          buyerTaxCode: null,
                          vendorName: 'Highlands Coffee',
                          amount: 145000,
                          vatAmount: 11600,
                          vatRate: '8%',
                          category: 'Ăn uống',
                          purpose: 'Tiếp khách cà phê',
                          date: '2026-10-12',
                          isVatInvoice: true,
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
          });
        }
        if (url.includes('api.vietqr.io')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              code: '00',
              data: {
                name: 'CÔNG TY CỔ PHẦN DỊCH VỤ CÀ PHÊ CAO NGUYÊN',
                address: 'Quận 1, TP. Hồ Chí Minh',
              },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL in test'));
      });

      const res = await request(app)
        .post('/api/ocr/scan')
        .send({
          imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(145000);
      expect(res.body.data.taxCode).toBe('0303886515');
      expect(res.body.data.vendorName).toBe('Highlands Coffee');
      expect(res.body.data.category).toBe('Ăn uống');
      expect(res.body.data.mode).toBe('gemini_flash_backend');

      global.fetch = originalFetch;
    });
  });
});
