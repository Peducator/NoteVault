'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ArrowRight, GitFork, CheckCircle2, XCircle, 
  Clock, Sparkles, Building2, ChevronRight, FileText, 
  Lock, HelpCircle, ChevronDown, Check, Coins
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface LandingPageProps {
  loginHref?: string;
  registerHref?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  loginHref = '/login',
  registerHref = '/register-company',
}) => {
  const [selectedDemoUnit, setSelectedDemoUnit] = useState<'root' | 'kd' | 'sales'>('sales');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Dữ liệu mô phỏng cho Demo Cây Đơn Vị (Interactive Budget Tree)
  const demoData = {
    root: {
      name: 'ABC (Gốc)',
      roleBadge: 'Giám đốc Hoàng (ROOT)',
      level: 'Cấp 1 - Đơn vị Gốc',
      totalIn: '1.000.000.000 ₫',
      totalOut: '700.000.000 ₫',
      totalSpent: '0 ₫',
      safeBalance: '300.000.000 ₫',
      description: 'Nạp vốn ban đầu 1 tỷ đồng. Đã cấp 400tr cho Khối KD và 300tr cho Khối CN.',
      recentActivity: 'Cấp ngân sách 400.000.000 ₫ cho Khối Kinh doanh',
      status: 'An toàn 100%',
    },
    kd: {
      name: 'Khối Kinh doanh',
      roleBadge: 'Trưởng khối Khoa (ROOT cấp 1)',
      level: 'Cấp 2 - Đơn vị Cha',
      totalIn: '400.000.000 ₫',
      totalOut: '255.000.000 ₫',
      totalSpent: '0 ₫',
      safeBalance: '145.000.000 ₫',
      description: 'Nhận 400tr từ Gốc. Đã cấp 150tr cho Sales, 100tr cho Marketing, 5tr cho Sự kiện.',
      recentActivity: 'Cấp ngân sách 150.000.000 ₫ cho Nhóm Sales',
      status: 'An toàn 100%',
    },
    sales: {
      name: 'Nhóm Sales (Lá)',
      roleBadge: 'An (Admin nhóm Sales)',
      level: 'Cấp 3 - Đơn vị Lá (Phát sinh chi tiêu)',
      totalIn: '150.000.000 ₫',
      totalOut: '0 ₫',
      totalSpent: '26.000.000 ₫',
      safeBalance: '124.000.000 ₫',
      description: 'Nhận 150tr từ Khối KD. Đã duyệt chi 26tr. Còn 2 khoản chờ duyệt (8tr).',
      recentActivity: 'Dũng (Sales) chi 12.000.000 ₫ - Đã duyệt bởi An',
      status: 'Khả dụng chi: 124tr',
    },
  };

  const currentDemo = demoData[selectedDemoUnit];

  const faqs = [
    {
      q: 'Quy tắc cấp tiền giữa các đơn vị hoạt động như thế nào?',
      a: 'Tiền chảy theo cây phân cấp từ cha xuống con trực tiếp, tuyệt đối không được nhảy cóc (ví dụ: Tổng công ty không cấp thẳng xuống nhóm dự án mà phải qua Khối phòng ban). Đơn vị cha chỉ được cấp trong phạm vi số dư an toàn hiện có.'
    },
    {
      q: 'Ai là người có quyền duyệt chi tiêu của nhân viên?',
      a: 'Hệ thống tuân thủ nghiêm ngặt nguyên tắc Quản lý trực tiếp: Nhân viên nộp chi tiêu thì Admin nhóm duyệt. Nếu Admin nhóm tự chi tiêu thì Trưởng khối cấp trên sẽ duyệt. Mọi khoản chi từ chối đều lưu lại lý do và không thể xóa giao dịch để bảo toàn kiểm toán.'
    },
    {
      q: 'Tại sao NoteVault lưu trữ tiền tệ bằng BigInt VND?',
      a: 'Khác với các ứng dụng dùng số thực Float dễ bị sai số dấu phẩy động (Floating point precision bug), NoteVault lưu trữ toàn bộ giá trị giao dịch bằng số nguyên BigInt chuẩn VND, đảm bảo đối soát kế toán chính xác đến từng đồng.'
    },
    {
      q: 'Dữ liệu các công ty có bị lẫn lộn không?',
      a: 'NoteVault xây dựng trên kiến trúc Multi-Tenant phân lập dữ liệu cấp cơ sở dữ liệu. Mỗi công ty sở hữu một mã định danh độc lập, danh mục chi tiêu riêng và cây đơn vị riêng biệt, ngăn chặn hoàn toàn rủi ro rò rỉ dữ liệu chéo.'
    }
  ];

  return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800 flex flex-col transition-colors overflow-x-hidden w-full">
      {/* 1. HEADER CỐ ĐỊNH CHUẨN RESPONSIVE */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400 dark:text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">NoteVault</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#tree-preview" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Cây ngân sách</a>
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Tính năng cốt lõi</a>
            <a href="#comparison" className="hover:text-zinc-900 dark:hover:text-white transition-colors">So sánh</a>
            <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Câu hỏi thường gặp</a>
            <Link href="/docs" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
              API Docs
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link 
              href={loginHref}
              className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 py-1.5 transition-colors whitespace-nowrap"
            >
              Đăng nhập
            </Link>
            <Link 
              href={registerHref}
              className="nv-btn-primary text-xs sm:text-sm py-1.5 px-3 whitespace-nowrap inline-flex"
            >
              Đăng ký
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-10 pb-10 sm:pt-20 sm:pb-16 px-3 sm:px-6 w-full max-w-6xl mx-auto flex flex-col items-center text-center overflow-hidden">
        <div className="inline-flex items-center text-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] sm:text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-4 sm:mb-6 transition-colors shadow-2xs max-w-full">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="truncate">Kiến trúc Cây Đơn Vị • Chuẩn B2B FinTech</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.2] mb-3 sm:mb-5 max-w-4xl break-words">
          Kiểm soát dòng tiền & Phân bổ ngân sách đa tầng cho doanh nghiệp
        </h1>

        <p className="text-xs sm:text-lg text-zinc-600 dark:text-zinc-400 mb-6 sm:mb-8 max-w-2xl leading-relaxed break-words">
          Xóa bỏ bảng tính Excel hỗn loạn. Phân cấp ngân sách từ công ty xuống từng nhóm dự án, duyệt chi trực tiếp theo cấp quản lý và bóc tách hóa đơn tự động bằng AI.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto mb-10 sm:mb-16">
          <Link 
            href={registerHref}
            className="w-full sm:w-auto nv-btn-primary py-2.5 px-5 sm:py-3.5 sm:px-7 text-xs sm:text-base shadow-md font-semibold text-center"
          >
            Đăng ký công ty tham gia <ArrowRight className="w-4 h-4 ml-1 inline" />
          </Link>
          <Link 
            href={loginHref}
            className="w-full sm:w-auto nv-btn-secondary py-2.5 px-4 sm:py-3.5 sm:px-6 text-xs sm:text-base font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-center"
          >
            Đăng nhập hệ thống
          </Link>
        </div>

        {/* 3. HERO VISUAL: LIVE INTERACTIVE BUDGET TREE SHOWCASE */}
        <div id="tree-preview" className="w-full max-w-full lg:max-w-5xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden transition-all text-left">
          {/* Top Bar Window Chrome */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="ml-1 text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">unit-tree://live</span>
            </div>
            <div className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 shrink-0">
              <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Realtime (VND)</span>
            </div>
          </div>

          <div className="p-3 sm:p-8 grid lg:grid-cols-12 gap-5 sm:gap-6 items-center w-full min-w-0">
            {/* Cột trái: Sơ đồ cây phân cấp */}
            <div className="lg:col-span-5 flex flex-col gap-2.5 sm:gap-3 w-full min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                Chọn đơn vị trên cây để soi số dư:
              </div>

              {/* Node 1: ABC Gốc */}
              <button
                onClick={() => setSelectedDemoUnit('root')}
                className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedDemoUnit === 'root'
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0">
                    Gốc
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">ABC (Gốc)</h4>
                    <p className="text-[11px] sm:text-xs text-zinc-500">Giám đốc Hoàng (ROOT)</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">300tr ₫</span>
                  <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400">Số dư an toàn</p>
                </div>
              </button>

              {/* Dấu nối phân cấp */}
              <div className="pl-3 sm:pl-6 flex items-center text-zinc-300 dark:text-zinc-700">
                <span className="border-l-2 border-b-2 border-zinc-300 dark:border-zinc-700 w-3.5 sm:w-4 h-4 sm:h-5 rounded-bl-sm inline-block mr-1.5 sm:mr-2"></span>
                <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400">cấp ngân sách 400tr</span>
              </div>

              {/* Node 2: Khối KD */}
              <button
                onClick={() => setSelectedDemoUnit('kd')}
                className={`ml-2 sm:ml-5 p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedDemoUnit === 'kd'
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    KD
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Khối Kinh doanh</h4>
                    <p className="text-[11px] sm:text-xs text-zinc-500">Trưởng khối Khoa</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">145tr ₫</span>
                  <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400">Số dư an toàn</p>
                </div>
              </button>

              {/* Dấu nối phân cấp */}
              <div className="pl-5 sm:pl-12 flex items-center text-zinc-300 dark:text-zinc-700">
                <span className="border-l-2 border-b-2 border-zinc-300 dark:border-zinc-700 w-3.5 sm:w-4 h-4 sm:h-5 rounded-bl-sm inline-block mr-1.5 sm:mr-2"></span>
                <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400">cấp ngân sách 150tr</span>
              </div>

              {/* Node 3: Nhóm Sales (Lá) */}
              <button
                onClick={() => setSelectedDemoUnit('sales')}
                className={`ml-4 sm:ml-10 p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedDemoUnit === 'sales'
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    Lá
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Nhóm Sales</h4>
                    <p className="text-[11px] sm:text-xs text-zinc-500">An (Admin Sales)</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">124tr ₫</span>
                  <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400">Đã duyệt chi: 26tr</p>
                </div>
              </button>
            </div>

            {/* Cột phải: Bảng chi tiết dòng tiền tức thời của Node được chọn */}
            <div className="lg:col-span-7 bg-zinc-50 dark:bg-zinc-950 p-3.5 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <div>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{currentDemo.level}</span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    {currentDemo.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{currentDemo.roleBadge}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
                  {currentDemo.status}
                </span>
              </div>

              {/* 3 Thẻ Metric mini */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                <div className="p-2 sm:p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-center min-w-0">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">Nhận vào</p>
                  <p className="text-[11px] sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 sm:mt-1 truncate">{currentDemo.totalIn}</p>
                </div>
                <div className="p-2 sm:p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-center min-w-0">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">Đã cấp con</p>
                  <p className="text-[11px] sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 sm:mt-1 truncate">{currentDemo.totalOut}</p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center min-w-0">
                  <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">Số dư an toàn</p>
                  <p className="text-[11px] sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">{currentDemo.safeBalance}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                {currentDemo.description}
              </p>

              {/* Hoạt động gần nhất */}
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-300 truncate">{currentDemo.recentActivity}</span>
                </div>
                <span className="text-[10px] text-zinc-400 flex-shrink-0 ml-2">Vừa xong</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. METRICS / PROOF BAR */}
      <section className="border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 py-10 transition-colors">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">100%</div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Chặn vượt số dư an toàn</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">0%</div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Sai lệch số học (BigInt VND)</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">5x</div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Tốc độ duyệt hoàn ứng</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Multi-Tenant</div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Phân lập dữ liệu tuyệt đối</p>
          </div>
        </div>
      </section>

      {/* 5. BA TRỤ CỘT TÍNH NĂNG (THE 3 CORE PILLARS) */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
            Giải pháp chuyên sâu cho tài chính doanh nghiệp
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Ba trụ cột vận hành minh bạch từng đồng vốn
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                <GitFork className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2.5">
                Cây Đơn Vị & Ngân Sách Phân Cấp
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Xây dựng cây tổ chức từ Gốc $\rightarrow$ Khối $\rightarrow$ Nhóm lá. Dòng tiền cấp phát tuần tự từ trên xuống, chặn đứng việc nhảy cóc cấp quản lý và tự động bảo toàn số dư an toàn khả dụng.
              </p>
            </div>
            <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Mỗi đơn vị chỉ đúng 1 người quản lý</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Sổ cái cấp tiền bất biến (Append-only)</li>
            </ul>
          </div>

          {/* Pillar 2 */}
          <div className="p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2.5">
                Phê Duyệt Quản Lý Trực Tiếp
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Chi tiêu chỉ phát sinh ở đơn vị lá. Nhân viên nộp đơn do Admin nhóm duyệt; Admin nhóm chi do Trưởng khối duyệt. Không cho phép xóa giao dịch nhằm đảm bảo dữ liệu kiểm toán trọn vẹn.
              </p>
            </div>
            <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-500" /> Bắt buộc ghi nhận lý do khi từ chối</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-500" /> Khoản từ chối không làm thâm hụt số dư</li>
            </ul>
          </div>

          {/* Pillar 3 */}
          <div className="p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2.5">
                Quét OCR Gemini & Cấp Tiền VietQR
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Tự động bóc tách hóa đơn VAT bằng trí tuệ nhân tạo Gemini, nhận diện mã số thuế và tổng tiền trong 2 giây. Hỗ trợ tạo mã VietQR chuẩn NAPAS 247 để chuyển tiền hoàn ứng tức thì.
              </p>
            </div>
            <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Cách ly và quét mã độc trước khi xem</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Tích hợp thông tin tài khoản ngân hàng</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. BẢNG SO SÁNH (BEFORE VS AFTER) */}
      <section id="comparison" className="py-16 bg-zinc-100/70 dark:bg-zinc-900/40 border-y border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Quản lý chi tiêu qua Excel / Zalo so với NoteVault
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Sự khác biệt rõ rệt giữa phương thức quản lý truyền thống và công nghệ phân cấp ngân sách
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
            <div className="hidden sm:grid sm:grid-cols-2 bg-zinc-50 dark:bg-zinc-800/80 p-4 font-semibold text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
              <div>Phương thức truyền thống (Excel/Chat)</div>
              <div className="text-emerald-600 dark:text-emerald-400">Nền tảng NoteVault Unit Tree</div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs sm:text-sm">
              <div className="p-4 sm:grid sm:grid-cols-2 gap-4 items-center space-y-2.5 sm:space-y-0">
                <div className="text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-red-500 block mb-0.5">Truyền thống</span>
                    <span>Dễ chi vượt hạn mức, cuối tháng mới biết âm tiền</span>
                  </div>
                </div>
                <div className="text-zinc-900 dark:text-zinc-100 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">NoteVault</span>
                    <span>Tự động khóa duyệt chi nếu số dư an toàn không đủ</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:grid sm:grid-cols-2 gap-4 items-center space-y-2.5 sm:space-y-0">
                <div className="text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-red-500 block mb-0.5">Truyền thống</span>
                    <span>Cấp tiền hỗn loạn, gửi tiền trực tiếp không theo cấp</span>
                  </div>
                </div>
                <div className="text-zinc-900 dark:text-zinc-100 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">NoteVault</span>
                    <span>Dòng tiền chảy đúng cây phân cấp, chặn nhảy cóc</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:grid sm:grid-cols-2 gap-4 items-center space-y-2.5 sm:space-y-0">
                <div className="text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-red-500 block mb-0.5">Truyền thống</span>
                    <span>Hóa đơn giấy thất lạc, gõ số liệu thủ công sai sót</span>
                  </div>
                </div>
                <div className="text-zinc-900 dark:text-zinc-100 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">NoteVault</span>
                    <span>AI Gemini tự bóc tách mã số thuế, tổng tiền trong 2s</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:grid sm:grid-cols-2 gap-4 items-center space-y-2.5 sm:space-y-0">
                <div className="text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-red-500 block mb-0.5">Truyền thống</span>
                    <span>Số liệu có thể bị sửa, xóa lén lút mất dấu vết</span>
                  </div>
                </div>
                <div className="text-zinc-900 dark:text-zinc-100 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="sm:hidden font-semibold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">NoteVault</span>
                    <span>Dữ liệu bất biến chuẩn kiểm toán, cấm xóa giao dịch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-20 max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Câu hỏi thường gặp
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Mọi thông tin cần biết để bắt đầu áp dụng NoteVault cho doanh nghiệp của bạn
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-5 py-4 text-left font-semibold text-sm sm:text-base flex items-center justify-between text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. BOTTOM CTA BANNER */}
      <section className="pb-20 max-w-5xl mx-auto px-6 w-full">
        <div className="rounded-3xl bg-zinc-900 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Sẵn sàng chuẩn hóa dòng tiền cho doanh nghiệp của bạn?
            </h3>
            <p className="text-sm sm:text-base text-zinc-300 dark:text-zinc-400 mb-8 leading-relaxed">
              Khởi tạo tổ chức ngay hôm nay. Chỉ mất chưa đầy 1 phút để thiết lập cây đơn vị và bắt đầu cấp ngân sách thông minh.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link 
                href={registerHref}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 px-7 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                Tạo tài khoản doanh nghiệp <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href={loginHref}
                className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3.5 px-6 rounded-xl transition-colors border border-zinc-700"
              >
                Đăng nhập hệ thống
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-10 transition-colors text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">NoteVault Enterprise</span>
            <span>• Quản lý chi tiêu & Cấp ngân sách đa tầng</span>
          </div>
          <p>© 2026 NoteVault Technologies Inc. Bảo mật thông tin đa tầng chuẩn ngân hàng.</p>
        </div>
      </footer>

    </div>
  );
};
