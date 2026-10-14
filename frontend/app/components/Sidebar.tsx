'use client';

import React from 'react';
import { 
  ShieldCheck, Building2, ChevronDown, 
  LayoutDashboard, Receipt, PieChart, Settings, User, X,
  Users, LogOut
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tenantName?: string;
  userName?: string;
  departmentName?: string;
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  tenantName = 'Doanh nghiệp',
  userName = 'Người dùng',
  departmentName = 'Phòng ban',
  userRole = 'USER',
  isOpen = false,
  onClose,
}) => {
  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan phòng ban' },
    { id: 'expenses', icon: Receipt, label: 'Hóa đơn & Chứng từ' },
    { id: 'reports', icon: PieChart, label: 'Báo cáo & Sao kê' },
  ];

  if (userRole === 'ADMIN') {
    navItems.push({ id: 'users', icon: Users, label: 'Quản lý Nhân sự' });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out text-zinc-900 dark:text-zinc-100
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
      `}>
        {/* Logo & Tenant Switcher */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-emerald-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">NoteVault</span>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        
        {/* Tenant Switcher */}
        <button className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{tenantName}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">B2B Enterprise</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Bộ lọc phòng ban (chuyển sang Sidebar bên trái) */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 px-0.5">
            <span>Phòng ban</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Tháng 10 / 2026</span>
          </div>
          <button className="w-full flex items-center justify-between px-3 py-2 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors">
            <span className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="truncate">{departmentName}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 ml-1" />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 mt-2">Menu chính</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === item.id 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold' 
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-zinc-900 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
            {item.label}
          </button>
        ))}

        <p className="px-3 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 mt-5">Hệ thống</p>
        <button
          onClick={() => onTabChange('logout')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-red-600" />
          Đăng xuất
        </button>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center border border-zinc-300 dark:border-zinc-600 flex-shrink-0">
            <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{userName}</p>
              {userRole === 'ADMIN' && (
                <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold px-1 py-0.2 rounded border border-purple-200 dark:border-purple-800/50">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{departmentName}</p>
          </div>
        </div>

        <ThemeToggle />
      </div>
    </aside>
  </>
  );
};
