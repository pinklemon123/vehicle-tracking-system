/**
 * 全局配置文件
 * @description 系统所有配置项统一管理
 */

const CONFIG = {
    // 应用信息
    app: {
        name: '车辆定位监控系统',
        version: '2.0.0',
        debug: true,
        env: 'development' // development, production
    },
    
    // 高德地图配置
    amap: {
        key: 'dc6f2273e426185a9cc04b9b3eb61fb4',
        securityCode: 'dc6f2273e426185a9cc04b9b3eb61fb4',
        version: '2.0',
        plugins: [
            'AMap.ToolBar',
            'AMap.Scale', 
            'AMap.Geolocation',
            'AMap.Driving',
            'AMap.Walking',
            'AMap.Transfer',
            'AMap.GeometryUtil',
            'AMap.Geocoder',
            'AMap.PlaceSearch'
        ]
    },
    
    // 地图默认配置
    map: {
        defaultCenter: [116.397428, 39.90923],
        defaultZoom: 13,
        minZoom: 3,
        maxZoom: 20,
        pitch: 0,
        viewMode: '2D',
        mapStyle: 'amap://styles/normal'
    },
    
    // 服务器配置
    server: {
        // API服务器
        api: {
            baseURL: '/api',
            timeout: 10000
        },
        // WebSocket服务器
        websocket: {
            url: 'ws://localhost:5000',
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000
        }
    },
    
    // 电子围栏配置
    fence: {
        defaultColor: '#ff4d4f',
        defaultFillOpacity: 0.15,
        defaultWeight: 3,
        toleranceDistance: 15, // 容差距离（米）
        minPoints: 3,
        maxPoints: 50
    },
    
    // 车辆配置
    vehicle: {
        defaultColor: '#1677ff',
        trailLength: 50,
        updateInterval: 3000,
        markerSize: 32,
        colors: [
            '#1677ff', '#52c41a', '#faad14', '#ff4d4f',
            '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
        ]
    },
    
    // 报警配置
    alarm: {
        maxAlarms: 100,
        displayDuration: 5000,
        soundEnabled: false,
        types: {
            FENCE_ENTER: { name: '进入围栏', level: 'info', color: '#52c41a' },
            FENCE_LEAVE: { name: '离开围栏', level: 'warning', color: '#faad14' },
            OVERSPEED: { name: '超速', level: 'error', color: '#ff4d4f' },
            LOW_BATTERY: { name: '电量低', level: 'warning', color: '#faad14' },
            OFFLINE: { name: '离线', level: 'error', color: '#ff4d4f' }
        }
    },
    
    // 存储配置
    storage: {
        prefix: 'vts_',
        keys: {
            theme: 'theme',
            userSettings: 'user_settings',
            vehicleList: 'vehicle_list',
            fenceData: 'fence_data',
            mapState: 'map_state'
        }
    },
    
    // 性能配置
    performance: {
        // 地图加载优化
        lazyLoad: true,
        preloadTiles: true,
        tileCacheSize: 256,
        
        // 渲染优化
        maxVisibleMarkers: 100,
        markerClusterEnabled: true,
        
        // 数据更新频率
        statsUpdateInterval: 5000,
        positionUpdateInterval: 3000
    },
    
    // UI配置
    ui: {
        theme: 'light',
        sidebarWidth: 320,
        animationDuration: 300,
        toastDuration: 3000
    }
};

// 根据环境覆盖配置
if (CONFIG.app.env === 'production') {
    CONFIG.app.debug = false;
    CONFIG.server.websocket.url = 'wss://your-domain.com/ws';
    CONFIG.performance.lazyLoad = true;
}

// 冻结配置对象，防止修改
if (CONFIG.app.env === 'production') {
    Object.freeze(CONFIG);
}

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}