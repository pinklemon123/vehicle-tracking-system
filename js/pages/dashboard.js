/**
 * 仪表盘页面逻辑
 */

// 页面状态
const pageState = {
    vehicles: [],
    alarms: [],
    fence: null,
    stats: {
        total: 0,
        online: 0,
        inFence: 0,
        alarms: 0
    },
    wsClient: null,
    refreshInterval: null
};

// DOM 元素
const UI = {
    totalVehicles: document.getElementById('totalVehicles'),
    onlineVehicles: document.getElementById('onlineVehicles'),
    inFenceVehicles: document.getElementById('inFenceVehicles'),
    todayAlarms: document.getElementById('todayAlarms'),
    vehicleTableBody: document.getElementById('vehicleTableBody'),
    vehicleTableCount: document.getElementById('vehicleTableCount'),
    alarmList: document.getElementById('alarmList'),
    alarmBadge: document.getElementById('alarmBadge'),
    fenceSummaryContent: document.getElementById('fenceSummaryContent'),
    currentDate: document.getElementById('currentDate')
};

/**
 * 初始化页面
 */
async function initDashboard() {
    // 显示当前日期
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // 加载数据
    await loadData();
    
    // 初始化WebSocket
    initWebSocket();
    
    // 绑定事件
    bindEvents();
    
    // 设置自动刷新
    pageState.refreshInterval = setInterval(loadData, 30000);
    
    Utils.showNotification('仪表盘加载完成', 'success');
}

/**
 * 更新日期时间
 */
function updateDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    
    UI.currentDate.textContent = `${year}年${month}月${day}日 ${weekday}`;
}

/**
 * 加载数据
 */
async function loadData() {
    try {
        // 并行加载数据
        const [vehiclesRes, alarmsRes, fenceRes, statsRes] = await Promise.all([
            ApiService.get('/api/vehicles'),
            ApiService.get('/api/alarms', { limit: 10 }),
            ApiService.get('/api/fence'),
            ApiService.get('/api/statistics')
        ]);
        
        if (vehiclesRes.code === 0) {
            pageState.vehicles = vehiclesRes.data || [];
        }
        
        if (alarmsRes.code === 0) {
            pageState.alarms = alarmsRes.data || [];
        }
        
        if (fenceRes.code === 0) {
            pageState.fence = fenceRes.data;
        }
        
        if (statsRes.code === 0) {
            pageState.stats = statsRes.data;
        }
        
        // 如果API没有返回数据，使用模拟数据
        if (pageState.vehicles.length === 0) {
            loadMockData();
        }
        
        // 更新UI
        updateStats();
        updateVehicleTable();
        updateAlarmList();
        updateFenceSummary();
        
    } catch (error) {
        console.error('加载数据失败:', error);
        loadMockData();
        updateStats();
        updateVehicleTable();
        updateAlarmList();
        updateFenceSummary();
    }
}

/**
 * 加载模拟数据
 */
function loadMockData() {
    pageState.vehicles = [
        { id: 'v1', name: '共享单车001', plate: 'BJ001', status: 'online', battery: 85, lat: 39.90923, lng: 116.397428, updateTime: new Date().toISOString() },
        { id: 'v2', name: '共享单车002', plate: 'BJ002', status: 'online', battery: 72, lat: 39.91623, lng: 116.407428, updateTime: new Date().toISOString() },
        { id: 'v3', name: '共享单车003', plate: 'BJ003', status: 'online', battery: 45, lat: 39.89923, lng: 116.387428, updateTime: new Date().toISOString() },
        { id: 'v4', name: '共享单车004', plate: 'BJ004', status: 'offline', battery: 0, lat: 39.91523, lng: 116.387428, updateTime: new Date(Date.now() - 3600000).toISOString() },
        { id: 'v5', name: '共享单车005', plate: 'BJ005', status: 'online', battery: 92, lat: 39.90523, lng: 116.417428, updateTime: new Date().toISOString() },
        { id: 'v6', name: '共享电单车001', plate: 'BD001', status: 'online', battery: 68, lat: 39.90823, lng: 116.396428, updateTime: new Date().toISOString() },
        { id: 'v7', name: '共享电单车002', plate: 'BD002', status: 'online', battery: 31, lat: 39.91123, lng: 116.395428, updateTime: new Date().toISOString() },
        { id: 'v8', name: '共享电单车003', plate: 'BD003', status: 'offline', battery: 0, lat: 39.90723, lng: 116.399428, updateTime: new Date(Date.now() - 7200000).toISOString() }
    ];
    
    pageState.alarms = [
        { id: 'a1', type: 'fence_leave', level: 'warning', message: '车辆 BJ003 离开电子围栏', time: new Date().toISOString() },
        { id: 'a2', type: 'low_battery', level: 'warning', message: '车辆 BD002 电量不足 (31%)', time: new Date(Date.now() - 300000).toISOString() },
        { id: 'a3', type: 'fence_enter', level: 'info', message: '车辆 BJ001 进入电子围栏', time: new Date(Date.now() - 600000).toISOString() }
    ];
    
    pageState.fence = {
        isValid: true,
        points: [[116.396, 39.907], [116.399, 39.907], [116.399, 39.911], [116.396, 39.911]],
        area: 125000,
        perimeter: 1400
    };
    
    pageState.stats = {
        total: pageState.vehicles.length,
        online: pageState.vehicles.filter(v => v.status === 'online').length,
        inFence: 5,
        alarms: pageState.alarms.length
    };
}

/**
 * 初始化WebSocket
 */
function initWebSocket() {
    pageState.wsClient = new WSClient({
        url: CONFIG.server.websocket.url,
        onMessage: handleWSMessage,
        onConnect: () => {
            console.log('WebSocket连接成功');
        },
        onDisconnect: () => {
            console.log('WebSocket断开连接');
        }
    });
}

/**
 * 处理WebSocket消息
 */
function handleWSMessage(data) {
    switch (data.type) {
        case 'vehicle_update':
            updateVehicleFromWS(data.vehicle);
            break;
        case 'vehicles_batch_update':
            data.vehicles.forEach(v => updateVehicleFromWS(v));
            break;
        case 'new_alarm':
            addNewAlarm(data.alarm);
            break;
        case 'fence_updated':
            pageState.fence = data.fence;
            updateFenceSummary();
            break;
    }
}

/**
 * 从WebSocket更新车辆
 */
function updateVehicleFromWS(vehicleData) {
    const index = pageState.vehicles.findIndex(v => v.id === vehicleData.id);
    if (index >= 0) {
        pageState.vehicles[index] = { ...pageState.vehicles[index], ...vehicleData };
    } else {
        pageState.vehicles.push(vehicleData);
    }
    
    // 更新统计
    pageState.stats.total = pageState.vehicles.length;
    pageState.stats.online = pageState.vehicles.filter(v => v.status === 'online').length;
    
    updateStats();
    updateVehicleTable();
}

/**
 * 添加新报警
 */
function addNewAlarm(alarm) {
    pageState.alarms.unshift(alarm);
    if (pageState.alarms.length > 50) {
        pageState.alarms.pop();
    }
    pageState.stats.alarms = pageState.alarms.filter(a => !a.read).length;
    
    updateStats();
    updateAlarmList();
    
    // 浏览器通知
    if (Notification.permission === 'granted') {
        new Notification('新报警', { body: alarm.message });
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 刷新按钮
    document.getElementById('refreshVehiclesBtn').addEventListener('click', () => {
        loadData();
        Utils.showNotification('数据已刷新', 'info');
    });
    
    // 清除报警
    document.getElementById('clearAlarmsBtn').addEventListener('click', () => {
        pageState.alarms.forEach(a => a.read = true);
        pageState.stats.alarms = 0;
        updateStats();
        updateAlarmList();
        Utils.showNotification('所有报警已标记为已读', 'success');
    });
    
    // 请求通知权限
    if (Notification && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * 更新统计数字
 */
function updateStats() {
    UI.totalVehicles.textContent = pageState.stats.total || pageState.vehicles.length;
    UI.onlineVehicles.textContent = pageState.stats.online || pageState.vehicles.filter(v => v.status === 'online').length;
    UI.inFenceVehicles.textContent = pageState.stats.inFence || 0;
    UI.todayAlarms.textContent = pageState.stats.alarms || pageState.alarms.filter(a => !a.read).length;
}

/**
 * 更新车辆表格
 */
function updateVehicleTable() {
    const vehicles = pageState.vehicles;
    UI.vehicleTableCount.textContent = vehicles.length;
    
    if (vehicles.length === 0) {
        UI.vehicleTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                    <i class="fas fa-bicycle" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
                    <p>暂无车辆数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    UI.vehicleTableBody.innerHTML = vehicles.map(v => {
        const statusClass = v.status === 'online' ? 'online' : 'offline';
        const statusText = v.status === 'online' ? '在线' : '离线';
        const batteryLevel = v.battery || 0;
        const batteryClass = batteryLevel > 60 ? 'high' : (batteryLevel > 30 ? 'medium' : 'low');
        const updateTime = v.updateTime ? formatRelativeTime(v.updateTime) : '-';
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="vehicle-color-dot" style="background: ${getVehicleColor(v.id)};"></span>
                        <span>${v.name || v.plate}</span>
                    </div>
                </td>
                <td>${v.plate || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="battery-level">
                        <span>${batteryLevel}%</span>
                        <div class="battery-bar">
                            <div class="battery-fill ${batteryClass}" style="width: ${batteryLevel}%;"></div>
                        </div>
                    </div>
                </td>
                <td>${formatCoordinate(v.lat, v.lng)}</td>
                <td>${updateTime}</td>
            </tr>
        `;
    }).join('');
}

/**
 * 更新报警列表
 */
function updateAlarmList() {
    const unreadAlarms = pageState.alarms.filter(a => !a.read);
    UI.alarmBadge.textContent = unreadAlarms.length;
    
    if (unreadAlarms.length === 0) {
        UI.alarmList.innerHTML = `
            <div style="text-align: center; padding: 32px 20px; color: var(--text-tertiary);">
                <i class="fas fa-check-circle" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>暂无报警</p>
            </div>
        `;
        return;
    }
    
    UI.alarmList.innerHTML = unreadAlarms.slice(0, 5).map(alarm => {
        const iconClass = getAlarmIcon(alarm.type);
        const levelClass = alarm.level || 'info';
        
        return `
            <div class="alarm-item">
                <div class="alarm-icon ${levelClass}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="alarm-content">
                    <div class="alarm-title">${alarm.message}</div>
                    <div class="alarm-time">${formatRelativeTime(alarm.time)}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 更新围栏摘要
 */
function updateFenceSummary() {
    if (!pageState.fence || !pageState.fence.isValid) {
        UI.fenceSummaryContent.innerHTML = `
            <div class="fence-empty">
                <i class="fas fa-draw-polygon"></i>
                <p>暂无电子围栏</p>
                <a href="admin.html" class="btn btn-primary btn-sm" style="margin-top: 12px;">
                    前往设置
                </a>
            </div>
        `;
        return;
    }
    
    const fence = pageState.fence;
    const area = fence.area ? (fence.area / 10000).toFixed(2) : '-';
    const perimeter = fence.perimeter ? (fence.perimeter / 1000).toFixed(2) : '-';
    
    UI.fenceSummaryContent.innerHTML = `
        <div class="fence-stats">
            <div class="fence-stat-item">
                <div class="fence-stat-value">${fence.points?.length || 0}</div>
                <div class="fence-stat-label">顶点数</div>
            </div>
            <div class="fence-stat-item">
                <div class="fence-stat-value">${area}</div>
                <div class="fence-stat-label">面积(万㎡)</div>
            </div>
            <div class="fence-stat-item">
                <div class="fence-stat-value">${perimeter}</div>
                <div class="fence-stat-label">周长(km)</div>
            </div>
            <div class="fence-stat-item">
                <div class="fence-stat-value highlight">${pageState.stats.inFence || 0}</div>
                <div class="fence-stat-label">围栏内车辆</div>
            </div>
        </div>
    `;
}

/**
 * 辅助函数
 */
function getVehicleColor(id) {
    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
    const index = (id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
}

function getAlarmIcon(type) {
    const icons = {
        fence_enter: 'fa-arrow-right-to-bracket',
        fence_leave: 'fa-arrow-right-from-bracket',
        overspeed: 'fa-gauge-high',
        low_battery: 'fa-battery-quarter',
        offline: 'fa-wifi'
    };
    return icons[type] || 'fa-bell';
}

function formatCoordinate(lat, lng) {
    if (!lat || !lng) return '-';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatRelativeTime(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initDashboard);

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (pageState.refreshInterval) {
        clearInterval(pageState.refreshInterval);
    }
    if (pageState.wsClient) {
        pageState.wsClient.close();
    }
});