'use client';

import React from 'react';
import { Plus, Menu, RefreshCw, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title?: string;
  isSyncing?: boolean;
  onNewExpenseClick?: () => void;
  onToggleMenu?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Chi tiêu',
  isSyncing = false,
  onNewExpenseClick,
  onToggleMenu,
  onLogout,
}) => {
  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        {/* Nút Hamburger trên Mobile */}
        {onToggleMenu && (
          <button 
            onClick={onToggleMenu}
            className="lg:hidden p-2 -ml-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nút đổi Theme Sáng / Tối */}
        <ThemeToggle />

        {/* Chỉ báo đồng bộ thời gian thực */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-[11px] text-zinc-500 dark:text-zinc-400 select-none">
          {isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 text-zinc-600 dark:text-zinc-400 animate-spin flex-shrink-0" />
              <span className="hidden sm:inline font-medium text-zinc-600 dark:text-zinc-300">Đang đồng bộ...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="hidden sm:inline font-medium text-zinc-600 dark:text-zinc-300">Đồng bộ liên tục</span>
            </>
          )}
        </div>

        {onNewExpenseClick && (
          <button 
            onClick={onNewExpenseClick}
            className="nv-btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm flex items-center gap-1.5 font-semibold whitespace-nowrap cursor-pointer shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nộp hóa đơn</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="p-2 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
