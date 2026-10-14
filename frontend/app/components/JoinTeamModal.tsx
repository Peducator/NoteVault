'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronDown,
  ArrowRight,
  Search,
  Check,
  Sparkles
} from 'lucide-react';
import { authApi } from '../apis/authApi';

interface Company {
  id: number;
  companyName: string;
  code: string;
}

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRedirect?: () => void;
}

export const JoinTeamModal: React.FC<JoinTeamModalProps> = ({
  isOpen,
  onClose,
  onSuccessRedirect,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Marketing');
  
  // Company Search & Selection (load trực tiếp từ database)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFetchingCompanies, setIsFetchingCompanies] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    requestId: string;
    employeeCode: string;
    trackingToken?: string;
  } | null>(null);

  // Fetch danh sách công ty từ database khi mở Modal
  useEffect(() => {
    if (!isOpen) return;

    const fetchCompanies = async () => {
      setIsFetchingCompanies(true);
      try {
        const res = await authApi.getCompanies();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Company[] = res.data.map((c) => ({
            id: c.id,
            companyName: c.companyName,
            code: (c as any).slug || (c as any).code || `NV-${c.id}`,
          }));
          setCompanies(mapped);
          setSelectedCompany(mapped[0]);
        }
      } catch (err) {
        // Giữ danh sách mặc định nếu server chưa phản hồi
      } finally {
        setIsFetchingCompanies(false);
      }
    };

    fetchCompanies();
  }, [isOpen]);

  // Lọc công ty theo từ khóa tìm kiếm
  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const q = companySearch.toLowerCase().trim();
    return companies.filter(
      (c) => c.companyName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [companies, companySearch]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!selectedCompany) {
      setErrorMessage('Vui lòng chọn doanh nghiệp bạn muốn tham gia');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authApi.joinTeam({
        name: name.trim(),
        email: email.trim(),
        password,
        department,
        tenantId: selectedCompany.id,
      });

      setSuccessInfo({
        requestId: result.data?.requestId || 'N/A',
        employeeCode: result.data?.employeeCode || 'NV-AUTO',
        trackingToken: result.data?.trackingToken,
      });
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        setErrorMessage('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng thử lại sau giây lát.');
      } else {
        setErrorMessage(err.message || 'Đã có lỗi xảy ra khi gửi yêu cầu gia nhập');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('Marketing');
    setCompanySearch('');
    setIsDropdownOpen(false);
    setErrorMessage(null);
    setSuccessInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-emerald-600 flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Gia nhập đội ngũ</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gửi hồ sơ đăng ký tham gia không gian làm việc doanh nghiệp</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="flex-1 overflow-y-auto p-6">
          {successInfo ? (
            /* Màn hình thông báo gửi thành công */
            <div className="text-center py-3 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 animate-in zoom-in-95">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Gửi yêu cầu gia nhập thành công!</h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                  Hồ sơ đã được lưu tạm và chuyển tới Quản trị viên của <strong>{selectedCompany?.companyName || 'Doanh nghiệp'}</strong> để phê duyệt.
                </p>
              </div>

              {/* Thẻ tóm tắt thông tin đã gửi & Mã NV tự cấp */}
              <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-500 dark:text-zinc-400">Mã đơn chờ:</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-white bg-zinc-200/60 dark:bg-zinc-700 px-2 py-0.5 rounded">
                    {successInfo.requestId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 dark:text-zinc-400">Họ và tên:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 dark:text-zinc-400">Doanh nghiệp:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{selectedCompany?.companyName || 'Doanh nghiệp'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 dark:text-zinc-400">Phòng ban mong muốn:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{department}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700 bg-emerald-50/50 dark:bg-emerald-950/40 -mx-4 -mb-2 p-3 rounded-b-xl">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Mã nhân viên tự cấp:
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded shadow-2xs">
                    {successInfo.employeeCode}
                  </span>
                </div>
              </div>

              {/* Ghi chú Redis TTL 3 ngày */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Hồ sơ được lưu tạm trong <strong>3 ngày</strong>. Khi Quản trị viên duyệt, tài khoản sẽ được kích hoạt chính thức vào PostgreSQL và bạn có thể đăng nhập ngay.
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:flex-1 nv-btn-secondary py-2.5 text-sm"
                >
                  Đóng
                </button>
                {onSuccessRedirect && (
                  <button
                    type="button"
                    onClick={() => {
                      handleResetAndClose();
                      onSuccessRedirect();
                    }}
                    className="w-full sm:flex-1 nv-btn-primary py-2.5 text-sm"
                  >
                    Đi đến Đăng nhập <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Form nhập thông tin gia nhập */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Thông báo chính sách NoteVault */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Mã nhân viên: <strong>Tự cấp qua NoteVault</strong>
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Hạn duyệt 3 ngày
                </span>
              </div>

              {/* ========================================================
                  1. THANH TÌM KIẾM & CHỌN CÔNG TY TRONG DATABASE
                 ======================================================== */}
              <div>
                <label className="nv-label flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    Doanh nghiệp tham gia *
                  </span>
                  <span className="text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                    {companies.length} công ty khả dụng
                  </span>
                </label>

                {/* Combobox Search & Select */}
                <div className="relative">
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-zinc-700 dark:text-zinc-200 flex-shrink-0">
                        <Building2 className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      </div>
                      <div className="text-left truncate">
                        {selectedCompany ? (
                          <>
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                              {selectedCompany.companyName}
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              Mã: {selectedCompany.code}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {isFetchingCompanies ? 'Đang tải danh sách doanh nghiệp...' : 'Chọn doanh nghiệp tham gia...'}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown Menu với Thanh Search */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 p-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          placeholder="Gõ tên hoặc mã công ty..."
                          autoFocus
                          className="w-full text-xs pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-500"
                        />
                      </div>

                      {/* Danh sách công ty */}
                      <div className="max-h-44 overflow-y-auto space-y-1">
                        {filteredCompanies.length === 0 ? (
                          <div className="py-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
                            Không tìm thấy công ty phù hợp
                          </div>
                        ) : (
                          filteredCompanies.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCompany(c);
                                setIsDropdownOpen(false);
                                setCompanySearch('');
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                                selectedCompany?.id === c.id
                                  ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-white'
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-white">{c.companyName}</p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">slug: {c.code}</p>
                              </div>
                              {selectedCompany?.id === c.id && (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Họ và tên */}
              <div>
                <label className="nv-label">Họ và tên của bạn *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Hoàng"
                  className="nv-input"
                />
              </div>

              {/* Email & Phòng ban */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email công việc */}
                <div>
                  <label className="nv-label">Email công việc *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hoang.nguyen@vinfast.vn"
                    className="nv-input"
                  />
                </div>

                {/* Phòng ban */}
                <div>
                  <label className="nv-label">Phòng ban mong muốn *</label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="nv-input appearance-none pr-8 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                    >
                      <option value="Marketing">Marketing</option>
                      <option value="Kỹ thuật">Kỹ thuật</option>
                      <option value="Kinh doanh">Kinh doanh</option>
                      <option value="Nhân sự">Nhân sự</option>
                      <option value="Tài chính">Tài chính</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="nv-label">Mật khẩu đăng nhập *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="nv-input"
                />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Mật khẩu này sẽ dùng để đăng nhập sau khi Quản trị viên duyệt hồ sơ.
                </p>
              </div>

              {/* Footer hành động */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="nv-btn-secondary px-4 py-2.5 text-sm"
                  disabled={isLoading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="nv-btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5"
                >
                  {isLoading ? 'Đang gửi hồ sơ...' : 'Gửi yêu cầu gia nhập'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
