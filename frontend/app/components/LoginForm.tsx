'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../apis/authApi';
import { ThemeToggle } from './ThemeToggle';

interface LoginFormProps {
  onBackToLanding: () => void;
  onGoToRegister: () => void;
  onSubmitSuccess?: (user?: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onBackToLanding,
  onGoToRegister,
  onSubmitSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Điền email nếu vừa đăng ký
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('nv_registered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setPassword('');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await authApi.login({
        email: email.trim(),
        password,
      });

      // Lưu tokens vào localStorage
      if (typeof window !== 'undefined' && result.data) {
        localStorage.setItem('nv_access_token', result.data.accessToken || '');
        localStorage.setItem('nv_refresh_token', result.data.refreshToken || '');
        if (result.data.user) {
          localStorage.setItem('nv_user', JSON.stringify(result.data.user));
        }
      }

      if (onSubmitSuccess) onSubmitSuccess(result.data?.user);
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        setErrorMessage('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng đảm bảo server backend đang chạy.');
      } else {
        setErrorMessage(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-zinc-950 font-sans selection:bg-slate-200 dark:selection:bg-zinc-800 transition-colors">
      {/* Cột trái: Form đăng nhập (Center card sang trọng) */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-zinc-900 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-12 border-r border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-md w-full mx-auto">
          {/* Logo & Theme Switcher */}
          <div className="flex items-center justify-between mb-10">
            <button 
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 bg-slate-900 dark:bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">NoteVault</span>
            </button>
            <ThemeToggle />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
            Đăng nhập hệ thống
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
            Truy cập không gian làm việc để quản lý chi tiêu và duyệt chứng từ.
          </p>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="nv-label">Email công việc *</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@congty-a.vn hoặc email của bạn" 
                className="nv-input" 
              />
            </div>

            {/* Mật khẩu */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="nv-label mb-0">Mật khẩu *</label>
                <a href="#" className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors">
                  Quên mật khẩu?
                </a>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="nv-input" 
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="nv-btn-primary w-full py-3 mt-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Đang xác thực tài khoản...
                </>
              ) : (
                'Đăng nhập vào không gian làm việc'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-zinc-400 mt-6">
            Doanh nghiệp chưa tham gia?{' '}
            <button 
              type="button"
              onClick={onGoToRegister} 
              className="font-semibold text-slate-900 dark:text-zinc-100 hover:underline cursor-pointer"
            >
              Đăng ký doanh nghiệp
            </button>
          </p>
        </div>
      </div>

      {/* Cột phải: Branding Enterprise Clean */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-14 relative">
        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 mb-8">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Kiến trúc Zero Trust B2B FinTech
          </div>

          <h2 className="text-3xl font-bold leading-tight mb-4">
            Quản trị minh bạch mọi dòng tiền doanh nghiệp.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            NoteVault số hóa toàn diện quy trình hoàn ứng: bóc tách hóa đơn tự động bằng AI, phát hiện gian lận và đồng bộ tức thì vào sổ kế toán.
          </p>

          <div className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Thời gian duyệt đơn</span>
              <span className="font-semibold text-emerald-400">Giảm 75% so với thủ công</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tỷ lệ sai sót số liệu</span>
              <span className="font-semibold text-emerald-400">Dưới 0.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tuân thủ thuế GTGT</span>
              <span className="font-semibold text-slate-200">100% hóa đơn hợp lệ</span>
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
