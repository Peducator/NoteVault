'use client';

import React from 'react';
import { 
  ShieldCheck, Building2, ChevronDown, 
  LayoutDashboard, Receipt, PieChart, Settings, User, X,
  Users, LogOut, GitFork, FileText
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout?: () => void;
  tenantName?: string;
  userName?: string;
  departmentName?: string;
  unitName?: string;
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  tenantName = 'Doanh nghiệp',
  userName = 'Người dùng',
  departmentName = 'Phòng ban',
  unitName,
  userRole = 'MEMBER',
  isOpen = false,
  onClose,
}) => {
  const displayUnit = unitName || departmentName || 'Đơn vị';

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Sổ cái & Chi tiêu' },
    { id: 'expenses', icon: Receipt, label: 'Hóa đơn & Chứng từ' },
    { id: 'units', icon: GitFork, label: 'Cây Đơn Vị & Ngân Sách' },
    { id: 'users', icon: Users, label: 'Thành viên tổ chức' },
  ];

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
                className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        
          {/* Tenant Switcher */}
          <div className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{tenantName}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">FinTech Multi-Tenant</p>
              </div>
            </div>
          </div>

          {/* Đơn vị trực thuộc */}
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-0.5">
              <span>Đơn vị trực thuộc</span>
            </div>
            <div className="w-full flex items-center justify-between px-3 py-2 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">{displayUnit}</span>
              </span>
              {userRole === 'ROOT' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  ROOT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Footer Controls */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{userName}</p>
                <p className="text-[10px] text-zinc-500 truncate">{userRole === 'ROOT' ? 'Quản trị ROOT' : 'Thành viên'}</p>
              </div>
            </div>

            <ThemeToggle />
          </div>

          <Link
            href="/docs"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Đối Soát & API Docs</span>
          </Link>

          <button
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                onTabChange('logout');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900/60 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};
