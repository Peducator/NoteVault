/**
 * HTTP Client cho NoteVault Frontend
 * - Tự động gắn Bearer Token
 * - Tự động gọi refreshToken khi accessToken hết hạn (HTTP 401)
 * - Tự động retry request ban đầu với accessToken mới
 */

export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};



export interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

const getStorage = (key: string): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setStorage = (key: string, val: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, val);
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, val);
  }
};

const removeStorage = (key: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  } else if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
};

/**
 * Xử lý refresh access token đơn giản và trực tiếp
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStorage('nv_refresh_token');
  if (!refreshToken) return null;

  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await res.json();
    if (!res.ok || !json.success || !json.data?.accessToken) {
      throw new Error(json.message || 'Refresh token failed');
    }

    const newAccessToken = json.data.accessToken;
    setStorage('nv_access_token', newAccessToken);
    return newAccessToken;
  } catch (error) {
    // Refresh token hết hạn hoặc không hợp lệ -> xóa sạch token
    removeStorage('nv_access_token');
    removeStorage('nv_refresh_token');
    removeStorage('nv_user');
    removeStorage('nv_cached_expenses');
    return null;
  }
}

/**
 * Core apiFetch: Bọc fetch tiêu chuẩn, hỗ trợ tự động refresh token
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {},
  isRetry = false
): Promise<T> {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;

  // Chuẩn bị headers
  const headers = new Headers(options.headers || {});

  // Tự động gắn Authorization token nếu có và không bị bỏ qua
  if (!options.skipAuth) {
    const token = getStorage('nv_access_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Tự động set Content-Type nếu có body và không phải là FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Xử lý khi gặp mã 401 (Access Token hết hạn hoặc không hợp lệ)
  const isAuthEndpoint = endpoint.includes('/api/auth/login') || 
                         endpoint.includes('/api/auth/refresh') || 
                         endpoint.includes('/api/auth/signup');

  if (response.status === 401 && !isRetry && !isAuthEndpoint) {
    // Thử làm mới Access Token bằng Refresh Token
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Retry lại request ban đầu với token mới
      const newHeaders = new Headers(options.headers || {});
      newHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      if (options.body && !(options.body instanceof FormData) && !newHeaders.has('Content-Type')) {
        newHeaders.set('Content-Type', 'application/json');
      }

      return apiFetch<T>(endpoint, {
        ...options,
        headers: newHeaders,
      }, true);
    }
  }

  // Phân tích kết quả trả về
  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Yêu cầu thất bại với mã lỗi ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}
