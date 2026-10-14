'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  ShieldCheck, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  RefreshCw, 
  FileCheck,
  AlertCircle 
} from 'lucide-react';
import { expenseApi } from '../apis/expenseApi';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    amount: number;
    category: 'Ăn uống' | 'Đi lại' | 'Mua sắm' | 'Phần mềm';
    purpose: string;
    taxCode?: string;
    vendorName?: string;
    receiptUrl?: string;
  }) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<'Ăn uống' | 'Đi lại' | 'Mua sắm' | 'Phần mềm'>('Ăn uống');
  const [purpose, setPurpose] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusText, setScanStatusText] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Thông tin sau khi bóc tách & tra cứu mã số thuế thật
  const [taxData, setTaxData] = useState<{
    taxCode: string;
    companyName: string;
    address?: string;
    isValid: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Xử lý quét AI từ file ảnh thật thông qua Backend
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset kết quả cũ
    setScanError(null);
    setTaxData(null);
    setAmount('');
    setPurpose('');

    // Tạo preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setIsScanning(true);
    setScanStatusText('Đang xử lý...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const mimeType = file.type || 'image/jpeg';

          const resJson = await expenseApi.scanInvoice({
            imageBase64: base64Data,
            mimeType,
          });

          const parsed = resJson.data || {};

          // Cập nhật số tiền và thông tin bóc tách THẬT
          if (parsed.amount) {
            setAmount(String(parsed.amount));
          }
          if (parsed.category) {
            setCategory(parsed.category);
          }
          if (parsed.purpose) {
            setPurpose(parsed.purpose);
          }

          // Cập nhật thông tin công ty / MST thật
          if (parsed.verifiedCompany && parsed.verifiedCompany.taxCode) {
            setTaxData({
              taxCode: parsed.verifiedCompany.taxCode,
              companyName: parsed.verifiedCompany.name || parsed.vendorName || 'Đơn vị kinh doanh',
              address: parsed.verifiedCompany.address || '',
              isValid: true,
            });
          } else if (parsed.taxCode) {
            setTaxData({
              taxCode: parsed.taxCode,
              companyName: parsed.vendorName || 'Đơn vị kinh doanh',
              isValid: true,
            });
          } else if (parsed.vendorName) {
            setTaxData({
              taxCode: 'Không có MST',
              companyName: parsed.vendorName,
              isValid: false,
            });
          }
        } catch (err: any) {
          console.error('[OCR Error]', err);
          if (err.name === 'TypeError' && err.message.includes('fetch')) {
            setScanError('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng đảm bảo server backend đang chạy (cd backend && npm run dev)!');
          } else {
            setScanError(err.message || 'Lỗi bóc tách hóa đơn');
          }
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setScanError(err.message || 'Không thể đọc file ảnh');
      setIsScanning(false);
    }
  };

  // Submit form
  const handleSubmitForm = () => {
    const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;
    if (parsedAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    if (onSubmit) {
      onSubmit({
        amount: parsedAmount,
        category,
        purpose: purpose.trim() || 'Chi tiêu công tác',
        taxCode: taxData?.taxCode,
        vendorName: taxData?.companyName,
        receiptUrl: imagePreview || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200 text-zinc-900 dark:text-zinc-100">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/70 dark:bg-zinc-850/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Nộp hóa đơn & Bóc tách
                <span className="text-[10px] sm:text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Tự động OCR
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">Hệ thống tự động đọc số tiền & thông tin đơn vị</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Cột */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          
          {/* CỘT TRÁI: Upload & Scan */}
          <div className="flex flex-col space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                1. Ảnh hóa đơn chứng từ
              </label>
            </div>

            {/* Thông báo lỗi nếu có */}
            {scanError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Khung Upload & Preview */}
            <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 overflow-hidden flex flex-col items-center justify-center min-h-[220px] p-4 text-center group transition-all hover:border-zinc-300 dark:hover:border-zinc-600">
              {imagePreview ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={imagePreview} 
                    alt="Receipt preview" 
                    className="max-h-48 w-auto rounded-lg object-contain shadow-sm border border-zinc-200 dark:border-zinc-700"
                  />
                  
                  {/* Laser scan line animation khi đang quét */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent flex items-center justify-center animate-pulse">
                      <div className="w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
                    >
                      Đổi ảnh khác
                    </button>
                    {taxData && !isScanning && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Bóc tách hoàn tất
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-3">
                  <div className="w-12 h-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-sm flex items-center justify-center mb-2.5 text-zinc-700 dark:text-zinc-300 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Tải ảnh hóa đơn lên</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 mb-3">Hỗ trợ JPG, PNG từ máy tính hoặc điện thoại</p>
                  
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="nv-btn-secondary text-xs py-2.5 px-3.5 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Chọn từ máy
                    </button>
                    <button 
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="nv-btn-primary text-xs py-2.5 px-3.5 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Chụp bằng điện thoại
                    </button>
                  </div>
                </div>
              )}

              {/* Status bar quét */}
              {isScanning && (
                <div className="absolute inset-x-0 bottom-0 bg-zinc-900/90 text-white text-[11px] py-1.5 px-3 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{scanStatusText}</span>
                </div>
              )}
            </div>

            {/* Hidden file inputs */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input 
              type="file" 
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Dữ liệu xử lý an toàn qua Backend NoteVault.</span>
            </div>
          </div>

          {/* CỘT PHẢI: Thông tin bóc tách & Form xác nhận */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block">
                2. Dữ liệu chi tiêu
              </label>

              {/* Card thông tin pháp nhân Doanh nghiệp */}
              {taxData ? (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-bold text-xs">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
                      <span className="line-clamp-1">{taxData.companyName}</span>
                    </div>
                    {taxData.isValid && (
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-1.5 py-0.5 rounded uppercase">
                        Hợp lệ
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <span>Mã số thuế: <strong className="font-mono text-emerald-950 dark:text-emerald-200">{taxData.taxCode}</strong></span>
                    {taxData.address && (
                      <>
                        <span>•</span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 line-clamp-1">{taxData.address}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <FileCheck className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <span>Chọn ảnh bên trái để hệ thống tự động trích xuất thông tin doanh nghiệp & hóa đơn.</span>
                </div>
              )}

              {/* Ô nhập số tiền */}
              <div>
                <label className="nv-label">Số tiền chi tiêu (VND) *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setAmount(raw);
                    }}
                    placeholder="0"
                    className="nv-input text-lg font-bold pr-10 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400 select-none">
                    ₫
                  </span>
                </div>
              </div>
              
              {/* Danh mục */}
              <div>
                <label className="nv-label">Danh mục chi tiêu *</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="nv-input bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <option value="Ăn uống">Ăn uống & Tiếp khách</option>
                  <option value="Đi lại">Đi lại & Công tác</option>
                  <option value="Mua sắm">Mua sắm thiết bị văn phòng</option>
                  <option value="Phần mềm">Phần mềm & Bản quyền</option>
                </select>
              </div>

              {/* Ghi chú mục đích */}
              <div>
                <label className="nv-label">Mục đích / Ghi chú hoàn ứng *</label>
                <textarea 
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Ví dụ: Ăn trưa tiếp đối tác khách hàng..."
                  className="nv-input resize-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Nút Submit trong cột */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={handleSubmitForm}
                className="w-full nv-btn-primary py-2.5 flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Gửi yêu cầu duyệt chi ngay
              </button>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/60 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>NoteVault FinTech OCR • Zero Trust Security</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
