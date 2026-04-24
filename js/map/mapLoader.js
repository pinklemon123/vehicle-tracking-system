/**
 * 地图加载器 - 优化地图加载性能
 * @description 处理地图SDK的异步加载、缓存和性能优化
 */

class MapLoader {
    constructor() {
        this.loaded = false;
        this.loading = false;
        this.loadPromise = null;
        this.loadCallbacks = [];
        this.progressCallbacks = [];
        this.loadProgress = 0;
        
        // 缓存配置
        this.cacheKey = 'amap_sdk_cached';
        this.cacheVersion = CONFIG.amap.version;
    }
    
    /**
     * 加载高德地图SDK
     */
    load() {
        // 如果已经加载完成
        if (this.loaded && window.AMap) {
            return Promise.resolve(window.AMap);
        }
        
        // 如果正在加载，返回Promise
        if (this.loading && this.loadPromise) {
            return this.loadPromise;
        }
        
        this.loading = true;
        
        this.loadPromise = new Promise((resolve, reject) => {
            // 检查是否可以从缓存加载
            if (this.canUseCache()) {
                this.loadFromCache().then(resolve).catch(() => {
                    this.loadFromNetwork(resolve, reject);
                });
            } else {
                this.loadFromNetwork(resolve, reject);
            }
        });
        
        return this.loadPromise;
    }
    
    /**
     * 检查是否可以使用缓存
     */
    canUseCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return false;
            
            const { version, timestamp, script } = JSON.parse(cached);
            const now = Date.now();
            const cacheAge = now - timestamp;
            
            // 缓存有效期24小时
            return version === this.cacheVersion && cacheAge < 24 * 60 * 60 * 1000;
        } catch {
            return false;
        }
    }
    
    /**
     * 从缓存加载
     */
    loadFromCache() {
        return new Promise((resolve, reject) => {
            try {
                const cached = JSON.parse(localStorage.getItem(this.cacheKey));
                
                // 执行缓存的脚本
                const blob = new Blob([cached.script], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    URL.revokeObjectURL(url);
                    this.onLoadSuccess();
                    resolve(window.AMap);
                };
                script.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('缓存脚本加载失败'));
                };
                
                document.head.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 从网络加载
     */
    loadFromNetwork(resolve, reject) {
        // 构建插件字符串
        const plugins = CONFIG.amap.plugins.join(',');
        
        // 创建script标签
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=${CONFIG.amap.version}&key=${CONFIG.amap.key}&plugin=${plugins}`;
        
        // 设置加载超时
        const timeout = setTimeout(() => {
            reject(new Error('地图加载超时'));
        }, 30000);
        
        // 加载成功
        script.onload = () => {
            clearTimeout(timeout);
            
            // 配置安全密钥
            if (CONFIG.amap.securityCode) {
                window._AMapSecurityConfig = {
                    securityJsCode: CONFIG.amap.securityCode
                };
            }
            
            this.onLoadSuccess();
            
            // 缓存脚本内容（可选）
            this.cacheScript().catch(console.warn);
            
            resolve(window.AMap);
        };
        
        // 加载失败
        script.onerror = () => {
            clearTimeout(timeout);
            this.onLoadError();
            reject(new Error('地图SDK加载失败'));
        };
        
        document.head.appendChild(script);
        
        // 模拟加载进度
        this.simulateProgress();
    }
    
    /**
     * 模拟加载进度
     */
    simulateProgress() {
        const interval = setInterval(() => {
            this.loadProgress += Math.random() * 15;
            
            if (this.loadProgress >= 100) {
                this.loadProgress = 100;
                clearInterval(interval);
            }
            
            this.notifyProgress(this.loadProgress);
        }, 200);
    }
    
    /**
     * 缓存脚本内容
     */
    async cacheScript() {
        try {
            // 获取脚本内容
            const response = await fetch(`https://webapi.amap.com/maps?v=${CONFIG.amap.version}&key=${CONFIG.amap.key}`);
            const script = await response.text();
            
            const cacheData = {
                version: CONFIG.amap.version,
                timestamp: Date.now(),
                script: script
            };
            
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('缓存地图脚本失败:', error);
        }
    }
    
    /**
     * 加载成功处理
     */
    onLoadSuccess() {
        this.loaded = true;
        this.loading = false;
        this.loadProgress = 100;
        
        // 执行回调
        this.loadCallbacks.forEach(callback => callback(null, window.AMap));
        this.loadCallbacks = [];
        
        // 通知进度
        this.notifyProgress(100);
    }
    
    /**
     * 加载失败处理
     */
    onLoadError() {
        this.loading = false;
        this.loaded = false;
        
        const error = new Error('地图加载失败');
        this.loadCallbacks.forEach(callback => callback(error));
        this.loadCallbacks = [];
    }
    
    /**
     * 通知进度
     */
    notifyProgress(progress) {
        this.progressCallbacks.forEach(callback => callback(progress));
    }
    
    /**
     * 监听进度
     */
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }
    
    /**
     * 预加载周边瓦片
     */
    preloadTiles(map, center, zoom) {
        if (!map) return;
        
        // 计算需要预加载的瓦片范围
        const bounds = map.getBounds();
        if (!bounds) return;
        
        // 使用requestIdleCallback在空闲时预加载
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                this.loadTilesInBounds(map, bounds, zoom);
            });
        } else {
            setTimeout(() => {
                this.loadTilesInBounds(map, bounds, zoom);
            }, 100);
        }
    }
    
    /**
     * 加载范围内的瓦片
     */
    loadTilesInBounds(map, bounds, zoom) {
        // 计算需要加载的瓦片
        const tiles = this.calculateTiles(bounds, zoom);
        
        // 限制同时加载的数量
        const batchSize = 10;
        let index = 0;
        
        const loadBatch = () => {
            const batch = tiles.slice(index, index + batchSize);
            batch.forEach(tile => {
                // 创建隐藏的img标签预加载
                const img = new Image();
                img.src = this.getTileUrl(tile.x, tile.y, tile.z);
            });
            
            index += batchSize;
            if (index < tiles.length) {
                requestIdleCallback(loadBatch);
            }
        };
        
        loadBatch();
    }
    
    /**
     * 计算需要加载的瓦片
     */
    calculateTiles(bounds, zoom) {
        const tiles = [];
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        // 转换为瓦片坐标
        const tileNE = this.lngLatToTile(ne.lng, ne.lat, zoom);
        const tileSW = this.lngLatToTile(sw.lng, sw.lat, zoom);
        
        // 遍历瓦片范围
        for (let x = Math.floor(tileSW.x); x <= Math.ceil(tileNE.x); x++) {
            for (let y = Math.floor(tileSW.y); y <= Math.ceil(tileNE.y); y++) {
                if (x >= 0 && y >= 0) {
                    tiles.push({ x, y, z: zoom });
                }
            }
        }
        
        return tiles;
    }
    
    /**
     * 经纬度转瓦片坐标
     */
    lngLatToTile(lng, lat, zoom) {
        const n = Math.pow(2, zoom);
        const x = n * ((lng + 180) / 360);
        const y = n * (1 - (Math.log(Math.tan(lat * Math.PI / 180) + 
                   1 / Math.cos(lat * Math.PI / 180)) / Math.PI)) / 2;
        
        return { x, y };
    }
    
    /**
     * 获取瓦片URL
     */
    getTileUrl(x, y, z) {
        const subdomains = ['1', '2', '3', '4'];
        const s = subdomains[Math.floor(Math.random() * subdomains.length)];
        return `https://webrd0${s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x=${x}&y=${y}&z=${z}`;
    }
}

// 创建单例
const mapLoader = new MapLoader();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = mapLoader;
}