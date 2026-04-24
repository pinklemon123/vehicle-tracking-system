/**
 * 电子围栏管理器
 */

class FenceManager {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.fence = {
            points: [],
            polygon: null,
            markers: []
        };
        this.isDrawing = false;
        this.onUpdate = null;
    }
    
    /**
     * 开始绘制
     */
    startDrawing() {
        this.clear();
        this.isDrawing = true;
    }
    
    /**
     * 添加顶点
     */
    addPoint(lnglat) {
        if (!this.isDrawing) return;
        
        const point = Array.isArray(lnglat) ? lnglat : [lnglat[0], lnglat[1]];
        this.fence.points.push(point);
        
        // 添加标记
        const marker = this.mapCore.addMarker(
            `fence_point_${this.fence.points.length}`,
            point,
            {
                icon: this._createPointIcon(this.fence.points.length),
                draggable: true
            }
        );
        
        this.fence.markers.push(marker);
        
        // 更新预览
        this._updatePreview();
        this._notifyUpdate();
    }
    
    /**
     * 完成绘制
     */
    finishDrawing() {
        if (this.fence.points.length < 3) {
            return false;
        }
        
        this.isDrawing = false;
        
        // 创建最终围栏
        if (this.fence.polygon) {
            this.fence.polygon.setMap(null);
        }
        
        this.fence.polygon = this.mapCore.addPolygon(this.fence.points, {
            strokeColor: CONFIG.fence.defaultColor,
            fillColor: CONFIG.fence.defaultColor,
            fillOpacity: CONFIG.fence.defaultFillOpacity
        });
        
        this._notifyUpdate();
        eventBus.emit(EVENTS.FENCE_UPDATED, this.getFenceData());
        
        return true;
    }
    
    /**
     * 清除围栏
     */
    clear() {
        // 清除多边形
        if (this.fence.polygon) {
            this.fence.polygon.setMap(null);
        }
        
        // 清除标记
        this.fence.markers.forEach((_, i) => {
            this.mapCore.removeMarker(`fence_point_${i + 1}`);
        });
        
        this.fence = {
            points: [],
            polygon: null,
            markers: []
        };
        
        this.isDrawing = false;
        this._notifyUpdate();
        eventBus.emit(EVENTS.FENCE_CLEARED);
    }
    
    /**
     * 加载围栏数据
     */
    loadFence(data) {
        this.clear();
        
        if (data && data.points && data.points.length >= 3) {
            this.fence.points = data.points;
            this.fence.polygon = this.mapCore.addPolygon(data.points, {
                strokeColor: data.color || CONFIG.fence.defaultColor,
                fillColor: data.color || CONFIG.fence.defaultColor,
                fillOpacity: data.fillOpacity || CONFIG.fence.defaultFillOpacity
            });
            
            // 添加顶点标记
            data.points.forEach((point, i) => {
                const marker = this.mapCore.addMarker(
                    `fence_point_${i + 1}`,
                    point,
                    { icon: this._createPointIcon(i + 1) }
                );
                this.fence.markers.push(marker);
            });
            
            this._notifyUpdate();
            eventBus.emit(EVENTS.FENCE_UPDATED, this.getFenceData());
        }
    }
    
    /**
     * 获取围栏数据
     */
    getFenceData() {
        if (!this.fence.polygon) return null;
        
        return {
            points: this.fence.points,
            isValid: this.fence.points.length >= 3,
            area: this._calculateArea(),
            perimeter: this._calculatePerimeter(),
            pointCount: this.fence.points.length
        };
    }
    
    /**
     * 检查点是否在围栏内
     */
    contains(lng, lat) {
        if (!this.fence.polygon || this.fence.points.length < 3) {
            return false;
        }
        
        return AMap.GeometryUtil.isPointInRing([lng, lat], this.fence.points);
    }
    
    /**
     * 获取统计
     */
    getStats(vehicleManager) {
        const vehicles = vehicleManager ? vehicleManager.getAll() : [];
        const inFence = vehicles.filter(v => 
            v.status === 'online' && this.contains(v.lng, v.lat)
        );
        
        return {
            inFence: inFence.length
        };
    }
    
    /**
     * 更新预览
     */
    _updatePreview() {
        if (this.fence.polygon) {
            this.fence.polygon.setMap(null);
        }
        
        if (this.fence.points.length >= 3) {
            this.fence.polygon = this.mapCore.addPolygon(this.fence.points, {
                strokeColor: '#faad14',
                fillColor: '#faad14',
                fillOpacity: 0.1,
                strokeStyle: 'dashed'
            });
        } else if (this.fence.points.length >= 2) {
            this.fence.polygon = this.mapCore.addPolyline(this.fence.points, {
                strokeColor: '#faad14',
                strokeStyle: 'dashed'
            });
        }
    }
    
    /**
     * 计算面积
     */
    _calculateArea() {
        if (this.fence.points.length < 3) return 0;
        return AMap.GeometryUtil.ringArea(this.fence.points);
    }
    
    /**
     * 计算周长
     */
    _calculatePerimeter() {
        if (this.fence.points.length < 2) return 0;
        
        let perimeter = 0;
        for (let i = 0; i < this.fence.points.length; i++) {
            const j = (i + 1) % this.fence.points.length;
            perimeter += AMap.GeometryUtil.distance(this.fence.points[i], this.fence.points[j]);
        }
        return perimeter;
    }
    
    /**
     * 创建顶点图标
     */
    _createPointIcon(index) {
        return {
            image: this._createLabelCanvas(index),
            size: new AMap.Size(24, 24),
            imageSize: new AMap.Size(24, 24)
        };
    }
    
    _createLabelCanvas(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 30;
        canvas.height = 30;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#ff4d4f';
        ctx.beginPath();
        ctx.arc(15, 15, 12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 15, 15);
        
        return canvas;
    }
    
    /**
     * 通知更新
     */
    _notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this.getFenceData());
        }
    }
}