/**
 * 公共设施检索 - 服务器存储版
 */

const pageState = {
    scale: 1,
    minScale: 0.5,
    maxScale: 5,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0,
    markers: [],
    currentCategory: 'all',
    selectedMarkerIndex: -1,
    editingMarkerIndex: -1,
    imageSrc: 'assets/images/campus-map.jpg'
};

const UI = {};

const FACILITY_TYPES = {
    toilet: { name: '卫生间', icon: 'fa-restroom', color: '#ff4d4f' },
    water: { name: '饮水点', icon: 'fa-water', color: '#1677ff' },
    elevator: { name: '电梯', icon: 'fa-arrow-up', color: '#722ed1' },
    medical: { name: '医疗点', icon: 'fa-hospital', color: '#52c41a' },
    bike: { name: '自行车停放', icon: 'fa-bicycle', color: '#faad14' },
    classroom: { name: '教室', icon: 'fa-chalkboard', color: '#eb6f20' },
    office: { name: '办公室', icon: 'fa-building', color: '#666666' },
    shop: { name: '商店', icon: 'fa-store', color: '#13c2c2' },
    stairs: { name: '楼梯', icon: 'fa-stairs', color: '#8c8c8c' },
    exit: { name: '出口', icon: 'fa-door-open', color: '#f5222d' }
};

async function initFacilities() {
    cacheDOM();
    await loadMarkers();
    loadImage();
    bindEvents();
    updateStats();
    renderMarkerList();
}

function cacheDOM() {
    UI.mapContainer = document.getElementById('mapContainer');
    UI.imgWrapper = document.getElementById('imgWrapper');
    UI.campusImage = document.getElementById('campusImage');
    UI.markersLayer = document.getElementById('markersLayer');
    UI.facilitiesList = document.getElementById('facilitiesList');
    UI.totalCount = document.getElementById('totalCount');
    UI.normalCount = document.getElementById('normalCount');
    UI.maintenanceCount = document.getElementById('maintenanceCount');
    UI.facilityModal = document.getElementById('facilityModal');
    UI.modalTitle = document.getElementById('modalTitle');
    UI.modalBody = document.getElementById('modalBody');
    UI.searchInput = document.getElementById('searchInput');
    UI.categoryTabs = document.querySelector('.category-tabs');
}

function loadImage() {
    const loader = document.getElementById('loadingOverlay');
    
    UI.campusImage.onload = () => {
        console.log('图片加载成功');
        setTimeout(() => {
            resetView();
            renderAllMarkers();
        }, 100);
        if (loader) loader.style.display = 'none';
    };
    
    UI.campusImage.onerror = () => {
        console.log('图片未找到，使用SVG占位图');
        UI.campusImage.onload = () => {
            setTimeout(() => resetView(), 100);
            renderAllMarkers();
            if (loader) loader.style.display = 'none';
        };
        UI.campusImage.src = createPlaceholderImage();
    };
    
    UI.campusImage.src = pageState.imageSrc;
}

function createPlaceholderImage() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000">
        <rect fill="#f5f7fa" width="1400" height="1000"/>
        <!-- 主教学楼 -->
        <rect x="50" y="50" width="500" height="350" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="300" y="200" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">主教学楼</text>
        <text x="300" y="230" text-anchor="middle" fill="#94a3b8" font-size="14">1F-5F · 教室/办公室</text>
        <!-- 图书馆 -->
        <rect x="620" y="50" width="400" height="250" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="820" y="160" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">图书馆</text>
        <text x="820" y="190" text-anchor="middle" fill="#94a3b8" font-size="14">1F-3F · 阅览室/自习室</text>
        <!-- 体育场 -->
        <ellipse cx="750" cy="650" rx="300" ry="150" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/>
        <text x="750" y="650" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">体育场</text>
        <!-- 食堂 -->
        <rect x="50" y="480" width="300" height="200" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="200" y="570" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">食堂</text>
        <!-- 宿舍楼 -->
        <rect x="1100" y="50" width="250" height="500" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="1225" y="280" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">宿舍楼</text>
        <!-- 停车场 -->
        <rect x="50" y="730" width="400" height="150" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" rx="4" stroke-dasharray="10,5"/>
        <text x="250" y="810" text-anchor="middle" fill="#d97706" font-size="16">自行车停放区</text>
        <!-- 提示 -->
        <text x="700" y="900" text-anchor="middle" fill="#94a3b8" font-size="14">请上传园区平面图替换此占位图</text>
        <text x="700" y="930" text-anchor="middle" fill="#cbd5e1" font-size="12">右键点击可添加标记 · 滚轮缩放 · 左键拖动</text>
        <!-- 比例尺 -->
        <rect x="50" y="920" width="200" height="4" fill="#64748b"/>
        <text x="150" y="945" text-anchor="middle" fill="#64748b" font-size="12">≈ 200米</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function bindEvents() {
    const container = UI.mapContainer;
    if (!container) return;

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const oldScale = pageState.scale;
        pageState.scale += e.deltaY > 0 ? -0.15 : 0.15;
        pageState.scale = Math.max(pageState.minScale, Math.min(pageState.maxScale, pageState.scale));
        
        const scaleChange = pageState.scale / oldScale;
        pageState.translateX = mouseX - (mouseX - pageState.translateX) * scaleChange;
        pageState.translateY = mouseY - (mouseY - pageState.translateY) * scaleChange;
        
        updateTransform();
    });

    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.facility-marker')) return;
        pageState.isDragging = true;
        pageState.dragStartX = e.clientX;
        pageState.dragStartY = e.clientY;
        pageState.lastTranslateX = pageState.translateX;
        pageState.lastTranslateY = pageState.translateY;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!pageState.isDragging) return;
        pageState.translateX = pageState.lastTranslateX + (e.clientX - pageState.dragStartX);
        pageState.translateY = pageState.lastTranslateY + (e.clientY - pageState.dragStartY);
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        pageState.isDragging = false;
        if (UI.mapContainer) UI.mapContainer.style.cursor = 'grab';
    });

    // 搜索
    if (UI.searchInput) {
        UI.searchInput.addEventListener('input', (e) => {
            pageState.currentCategory = 'all';
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            const allBtn = document.querySelector('.category-btn[data-category="all"]');
            if (allBtn) allBtn.classList.add('active');
            filterMarkers(e.target.value);
        });
    }

    // 分类按钮
    if (UI.categoryTabs) {
        UI.categoryTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.category-btn');
            if (!btn) return;
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pageState.currentCategory = btn.dataset.category;
            if (UI.searchInput) UI.searchInput.value = '';
            filterMarkers();
        });
    }

    // 右键菜单
    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left - pageState.translateX) / pageState.scale;
        const y = (e.clientY - rect.top - pageState.translateY) / pageState.scale;
        showAddMarkerMenu(e.clientX, e.clientY, Math.round(x), Math.round(y));
    });

    // 键盘
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
        if (e.key === 'Delete' && pageState.selectedMarkerIndex >= 0) {
            deleteMarker(pageState.selectedMarkerIndex);
        }
    });
}

function updateTransform() {
    if (UI.imgWrapper) {
        UI.imgWrapper.style.transform = `translate(${pageState.translateX}px, ${pageState.translateY}px) scale(${pageState.scale})`;
    }
    updateMarkerPositions();
}

function updateMarkerPositions() {
    document.querySelectorAll('.facility-marker').forEach(el => {
        const idx = parseInt(el.dataset.index);
        const marker = pageState.markers[idx];
        if (marker) {
            el.style.left = (marker.x * pageState.scale) + 'px';
            el.style.top = (marker.y * pageState.scale) + 'px';
        }
    });
}

function resetView() {
    const container = UI.mapContainer;
    const img = UI.campusImage;
    
    if (!container || !img) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth || img.width || 1400;
    const imgHeight = img.naturalHeight || img.height || 1000;
    
    // 计算缩放比例，使图片适应容器
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    pageState.scale = Math.min(scaleX, scaleY, 1); // 最大不超过1
    
    // 居中显示
    pageState.translateX = (containerWidth - imgWidth * pageState.scale) / 2;
    pageState.translateY = (containerHeight - imgHeight * pageState.scale) / 2;
    
    updateTransform();
}

function renderAllMarkers() {
    if (!UI.markersLayer) return;
    
    UI.markersLayer.innerHTML = pageState.markers.map((m, i) => {
        const type = FACILITY_TYPES[m.type] || {};
        return `
            <div class="facility-marker ${m.type}"
                 style="left: ${m.x * pageState.scale}px; top: ${m.y * pageState.scale}px;"
                 data-index="${i}"
                 title="${m.name} (${type.name})">
                <i class="fas ${type.icon}"></i>
            </div>
        `;
    }).join('');

    UI.markersLayer.querySelectorAll('.facility-marker').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectMarker(parseInt(el.dataset.index));
        });
    });
}

function renderMarkerList() {
    const category = pageState.currentCategory;
    const searchText = (UI.searchInput?.value || '').toLowerCase();
    
    let filtered = pageState.markers;
    if (category !== 'all') {
        filtered = filtered.filter(m => m.type === category);
    }
    if (searchText) {
        filtered = filtered.filter(m => m.name.toLowerCase().includes(searchText));
    }
    
    if (UI.facilitiesList) {
        if (filtered.length === 0) {
            UI.facilitiesList.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-map-signs" style="font-size:36px;"></i><p>暂无设施</p></div>`;
        } else {
            UI.facilitiesList.innerHTML = filtered.map(m => {
                const type = FACILITY_TYPES[m.type] || {};
                const origIndex = pageState.markers.indexOf(m);
                return `
                    <div class="facility-card" onclick="selectMarker(${origIndex})">
                        <div class="facility-header">
                            <div class="facility-icon ${m.type}">
                                <i class="fas ${type.icon}"></i>
                            </div>
                            <div class="facility-info">
                                <div class="facility-name">${m.name}</div>
                                <div class="facility-location">${type.name} · (${m.x}, ${m.y})</div>
                            </div>
                            <button class="btn-icon" onclick="event.stopPropagation();deleteMarker(${origIndex})" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function selectMarker(index) {
    pageState.selectedMarkerIndex = index;
    const marker = pageState.markers[index];
    if (!marker) return;

    document.querySelectorAll('.facility-marker').forEach(el => el.classList.remove('selected'));
    const el = document.querySelector(`.facility-marker[data-index="${index}"]`);
    if (el) el.classList.add('selected');

    // 居中
    const rect = UI.mapContainer.getBoundingClientRect();
    pageState.translateX = rect.width / 2 - marker.x * pageState.scale;
    pageState.translateY = rect.height / 2 - marker.y * pageState.scale;
    updateTransform();

    showMarkerDetail(marker, index);
}

function showMarkerDetail(marker, index) {
    const type = FACILITY_TYPES[marker.type] || {};
    
    UI.modalTitle.textContent = marker.name;
    UI.modalBody.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
            <span class="facility-icon ${marker.type}" style="display:inline-flex;width:60px;height:60px;font-size:28px;">
                <i class="fas ${type.icon}"></i>
            </span>
        </div>
        <div class="detail-row" style="margin-bottom:12px;">
            <label style="font-size:12px;color:#888;">名称</label>
            <div id="detailName" contenteditable="true" style="padding:8px;border:1px solid #ddd;border-radius:4px;">${marker.name}</div>
        </div>
        <div class="detail-row" style="margin-bottom:12px;">
            <label style="font-size:12px;color:#888;">类型</label>
            <select id="detailType" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                ${Object.entries(FACILITY_TYPES).map(([k,v]) => `<option value="${k}" ${marker.type===k?'selected':''}>${v.name}</option>`).join('')}
            </select>
        </div>
        <div class="detail-row" style="margin-bottom:12px;">
            <label style="font-size:12px;color:#888;">坐标</label>
            <div style="padding:8px;background:#f5f5f5;border-radius:4px;font-family:monospace;">(${marker.x}, ${marker.y})</div>
        </div>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="saveMarkerDetail(${index})">
                <i class="fas fa-save"></i> 保存
            </button>
            <button class="btn btn-danger btn-sm" style="flex:1;" onclick="deleteMarker(${index})">
                <i class="fas fa-trash"></i> 删除
            </button>
        </div>
    `;
    
    UI.facilityModal.style.display = 'flex';
}

async function saveMarkerDetail(index) {
    const marker = pageState.markers[index];
    if (!marker) return;
    
    marker.name = document.getElementById('detailName').textContent.trim();
    marker.type = document.getElementById('detailType').value;
    
    await saveMarkers();
    closeModal();
    renderAllMarkers();
    renderMarkerList();
    updateStats();
    showToast('标记已保存到服务器', 'success');
}

async function deleteMarker(index) {
    if (!confirm('确定删除此标记？')) return;
    
    const marker = pageState.markers[index];
    pageState.markers.splice(index, 1);
    
    await saveMarkers();
    closeModal();
    renderAllMarkers();
    renderMarkerList();
    updateStats();
    showToast('标记已删除', 'info');
}

function showAddMarkerMenu(clientX, clientY, imgX, imgY) {
    const oldMenu = document.querySelector('.context-menu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position:fixed;left:${clientX}px;top:${clientY}px;background:white;
        border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:10000;
        padding:8px 0;min-width:180px;
    `;

    Object.entries(FACILITY_TYPES).forEach(([key, val]) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px;';
        item.innerHTML = `<span style="color:${val.color};width:20px;"><i class="fas ${val.icon}"></i></span>添加${val.name}`;
        item.onmouseenter = () => item.style.background = '#f0f4f8';
        item.onmouseleave = () => item.style.background = 'transparent';
        item.onclick = () => {
            addMarker(imgX, imgY, key);
            menu.remove();
        };
        menu.appendChild(item);
    });

    document.body.appendChild(menu);
    
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 100);
}

async function addMarker(x, y, type) {
    const typeConfig = FACILITY_TYPES[type];
    const name = prompt(`请输入${typeConfig.name}名称：`);
    if (!name) return;
    
    const marker = {
        id: Date.now(),
        name,
        type,
        x: Math.round(x),
        y: Math.round(y),
        note: '',
        createdAt: new Date().toISOString()
    };
    
    pageState.markers.push(marker);
    await saveMarkers();
    renderAllMarkers();
    renderMarkerList();
    updateStats();
    showToast(`已添加${typeConfig.name}: ${name}`, 'success');
}

function filterMarkers() {
    renderMarkerList();
}

function updateStats() {
    if (UI.totalCount) UI.totalCount.textContent = pageState.markers.length;
    if (UI.normalCount) UI.normalCount.textContent = pageState.markers.length;
    if (UI.maintenanceCount) UI.maintenanceCount.textContent = '0';
}

function resetView() {
    pageState.scale = 1;
    pageState.translateX = 0;
    pageState.translateY = 0;
    updateTransform();
}

async function loadMarkers() {
    try {
        const response = await fetch('/api/facility-markers');
        const result = await response.json();
        if (result.code === 0 && result.data) {
            pageState.markers = result.data;
        }
    } catch (e) {
        console.log('从服务器加载失败，使用空列表');
        pageState.markers = [];
    }
}

async function saveMarkers() {
    try {
        await fetch('/api/facility-markers/save-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markers: pageState.markers })
        });
    } catch (e) {
        console.error('保存失败:', e);
        showToast('保存失败，请检查服务器', 'error');
    }
}

function closeModal() {
    UI.facilityModal.style.display = 'none';
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed;top:20px;right:20px;z-index:9999;
        padding:12px 20px;border-radius:8px;color:white;
        background:${type==='success'?'#52c41a':type==='error'?'#ff4d4f':type==='warning'?'#faad14':'#1677ff'};
        box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:14px;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 全局函数
window.selectMarker = selectMarker;
window.deleteMarker = deleteMarker;
window.saveMarkerDetail = saveMarkerDetail;
window.zoomIn = () => { pageState.scale = Math.min(pageState.maxScale, pageState.scale + 0.2); updateTransform(); };
window.zoomOut = () => { pageState.scale = Math.max(pageState.minScale, pageState.scale - 0.2); updateTransform(); };
window.resetView = resetView;
window.closeModal = closeModal;
window.closeFacilityModal = closeModal;
window.navigateToFacility = () => showToast('导航功能开发中', 'info');
window.startFireDrill = () => showToast('消防演练模式已启动', 'warning');

document.addEventListener('DOMContentLoaded', initFacilities);