/**
 * Định dạng số tiền thành chuỗi tiền tệ VND chuẩn (ví dụ: 1.250.000 ₫)
 */
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(amount);
};

export const formatCurrency = formatVND;
