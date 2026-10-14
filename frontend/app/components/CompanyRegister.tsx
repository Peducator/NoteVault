'use client';

import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, Lock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { authApi } from '../apis/authApi';
import { ThemeToggle } from './ThemeToggle';

interface CompanyRegisterProps {
  onBackToLanding: () => void;
  onGoToLogin: () => void;
  onSubmitSuccess?: () => void;
}

export const CompanyRegister: React.FC<CompanyRegisterProps> = ({
  onBackToLanding,
  onGoToLogin,
  onSubmitSuccess,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [teamSize, setTeamSize] = useState('10 - 50 người');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tự động tạo slug thân thiện khi nhập tên công ty
  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authApi.signup({
        companyName: companyName.trim(),
        name: adminName.trim(),
        email: adminEmail.trim(),
        password,
      });

      setSuccessMessage('Khởi tạo tài khoản doanh nghiệp thành công! Đang chuyển hướng sang đăng nhập...');

      // Lưu lại thông tin công ty và email vừa đăng ký vào localStorage để tiện tự điền ở màn Login
      if (typeof window !== 'undefined') {
        localStorage.setItem('nv_registered_email', adminEmail.trim());
        localStorage.setItem('nv_registered_company', companyName.trim());
      }

      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      }, 1500);
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        setErrorMessage('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng đảm bảo server backend đang chạy.');
      } else {
        setErrorMessage(err.message || 'Đã có lỗi xảy ra trong quá trình đăng ký');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      {/* Cột trái: Form đăng ký công ty */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-zinc-900 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-12 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto transition-colors">
        <div className="max-w-md w-full mx-auto">
          {/* Logo & Theme Switcher */}
          <div className="flex items-center justify-between mb-10">
            <button 
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 bg-zinc-900 dark:bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">NoteVault</span>
            </button>
            <ThemeToggle />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
            Đăng ký doanh nghiệp
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
            Khởi tạo không gian làm việc độc lập cho tổ chức của bạn.
          </p>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Thông báo thành công nếu có */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="nv-label">Tên công ty *</label>
              <input 
                type="text" 
                required
                value={companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                placeholder="Ví dụ: VinFast Auto" 
                className="nv-input" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="nv-label">Mã định danh (Slug) *</label>
                <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-lg focus-within:border-zinc-900 dark:focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-emerald-500 transition-all overflow-hidden bg-white dark:bg-zinc-800">
                  <span className="px-3 py-2 bg-zinc-50 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 text-sm border-r border-zinc-200 dark:border-zinc-700 select-none font-mono">@</span>
                  <input 
                    type="text" 
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="vinfast" 
                    className="w-full px-2.5 py-2 text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="nv-label">Quy mô nhân sự *</label>
                <div className="relative">
                  <select 
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="nv-input appearance-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pr-8 cursor-pointer"
                  >
                    <option>10 - 50 người</option>
                    <option>50 - 200 người</option>
                    <option>200+ người</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="nv-label">Họ tên quản trị viên *</label>
                <input 
                  type="text" 
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Nguyễn Văn A" 
                  className="nv-input" 
                />
              </div>
              <div>
                <label className="nv-label">Email quản trị *</label>
                <input 
                  type="email" 
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@congty.com" 
                  className="nv-input" 
                />
              </div>
            </div>

            <div>
              <label className="nv-label">Mật khẩu *</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự" 
                className="nv-input" 
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="nv-btn-primary w-full py-3 mt-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Đang khởi tạo doanh nghiệp...
                </>
              ) : (
                'Tạo tài khoản doanh nghiệp'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-6">
            Đã có tài khoản?{' '}
            <button 
              type="button"
              onClick={onGoToLogin} 
              className="font-semibold text-zinc-900 dark:text-white hover:underline cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>

      {/* Cột phải: Branding & Chứng chỉ bảo mật (Clean Dark) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-14 relative">
        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 mb-8">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Bảo mật cấp doanh nghiệp
          </div>

          <h2 className="text-3xl font-bold leading-tight mb-4">
            Cách ly dữ liệu tài chính hoàn toàn giữa các doanh nghiệp.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Mỗi công ty sở hữu một không gian độc lập, phân quyền chặt chẽ từ nhân viên nộp hóa đơn đến kế toán trưởng duyệt chi.
          </p>

          <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Không gian lưu trữ</span>
              <span className="font-semibold text-emerald-400">Cách ly độc lập 100%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Kiểm tra mã độc</span>
              <span className="font-semibold text-emerald-400">Tự động quét tệp an toàn</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bảo mật giao dịch</span>
              <span className="font-semibold text-slate-200">Ký số & Audit Trail</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          © 2026 NoteVault Technologies Inc. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
};
