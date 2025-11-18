/**
 * 统一请求封装 - 基于 axios
 * 提供统一的请求拦截、错误处理、token 管理
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { getToken, clearToken } from './api-client'

// API 基础配置
const BASE_URL = '/api'
const TIMEOUT = 30000 // 30秒超时

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==================== 请求拦截器 ====================
axiosInstance.interceptors.request.use(
  (config) => {
    // 自动添加 token
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// ==================== 响应拦截器 ====================
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    
    // 统一处理 API 响应格式
    if (data && typeof data === 'object') {
      // 新格式: { success: boolean, data: any, error?: string }
      if ('success' in data) {
        if (!data.success) {
          // API 返回失败
          return Promise.reject(new Error(data.error || 'API 请求失败'))
        }
        // 返回实际数据
        return data.data !== undefined ? data.data : data
      }
      
      // 兼容旧格式: { data: any }
      if ('data' in data) {
        return data.data
      }
    }
    
    // 直接返回原始数据
    return data
  },
  (error: AxiosError<any>) => {
    // 错误处理
    console.error('响应错误:', error)
    
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 未授权，清除 token
          clearToken()
          // 可以在这里触发全局登出或跳转到登录页
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return Promise.reject(new Error(data?.error || '认证失败，请重新登录'))
          
        case 403:
          return Promise.reject(new Error(data?.error || '无权访问'))
          
        case 404:
          return Promise.reject(new Error(data?.error || '请求的资源不存在'))
          
        case 500:
          return Promise.reject(new Error(data?.error || '服务器错误'))
          
        default:
          return Promise.reject(new Error(data?.error || data?.message || `请求失败 (${status})`))
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return Promise.reject(new Error('网络错误，请检查网络连接'))
    } else {
      // 请求配置错误
      return Promise.reject(new Error(error.message || '请求配置错误'))
    }
  }
)

// ==================== 请求方法封装 ====================

export interface RequestOptions extends AxiosRequestConfig {
  /** 是否需要 token，默认 true */
  needAuth?: boolean
  /** 是否显示错误提示，默认 true */
  showError?: boolean
}

/**
 * GET 请求
 */
export async function get<T = any>(
  url: string,
  params?: Record<string, any>,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await axiosInstance.get<T>(url, {
      params,
      ...options,
    })
    return response as unknown as T
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

/**
 * POST 请求
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await axiosInstance.post<T>(url, data, options)
    return response as unknown as T
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

/**
 * PUT 请求
 */
export async function put<T = any>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await axiosInstance.put<T>(url, data, options)
    return response as unknown as T
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

/**
 * DELETE 请求
 */
export async function del<T = any>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await axiosInstance.delete<T>(url, options)
    return response as unknown as T
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

/**
 * PATCH 请求
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await axiosInstance.patch<T>(url, data, options)
    return response as unknown as T
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

/**
 * 上传文件
 */
export async function upload<T = any>(
  url: string,
  formData: FormData,
  onProgress?: (progressEvent: any) => void,
  options?: RequestOptions
): Promise<T> {
  try {
    const response = await axiosInstance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
      ...options,
    })
    return response as unknown as T
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

/**
 * 下载文件
 */
export async function download(
  url: string,
  filename: string,
  params?: Record<string, any>,
  options?: RequestOptions
): Promise<void> {
  try {
    const response = await axiosInstance.get(url, {
      params,
      responseType: 'blob',
      ...options,
    })
    
    // 创建下载链接
    const blob = new Blob([response as any])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    if (options?.showError !== false) {
      handleRequestError(error)
    }
    throw error
  }
}

// ==================== 错误处理 ====================

/**
 * 处理请求错误
 */
function handleRequestError(error: unknown): void {
  if (error instanceof Error) {
    console.error('请求错误:', error.message)
    // 可以在这里集成 toast 提示
    // toast.error(error.message)
  } else {
    console.error('未知错误:', error)
  }
}

// ==================== 导出 ====================

export default {
  get,
  post,
  put,
  delete: del,
  patch,
  upload,
  download,
  instance: axiosInstance, // 导出实例供高级用法
}

// 导出类型
export type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError }
