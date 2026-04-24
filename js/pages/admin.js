/**
 * 管理后台页面逻辑 - 独立版本
 */

const pageState = {
    map: null,
    isDrawing: false,
    trafficEnabled: false,
    satelliteEnabled: false,
    vehicles: [],
    fencePoints: [],
    fenceMarkers: [],
    fencePolygon: null,
    previewPolygon: null,
    trafficLayer: null,
    satelliteLayer: null
};

const UI = {};

async function initAdmin() {
    console.log('开始初始化...');
    
    cacheDOM();
    
    // 直接加载高德地图
    await loadAMap();
    
    // 创建地图
    createMap();
    
    // 加载模拟数据
    loadMockVehicles();
    
    // 绑定事件
    bindEvents();
    
    // 初始化搜索
    initPlaceSearch();
    
    console.log('初始化完成');
    showToast('管理后台加载完成', 'success');
}

function cacheDOM() {
    UI.coordDisplay = document.getElementById('coordDisplay');
    UI.startDrawBtn = document.getElementById('startDrawBtn');
    UI.finishDrawBtn = document.getElementById('finishDrawBtn');
    UI.clearFenceBtn = document.getElementById('clearFenceBtn');
    UI.drawHint = document.getElementById('drawHint');
    UI.fenceInfoCard = document.getElementById('fenceInfoCard');
    UI.fencePointsCount = document.getElementById('fencePointsCount');
    UI.fenceArea = document.getElementById('fenceArea');
    UI.fencePerimeter = document.getElementById('fencePerimeter');
    UI.fenceVehiclesCount = document.getElementById('fenceVehiclesCount');
    UI.adminVehicleCount = document.getElementById('adminVehicleCount');
    UI.allVehiclesList = document.getElementById('allVehiclesList');
    UI.placeSearchInput = document.getElementById('placeSearchInput');
    UI.searchResults = document.getElementById('searchResults');
    UI.mapZoomLevel = document.getElementById('mapZoomLevel');
    UI.locateBtn = document.getElementById('locateBtn');
    UI.trafficBtn = document.getElementById('trafficBtn');
    UI.satelliteBtn = document.getElementById('satelliteBtn');
    UI.fitAllBtn = document.getElementById('fitAllBtn');
    UI.saveFenceBtn = document.getElementById('saveFenceBtn');
    UI.addVehicleBtn = document.getElementById('addVehicleBtn');
}

function loadAMap() {
    return new Promise((resolve, reject) => {
        if (window.AMap) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://webapi.amap.com/maps?v=2.0&key=e87f22ce801d67bac8770502077f548e&plugin=AMap.ToolBar,AMap.Scale,AMap.Geolocation,AMap.PlaceSearch,AMap.GeometryUtil';
        script.onload = () => {
            console.log('高德SDK加载完成');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('地图加载失败'));
        };
        document.head.appendChild(script);
    });
}

function createMap() {
    pageState.map = new AMap.Map('mapContainer', {
        zoom: 15,
        center: [116.397428, 39.90923],
        viewMode: '2D',
        mapStyle: 'amap://styles/normal'
    });
    
    // 绑定地图事件
    pageState.map.on('moveend', () => {
        const center = pageState.map.getCenter();
        UI.coordDisplay.innerHTML = `<i class="fas fa-map-pin"></i> ${center.lng.toFixed(6)}, ${center.lat.toFixed(6)}`;
        UI.mapZoomLevel.textContent = pageState.map.getZoom();
    });
    
    pageState.map.on('click', (e) => {
        if (pageState.isDrawing) {
            addFencePoint(e.lnglat.lng, e.lnglat.lat);
        }
    });
    
    console.log('地图创建完成');
}

function loadMockVehicles() {
    pageState.vehicles = [
        { id: 'v1', name: '单车001', plate: 'BJ001', lat: 39.90923, lng: 116.397428, status: 'online', battery: 85 },
        { id: 'v2', name: '单车002', plate: 'BJ002', lat: 39.91023, lng: 116.398428, status: 'online', battery: 72 },
        { id: 'v3', name: '单车003', plate: 'BJ003', lat: 39.90823, lng: 116.396428, status: 'online', battery: 45 },
        { id: 'v4', name: '电单车001', plate: 'BD001', lat: 39.91123, lng: 116.395428, status: 'online', battery: 92 },
        { id: 'v5', name: '电单车002', plate: 'BD002', lat: 39.90723, lng: 116.399428, status: 'online', battery: 31 }
    ];
    
    addVehicleMarkers();
    updateVehicleList();
}

function addVehicleMarkers() {
    pageState.vehicles.forEach(v => {
        const marker = new AMap.Marker({
            position: [v.lng, v.lat],
            map: pageState.map,
            title: v.name,
            label: {
                content: v.name.substring(0, 2),
                direction: 'top'
            }
        });
        
        marker.on('click', () => {
            new AMap.InfoWindow({
                content: `<div style="padding:8px;"><strong>${v.name}</strong><br>编号:${v.plate}<br>电量:${v.battery}%</div>`,
                offset: new AMap.Pixel(0, -30)
            }).open(pageState.map, [v.lng, v.lat]);
        });
        
        v.marker = marker;
    });
}

function updateVehicleList() {
    UI.adminVehicleCount.textContent = pageState.vehicles.length;
    
    UI.allVehiclesList.innerHTML = pageState.vehicles.map(v => `
        <div class="vehicle-mini-item" onclick="locateVehicle('${v.id}')">
            <span class="vehicle-color-dot" style="background: ${getColor(v.id)};"></span>
            <div class="vehicle-mini-info">
                <div class="vehicle-mini-name">${v.name}</div>
                <div class="vehicle-mini-detail">${v.plate} · ${v.battery}%</div>
            </div>
            <span class="vehicle-mini-status ${v.status}">${v.status === 'online' ? '在线' : '离线'}</span>
        </div>
    `).join('');
}

function addFencePoint(lng, lat) {
    pageState.fencePoints.push([lng, lat]);
    
    const marker = new AMap.Marker({
        position: [lng, lat],
        icon: createPointIcon(pageState.fencePoints.length),
        map: pageState.map,
        title: `顶点${pageState.fencePoints.length}`
    });
    
    pageState.fenceMarkers.push(marker);
    updatePreviewPolygon();
    updateFenceInfo();
    
    console.log(`已添加第${pageState.fencePoints.length}个顶点`);
}

function createPointIcon(num) {
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
    ctx.fillText(String(num), 15, 15);
    
    return canvas.toDataURL();
}

function updatePreviewPolygon() {
    if (pageState.previewPolygon) {
        pageState.previewPolygon.setMap(null);
    }
    
    if (pageState.fencePoints.length >= 3) {
        pageState.previewPolygon = new AMap.Polygon({
            path: pageState.fencePoints,
            strokeColor: '#faad14',
            strokeWeight: 2,
            strokeStyle: 'dashed',
            fillColor: '#faad14',
            fillOpacity: 0.1,
            map: pageState.map
        });
    } else if (pageState.fencePoints.length >= 2) {
        pageState.previewPolygon = new AMap.Polyline({
            path: pageState.fencePoints,
            strokeColor: '#faad14',
            strokeWeight: 2,
            strokeStyle: 'dashed',
            map: pageState.map
        });
    }
}

function updateFenceInfo() {
    if (pageState.fencePoints.length === 0) return;
    
    UI.fenceInfoCard.style.display = 'block';
    UI.fencePointsCount.textContent = pageState.fencePoints.length;
    
    if (pageState.fencePoints.length >= 3) {
        const area = AMap.GeometryUtil.ringArea(pageState.fencePoints);
        let perimeter = 0;
        for (let i = 0; i < pageState.fencePoints.length; i++) {
            const j = (i + 1) % pageState.fencePoints.length;
            perimeter += AMap.GeometryUtil.distance(pageState.fencePoints[i], pageState.fencePoints[j]);
        }
        
        UI.fenceArea.textContent = area.toFixed(2);
        UI.fencePerimeter.textContent = perimeter.toFixed(2);
        
        // 计算围栏内车辆
        let count = 0;
        pageState.vehicles.forEach(v => {
            if (AMap.GeometryUtil.isPointInRing([v.lng, v.lat], pageState.fencePoints)) {
                count++;
            }
        });
        UI.fenceVehiclesCount.textContent = count;
    }
}

function finishDrawing() {
    if (pageState.fencePoints.length < 3) {
        alert('至少需要3个顶点');
        return;
    }
    
    pageState.isDrawing = false;
    
    if (pageState.previewPolygon) {
        pageState.previewPolygon.setMap(null);
        pageState.previewPolygon = null;
    }
    
    if (pageState.fencePolygon) {
        pageState.fencePolygon.setMap(null);
    }
    
    pageState.fencePolygon = new AMap.Polygon({
        path: pageState.fencePoints,
        strokeColor: '#ff4d4f',
        strokeWeight: 3,
        fillColor: '#ff4d4f',
        fillOpacity: 0.15,
        map: pageState.map
    });
    
    UI.startDrawBtn.style.display = 'block';
    UI.finishDrawBtn.style.display = 'none';
    UI.drawHint.style.display = 'none';
    
    showToast('围栏绘制完成', 'success');
}

function clearFence() {
    if (!confirm('确定清除围栏？')) return;
    
    pageState.isDrawing = false;
    
    [pageState.fencePolygon, pageState.previewPolygon].forEach(p => {
        if (p) p.setMap(null);
    });
    pageState.fenceMarkers.forEach(m => m.setMap(null));
    
    pageState.fencePoints = [];
    pageState.fenceMarkers = [];
    pageState.fencePolygon = null;
    pageState.previewPolygon = null;
    
    UI.startDrawBtn.style.display = 'block';
    UI.finishDrawBtn.style.display = 'none';
    UI.drawHint.style.display = 'none';
    UI.fenceInfoCard.style.display = 'none';
    
    showToast('围栏已清除', 'info');
}

function locateVehicle(id) {
    const v = pageState.vehicles.find(v => v.id === id);
    if (v) {
        pageState.map.setZoomAndCenter(18, [v.lng, v.lat]);
    }
}

function toggleTraffic() {
    if (!pageState.trafficLayer) {
        pageState.trafficLayer = new AMap.TileLayer.Traffic({ autoRefresh: true, interval: 180 });
    }
    
    if (pageState.trafficEnabled) {
        pageState.trafficLayer.setMap(null);
        pageState.trafficEnabled = false;
        UI.trafficBtn.classList.remove('active');
    } else {
        pageState.trafficLayer.setMap(pageState.map);
        pageState.trafficEnabled = true;
        UI.trafficBtn.classList.add('active');
    }
}

function toggleSatellite() {
    if (!pageState.satelliteLayer) {
        pageState.satelliteLayer = new AMap.TileLayer.Satellite();
    }
    
    if (pageState.satelliteEnabled) {
        pageState.satelliteLayer.setMap(null);
        pageState.satelliteEnabled = false;
        UI.satelliteBtn.classList.remove('active');
    } else {
        pageState.satelliteLayer.setMap(pageState.map);
        pageState.satelliteEnabled = true;
        UI.satelliteBtn.classList.add('active');
    }
}

function fitAll() {
    const markers = pageState.vehicles.map(v => v.marker).filter(m => m);
    if (markers.length > 0) {
        pageState.map.setFitView(markers);
    }
}

function locateUser() {
    AMap.plugin('AMap.Geolocation', () => {
        const geo = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000 });
        geo.getCurrentPosition((status, result) => {
            if (status === 'complete') {
                pageState.map.setZoomAndCenter(17, result.position);
                new AMap.Marker({
                    position: result.position,
                    map: pageState.map,
                    title: '我的位置'
                });
            }
        });
    });
}

function initPlaceSearch() {
    let timer;
    
    UI.placeSearchInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        const kw = e.target.value.trim();
        if (kw) {
            timer = setTimeout(() => searchPlace(kw), 500);
        } else {
            UI.searchResults.style.display = 'none';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!UI.placeSearchInput.contains(e.target) && !UI.searchResults.contains(e.target)) {
            UI.searchResults.style.display = 'none';
        }
    });
}

function searchPlace(keyword) {
    AMap.plugin('AMap.PlaceSearch', () => {
        const ps = new AMap.PlaceSearch({ pageSize: 10, city: '全国' });
        ps.search(keyword, (status, result) => {
            if (status === 'complete' && result.poiList) {
                UI.searchResults.innerHTML = result.poiList.pois.map(p => `
                    <div class="search-result-item" onclick="selectPlace(${p.location.lng}, ${p.location.lat}, '${p.name}')">
                        <div class="search-result-name">${p.name}</div>
                        <div class="search-result-address">${p.address || ''}</div>
                    </div>
                `).join('');
                UI.searchResults.style.display = 'block';
            }
        });
    });
}

function selectPlace(lng, lat, name) {
    pageState.map.setZoomAndCenter(17, [lng, lat]);
    new AMap.InfoWindow({
        content: `<strong>${name}</strong>`,
        offset: new AMap.Pixel(0, -30)
    }).open(pageState.map, [lng, lat]);
    UI.searchResults.style.display = 'none';
    UI.placeSearchInput.value = name;
}

function bindEvents() {
    UI.startDrawBtn.addEventListener('click', () => {
        pageState.isDrawing = true;
        UI.startDrawBtn.style.display = 'none';
        UI.finishDrawBtn.style.display = 'block';
        UI.drawHint.style.display = 'flex';
    });
    
    UI.finishDrawBtn.addEventListener('click', finishDrawing);
    UI.clearFenceBtn.addEventListener('click', clearFence);
    UI.locateBtn.addEventListener('click', locateUser);
    UI.trafficBtn.addEventListener('click', toggleTraffic);
    UI.satelliteBtn.addEventListener('click', toggleSatellite);
    UI.fitAllBtn.addEventListener('click', fitAll);
    
    UI.addVehicleBtn.addEventListener('click', () => {
        const center = pageState.map.getCenter();
        const v = {
            id: `v${pageState.vehicles.length + 1}`,
            name: `单车${String(pageState.vehicles.length + 1).padStart(3, '0')}`,
            plate: `BJ${String(pageState.vehicles.length + 1).padStart(3, '0')}`,
            lng: center.lng + (Math.random() - 0.5) * 0.005,
            lat: center.lat + (Math.random() - 0.5) * 0.005,
            status: 'online',
            battery: Math.floor(Math.random() * 40 + 60)
        };
        pageState.vehicles.push(v);
        addVehicleMarkers();
        updateVehicleList();
        showToast(`已添加 ${v.name}`, 'success');
    });
    // 在 bindEvents 函数中添加
    UI.placeSearchInput.addEventListener('keydown', (e) => {
         if (e.key === 'Enter') {
           const keyword = UI.placeSearchInput.value.trim();
           if (keyword) {
                   searchPlace(keyword);
        }
    }
});
}

function getColor(id) {
    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1'];
    return colors[parseInt(id.replace('v', '')) % colors.length] || colors[0];
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        padding: 12px 20px; border-radius: 8px; color: white;
        background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : type === 'warning' ? '#faad14' : '#1677ff'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 14px;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 全局函数
window.locateVehicle = locateVehicle;
window.selectPlace = selectPlace;

// 启动
document.addEventListener('DOMContentLoaded', initAdmin);