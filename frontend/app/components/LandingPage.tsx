'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, PieChart, Zap, UserPlus } from 'lucide-react';
import { JoinTeamModal } from './JoinTeamModal';
import { ThemeToggle } from './ThemeToggle';

interface LandingPageProps {
  loginHref?: string;
  registerHref?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  loginHref = '/login',
  registerHref = '/register-company',
}) => {
  const router = useRouter();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800 flex flex-col transition-colors">
      {/* 1. HEADER CỐ ĐỊNH */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">NoteVault</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Gia nhập đội ngũ</span>
              <span className="sm:hidden">Gia nhập</span>
            </button>
            <Link 
              href={loginHref}
              className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 py-1.5 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link 
              href={registerHref}
              className="nv-btn-primary text-xs sm:text-sm py-1.5 px-3"
            >
              Đăng ký
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-6 transition-colors">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Bảo mật dữ liệu chuẩn doanh nghiệp đa người dùng
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight mb-4">
          Quản lý chi tiêu & quét hóa đơn tự động cho doanh nghiệp
        </h1>

        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-xl leading-relaxed">
          Tách bạch hạn mức phòng ban, tự động kiểm tra an toàn hóa đơn và phê duyệt hoàn ứng chỉ với một thao tác.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link 
            href={registerHref}
            className="w-full sm:w-auto nv-btn-primary py-3 px-6 text-base"
          >
            Đăng ký công ty tham gia <ArrowRight className="w-4 h-4" />
          </Link>
          <button 
            type="button"
            onClick={() => setIsJoinModalOpen(true)}
            className="w-full sm:w-auto nv-btn-secondary py-3 px-6 text-base cursor-pointer font-medium flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Gia nhập đội ngũ
          </button>
          <Link 
            href={loginHref}
            className="w-full sm:w-auto text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white py-3 px-4 transition-colors"
          >
            Đăng nhập nhân viên
          </Link>
        </div>
      </main>

      {/* Modal Gia nhập đội ngũ */}
      <JoinTeamModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)}
        onSuccessRedirect={() => {
          setIsJoinModalOpen(false);
          router.push(loginHref);
        }}
      />

      {/* 3. VALUE PROPOSITIONS */}
      <section className="bg-white dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 py-16 transition-colors">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="w-10 h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-4 text-zinc-900 dark:text-zinc-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Kiểm tra an toàn hóa đơn</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Mọi chứng từ tải lên được cách ly và quét tự động trước khi kế toán xem, phòng ngừa tuyệt đối các tệp độc hại.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="w-10 h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-4 text-zinc-900 dark:text-zinc-100">
              <PieChart className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Hạn mức theo phòng ban</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Bảo mật ngân sách tổng. Nhân viên chỉ thấy định mức của phòng mình, tránh rò rỉ dữ liệu tài chính toàn công ty.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="w-10 h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center mb-4 text-zinc-900 dark:text-zinc-100">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Phê duyệt hoàn ứng tức thì</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Kế toán đối soát nhanh, cập nhật trạng thái chi trả minh bạch cho nhân viên ngay trên hệ thống.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
