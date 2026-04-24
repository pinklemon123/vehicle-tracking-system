/**
 * 车辆管理器
 */

class VehicleManager {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.vehicles = new Map();
        this.trails = new Map();
        this.selectedVehicle = null;
        this.onUpdate = null;
    }
    
    /**
     * 设置车辆列表
     */
    setVehicles(vehicles) {
        // 清除现有标记
        this.vehicles.forEach((_, id) => {
            this.mapCore.removeMarker(`vehicle_${id}`);
        });
        this.vehicles.clear();
        
        // 添加新车辆
        vehicles.forEach(v => this.add(v, false));
        
        this._notifyUpdate();
    }
    
    /**
     * 添加车辆
     */
    add(vehicleData, notify = true) {
        const id = vehicleData.id || `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const vehicle = {
            id,
            name: vehicleData.name || '未命名',
            plate: vehicleData.plate || '无车牌',
            lng: vehicleData.lng || 116.397428,
            lat: vehicleData.lat || 39.90923,
            status: vehicleData.status || 'online',
            speed: vehicleData.speed || 0,
            battery: vehicleData.battery || 100,
            color: vehicleData.color || this._randomColor()
        };
        
        this.vehicles.set(id, vehicle);
        
        // 创建地图标记
        const marker = this.mapCore.addMarker(`vehicle_${id}`, [vehicle.lng, vehicle.lat], {
            icon: this._getMarkerIcon(vehicle),
            title: vehicle.name,
            label: {
                content: vehicle.name.substring(0, 2),
                direction: 'top'
            }
        });
        
        vehicle.marker = marker;
        
        // 初始化轨迹
        this.trails.set(id, [[vehicle.lng, vehicle.lat]]);
        
        if (notify) {
            this._notifyUpdate();
            eventBus.emit(EVENTS.VEHICLE_ADDED, vehicle);
        }
        
        return vehicle;
    }
    
    /**
     * 获取车辆
     */
    get(id) {
        return this.vehicles.get(id);
    }
    
    /**
     * 获取所有车辆
     */
    getAll() {
        return Array.from(this.vehicles.values());
    }
    
    /**
     * 更新车辆位置
     */
    updatePosition(id, lng, lat, speed = null) {
        const vehicle = this.vehicles.get(id);
        if (!vehicle) return;
        
        vehicle.lng = lng;
        vehicle.lat = lat;
        if (speed !== null) vehicle.speed = speed;
        
        // 更新标记位置
        this.mapCore.updateMarkerPosition(`vehicle_${id}`, [lng, lat]);
        
        // 更新轨迹
        const trail = this.trails.get(id) || [];
        trail.push([lng, lat]);
        if (trail.length > CONFIG.vehicle.trailLength) {
            trail.shift();
        }
        this.trails.set(id, trail);
        
        this._notifyUpdate();
        eventBus.emit(EVENTS.VEHICLE_UPDATED, vehicle);
    }
    
    /**
     * 批量更新车辆
     */
    update(vehicles) {
        vehicles.forEach(v => {
            if (this.vehicles.has(v.id)) {
                this.updatePosition(v.id, v.lng, v.lat, v.speed);
            } else {
                this.add(v);
            }
        });
    }
    
    /**
     * 删除车辆
     */
    remove(id) {
        this.mapCore.removeMarker(`vehicle_${id}`);
        this.vehicles.delete(id);
        this.trails.delete(id);
        
        if (this.selectedVehicle === id) {
            this.selectedVehicle = null;
        }
        
        this._notifyUpdate();
        eventBus.emit(EVENTS.VEHICLE_REMOVED, { id });
    }
    
    /**
     * 选中车辆
     */
    select(id) {
        this.selectedVehicle = id;
        const vehicle = this.vehicles.get(id);
        if (vehicle) {
            eventBus.emit(EVENTS.VEHICLE_SELECTED, vehicle);
        }
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const vehicles = this.getAll();
        const online = vehicles.filter(v => v.status === 'online');
        const speeds = online.map(v => v.speed).filter(s => s > 0);
        
        return {
            total: vehicles.length,
            online: online.length,
            offline: vehicles.length - online.length,
            avgSpeed: speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0
        };
    }
    
    /**
     * 适配所有车辆到地图
     */
    fitAllToMap() {
        const vehicles = this.getAll().filter(v => v.status === 'online');
        if (vehicles.length === 0) return;
        
        const markers = vehicles.map(v => v.marker).filter(m => m);
        if (markers.length > 0) {
            this.mapCore.fitView(markers);
        }
    }
    
    /**
     * 刷新
     */
    refresh() {
        // 触发更新通知
        this._notifyUpdate();
    }
    
    /**
     * 获取车辆轨迹
     */
    getTrail(id) {
        return this.trails.get(id) || [];
    }
    
    /**
     * 通知更新
     */
    _notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this.getAll());
        }
        eventBus.emit(EVENTS.STATS_UPDATED, this.getStats());
    }
    
    /**
     * 获取标记图标
     */
    _getMarkerIcon(vehicle) {
        const colors = {
            online: 'red',
            offline: 'default'
        };
        const color = colors[vehicle.status] || 'blue';
        return `//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-${color}.png`;
    }
    
    /**
     * 随机颜色
     */
    _randomColor() {
        const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}