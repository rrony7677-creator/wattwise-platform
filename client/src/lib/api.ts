import { ApiResponse } from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const TOKEN_STORAGE_KEY = 'wattwise_auth_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & {
    params?: Record<string, string | number | boolean | undefined | null>;
  } = {}
): Promise<ApiResponse<T>> {
  const { params, headers, ...restOptions } = options;
  const query = buildQueryString(params);
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}${query}`;

  const token = getStoredToken();
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: reqHeaders,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    return {
      success: true,
      data: (await response.text()) as unknown as T,
    };
  }

  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    const errorMessage =
      json.error?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return json;
}

export function getCsvDownloadUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const token = getStoredToken();
  const mergedParams = {
    ...(params || {}),
    ...(token ? { token } : {}),
  };
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}${buildQueryString(
    mergedParams
  )}`;
}
