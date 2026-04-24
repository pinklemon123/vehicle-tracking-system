// 地图核心功能模块
class MapCore {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = { ...CONFIG.map, ...options };
        this.map = null;
        this.layers = {};
        this.controls = {};
        this.markers = new Map();
        this.eventHandlers = new Map();
        
        this.init();
    }
    
    /**
     * 初始化地图
     */
    init() {
        // 配置安全密钥
        window._AMapSecurityConfig = {
            securityJsCode: CONFIG.amap.securityCode
        };
        
        // 加载高德地图SDK
        this.loadAMapSDK().then(() => {
            this.createMap();
            this.initControls();
            this.initLayers();
            this.bindEvents();
            this.emit('ready', this.map);
        }).catch(error => {
            console.error('地图初始化失败:', error);
            Utils.showNotification('地图加载失败，请刷新重试', 'error');
        });
    }
    
    /**
     * 加载高德地图SDK
     */
    loadAMapSDK() {
        return new Promise((resolve, reject) => {
            if (window.AMap) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            const pluginStr = CONFIG.amap.plugins.join(',');
            script.src = `https://webapi.amap.com/maps?v=${CONFIG.amap.version}&key=${CONFIG.amap.key}&plugin=${pluginStr}`;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 创建地图实例
     */
    createMap() {
        this.map = new AMap.Map(this.containerId, {
            zoom: this.options.defaultZoom,
            center: this.options.defaultCenter,
            viewMode: '2D',
            pitch: 0,
            mapStyle: 'amap://styles/normal',
            resizeEnable: true
        });
    }
    
    /**
     * 初始化控件
     */
    initControls() {
        // 工具条
        this.controls.toolbar = new AMap.ToolBar({
            position: 'LT',
            locate: true
        });
        this.map.addControl(this.controls.toolbar);
        
        // 比例尺
        this.controls.scale = new AMap.Scale({
            position: 'LB'
        });
        this.map.addControl(this.controls.scale);
        
        // 地理定位
        this.controls.geolocation = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            buttonPosition: 'RB',
            buttonOffset: new AMap.Pixel(10, 20),
            zoomToAccuracy: true
        });
        this.map.addControl(this.controls.geolocation);
    }
    
    /**
     * 初始化图层
     */
    initLayers() {
        // 路况图层
        this.layers.traffic = new AMap.TileLayer.Traffic({  zIndex: 10,
            autoRefresh: true,
            interval: 180
        });
        
        // 卫星图层
        this.layers.satellite = new AMap.TileLayer.Satellite();
        
        // 路网图层
        this.layers.roadNet = new AMap.TileLayer.RoadNet();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 地图移动结束
        this.map.on('moveend', () => {
            const center = this.map.getCenter();
            this.emit('moveend', {
                center: [center.lng, center.lat],
                zoom: this.map.getZoom()
            });
        });
        
        // 地图点击
        this.map.on('click', (e) => {
            this.emit('click', {
                lnglat: [e.lnglat.lng, e.lnglat.lat],
                pixel: [e.pixel.x, e.pixel.y]
            });
        });
        
        // 缩放变化
        this.map.on('zoomchange', () => {
            this.emit('zoomchange', this.map.getZoom());
        });
    }
    
    /**
     * 添加标记
     */
    addMarker(id, position, options = {}) {
        const defaultOptions = {
            icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            title: '',
            label: null,
            draggable: false,
            animation: 'AMAP_ANIMATION_NONE'
        };
        
        const markerOptions = { ...defaultOptions, ...options, position };
        const marker = new AMap.Marker(markerOptions);
        
        // 添加点击事件
        marker.on('click', (e) => {
            this.emit('markerClick', { id, marker, position, event: e });
        });
        
        // 添加拖拽事件
        if (options.draggable) {
            marker.on('dragend', (e) => {
                const newPos = [e.lnglat.lng, e.lnglat.lat];
                this.emit('markerDragend', { id, marker, position: newPos });
            });
        }
        
        marker.setMap(this.map);
        this.markers.set(id, marker);
        
        return marker;
    }
    
    /**
     * 移除标记
     */
    removeMarker(id) {
        const marker = this.markers.get(id);
        if (marker) {
            marker.setMap(null);
            this.markers.delete(id);
        }
    }
    
    /**
     * 获取标记
     */
    getMarker(id) {
        return this.markers.get(id);
    }
    
    /**
     * 更新标记位置
     */
    updateMarkerPosition(id, position) {
        const marker = this.markers.get(id);
        if (marker) {
            marker.setPosition(position);
        }
    }
    
    /**
     * 绘制多边形
     */
    drawPolygon(path, options = {}) {
        const defaultOptions = {
            strokeColor: CONFIG.fence.defaultColor,
            strokeWeight: CONFIG.fence.defaultWeight,
            strokeOpacity: 0.8,
            fillColor: CONFIG.fence.defaultColor,
            fillOpacity: CONFIG.fence.defaultFillOpacity
        };
        
        const polygonOptions = { ...defaultOptions, ...options };
        const polygon = new AMap.Polygon({
            path: path,
            ...polygonOptions
        });
        
        polygon.setMap(this.map);
        return polygon;
    }
    
    /**
     * 绘制折线
     */
    drawPolyline(path, options = {}) {
        const defaultOptions = {
            strokeColor: '#1677ff',
            strokeWeight: 3,
            strokeOpacity: 0.8
        };
        
        const polylineOptions = { ...defaultOptions, ...options };
        const polyline = new AMap.Polyline({
            path: path,
            ...polylineOptions
        });
        
        polyline.setMap(this.map);
        return polyline;
    }
    
    /**
     * 绘制圆形
     */
    drawCircle(center, radius, options = {}) {
        const defaultOptions = {
            strokeColor: '#1677ff',
            strokeWeight: 2,
            strokeOpacity: 0.8,
            fillColor: '#1677ff',
            fillOpacity: 0.15
        };
        
        const circleOptions = { ...defaultOptions, ...options };
        const circle = new AMap.Circle({
            center: center,
            radius: radius,
            ...circleOptions
        });
        
        circle.setMap(this.map);
        return circle;
    }
    
    /**
     * 显示信息窗口
     */
    showInfoWindow(content, position, options = {}) {
        const infoWindow = new AMap.InfoWindow({
            content: content,
            offset: new AMap.Pixel(0, -30),
            ...options
        });
        
        infoWindow.open(this.map, position);
        return infoWindow;
    }
    
    /**
     * 切换图层
     */
    toggleLayer(layerName) {
        const layer = this.layers[layerName];
        if (layer) {
            if (layer.getMap()) {
                layer.setMap(null);
                return false;
            } else {
                layer.setMap(this.map);
                return true;
            }
        }
        return false;
    }
    
    /**
     * 设置地图中心
     */
    setCenter(position, zoom = null) {
        if (zoom) {
            this.map.setZoomAndCenter(zoom, position);
        } else {
            this.map.setCenter(position);
        }
    }
    
    /**
     * 获取地图中心
     */
    getCenter() {
        const center = this.map.getCenter();
        return [center.lng, center.lat];
    }
        
    /**
     * 设置缩放级别
     */
    setZoom(zoom) {
        this.map.setZoom(zoom);
    }
    
    /**
     * 获取缩放级别
     */
    getZoom() {
        return this.map.getZoom();
    }
    
    /**
     * 适配视野
     */
    setFitView(overlays) {
        this.map.setFitView(overlays);
    }
    
    /**
     * 地理编码（地址转坐标）
     */
    geocode(address, callback) {
        AMap.plugin('AMap.Geocoder', () => {
            const geocoder = new AMap.Geocoder();
            geocoder.getLocation(address, (status, result) => {
                if (status === 'complete' && result.geocodes.length) {
                    const location = result.geocodes[0].location;
                    callback(null, [location.lng, location.lat]);
                } else {
                    callback(new Error('地理编码失败'));
                }
            });
        });
    }
    
    /**
     * 逆地理编码（坐标转地址）
     */
    regeocode(position, callback) {
        AMap.plugin('AMap.Geocoder', () => {
            const geocoder = new AMap.Geocoder();
            geocoder.getAddress(position, (status, result) => {
                if (status === 'complete' && result.regeocode) {
                    callback(null, result.regeocode.formattedAddress);
                } else {
                    callback(new Error('逆地理编码失败'));
                }
            });
        });
    }
    
    /**
     * 路线规划
     */
    planRoute(start, end, mode = 'driving', callback) {
        const pluginName = mode === 'driving' ? 'AMap.Driving' : 
                          mode === 'walking' ? 'AMap.Walking' : 'AMap.Transfer';
        
        AMap.plugin(pluginName, () => {
            let planner;
            if (mode === 'driving') {
                planner = new AMap.Driving({
                    map: this.map,
                    panel: 'panel'
                });
            } else if (mode === 'walking') {
                planner = new AMap.Walking({
                    map: this.map
                });
            } else {
                planner = new AMap.Transfer({
                    map: this.map,
                    city: '北京市'
                });
            }
            
            planner.search(start, end, (status, result) => {
                callback(status, result);
            });
        });
    }
    
    /**
     * 事件监听
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * 移除事件监听
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     */
           emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                handler(data);
            });
        }
    }
    
    /**
     * 销毁地图
     */
    destroy() {
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        this.markers.clear();
        this.eventHandlers.clear();
    }
}

// 导出地图核心类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapCore;
}