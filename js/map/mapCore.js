/**
 * 地图核心类
 */

class MapCore {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = { ...CONFIG.map, ...options };
        this.map = null;
        this.layers = {};
        this.markers = new Map();
        this.infoWindows = new Map();
        this.eventHandlers = new Map();
    }
    
    /**
     * 初始化地图
     */
    init(callback) {
        if (window.AMap) {
            this._createMap();
            callback && callback(null, this.map);
        } else {
            mapLoader.load().then(() => {
                this._createMap();
                callback && callback(null, this.map);
            }).catch(err => {
                callback && callback(err);
            });
        }
    }
    
    /**
     * 创建地图实例
     */
    _createMap() {
        this.map = new AMap.Map(this.containerId, {
            zoom: this.options.defaultZoom,
            center: this.options.defaultCenter,
            viewMode: this.options.viewMode || '2D',
            mapStyle: this.options.mapStyle || 'amap://styles/normal'
        });
        
        this._bindEvents();
        eventBus.emit(EVENTS.MAP_READY, this.map);
    }
    
    /**
     * 绑定地图事件
     */
    _bindEvents() {
        this.map.on('moveend', () => {
            const center = this.map.getCenter();
            eventBus.emit(EVENTS.MAP_MOVE, {
                center: [center.lng, center.lat],
                zoom: this.map.getZoom()
            });
        });
        
        this.map.on('click', (e) => {
            eventBus.emit(EVENTS.MAP_CLICK, {
                lnglat: [e.lnglat.lng, e.lnglat.lat],
                pixel: [e.pixel.x, e.pixel.y]
            });
        });
    }
    
    /**
     * 添加标记
     */
    addMarker(id, position, options = {}) {
        const defaultOptions = {
            icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            title: '',
            draggable: false
        };
        
        const marker = new AMap.Marker({
            position: position,
            ...defaultOptions,
            ...options
        });
        
        marker.on('click', () => {
            this.emit('markerClick', { id, marker, position });
        });
        
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
     * 更新标记位置
     */
    updateMarkerPosition(id, position) {
        const marker = this.markers.get(id);
        if (marker) {
            marker.setPosition(position);
        }
    }
    
    /**
     * 添加多边形
     */
    addPolygon(path, options = {}) {
        const defaultOptions = {
            strokeColor: '#ff4d4f',
            strokeWeight: 3,
            fillColor: '#ff4d4f',
            fillOpacity: 0.15
        };
        
        return new AMap.Polygon({
            path: path,
            ...defaultOptions,
            ...options,
            map: this.map
        });
    }
    
    /**
     * 添加折线
     */
    addPolyline(path, options = {}) {
        const defaultOptions = {
            strokeColor: '#1677ff',
            strokeWeight: 3
        };
        
        return new AMap.Polyline({
            path: path,
            ...defaultOptions,
            ...options,
            map: this.map
        });
    }
    
    /**
     * 显示信息窗口
     */
    showInfoWindow(content, position, id = null) {
        const infoWindow = new AMap.InfoWindow({
            content: content,
            offset: new AMap.Pixel(0, -30)
        });
        
        infoWindow.open(this.map, position);
        
        if (id) {
            this.infoWindows.set(id, infoWindow);
        }
        
        return infoWindow;
    }
    
    /**
     * 设置中心点
     */
    setCenter(position, zoom = null) {
        if (zoom) {
            this.map.setZoomAndCenter(zoom, position);
        } else {
            this.map.setCenter(position);
        }
    }
    
    /**
     * 获取中心点
     */
    getCenter() {
        const center = this.map.getCenter();
        return [center.lng, center.lat];
    }
    
    /**
     * 设置缩放
     */
    setZoom(zoom) {
        this.map.setZoom(zoom);
    }
    
    /**
     * 获取缩放
     */
    getZoom() {
        return this.map.getZoom();
    }
    
    /**
     * 适配视图
     */
    fitView(overlays) {
        this.map.setFitView(overlays);
    }
    
    /**
     * 切换路况图层
     */
    toggleTraffic() {
        if (!this.layers.traffic) {
            this.layers.traffic = new AMap.TileLayer.Traffic();
        }
        
        if (this.layers.traffic.getMap()) {
            this.layers.traffic.setMap(null);
            return false;
        } else {
            this.layers.traffic.setMap(this.map);
            return true;
        }
    }
    
    /**
     * 切换卫星图层
     */
    toggleSatellite() {
        if (!this.layers.satellite) {
            this.layers.satellite = new AMap.TileLayer.Satellite();
        }
        
        if (this.layers.satellite.getMap()) {
            this.layers.satellite.setMap(null);
            return false;
        } else {
            this.layers.satellite.setMap(this.map);
            return true;
        }
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
     * 触发事件
     */
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(h => h(data));
        }
    }
    
    /**
     * 销毁
     */
    destroy() {
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        this.markers.clear();
        this.infoWindows.clear();
        this.eventHandlers.clear();
    }
   /**
 * 地图核心类 - 补充方法
 */


    /**
     * 添加圆形
     */
    addCircle(center, radius, options = {}) {
        const defaultOptions = {
            strokeColor: '#ff4d4f',
            strokeWeight: 3,
            fillColor: '#ff4d4f',
            fillOpacity: 0.15
        };
        
        return new AMap.Circle({
            center: center,
            radius: radius,
            ...defaultOptions,
            ...options,
            map: this.map
        });
    }

    /**
     * 获取所有标记
     */
    getMarkers() {
        return Array.from(this.markers.values());
    }

    /**
     * 清除所有标记
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        this.markers.clear();
    }

}