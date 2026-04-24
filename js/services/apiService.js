/**
 * API服务
 */

class ApiService {
    constructor() {
        this.baseURL = CONFIG.server?.api?.baseURL || '/api';
        this.timeout = CONFIG.server?.api?.timeout || 10000;
    }
    
    /**
     * GET请求
     */
    async get(url, params = {}) {
        return this._request('GET', url, params);
    }
    
    /**
     * POST请求
     */
    async post(url, data = {}) {
        return this._request('POST', url, data);
    }
    
    /**
     * PUT请求
     */
    async put(url, data = {}) {
        return this._request('PUT', url, data);
    }
    
    /**
     * DELETE请求
     */
    async delete(url, params = {}) {
        return this._request('DELETE', url, params);
    }
    
    /**
     * 统一请求方法
     */
    async _request(method, url, data = {}) {
        const fullUrl = url.startsWith('http') ? url : this.baseURL + url;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (method === 'GET' || method === 'DELETE') {
            const params = new URLSearchParams(data).toString();
            if (params) {
                options.url = fullUrl + '?' + params;
            }
        } else {
            options.body = JSON.stringify(data);
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(fullUrl, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API请求失败:', error);
            
            // 返回模拟数据（开发环境）
            if (CONFIG.app.debug) {
                return this._getMockResponse(url, method);
            }
            
            throw error;
        }
    }
    
    /**
     * 获取模拟响应
     */
    _getMockResponse(url, method) {
        console.warn('使用模拟数据:', url);
        
        if (url.includes('/vehicles')) {
            return {
                code: 0,
                data: [
                    { id: 'v1', name: '货车A', plate: '京A12345', lat: 39.90923, lng: 116.397428, status: 'online', speed: 45 },
                    { id: 'v2', name: '货车B', plate: '京B67890', lat: 39.91623, lng: 116.407428, status: 'online', speed: 30 },
                    { id: 'v3', name: '货车C', plate: '京C11223', lat: 39.89923, lng: 116.387428, status: 'online', speed: 55 }
                ]
            };
        }
        
        if (url.includes('/fence')) {
            return {
                code: 0,
                data: null
            };
        }
        
        return { code: 0, data: [] };
    }
}

// 创建单例
const ApiService = new ApiService();