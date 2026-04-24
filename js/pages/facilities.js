/**
 * 公共设施检索 - 完整版
 */

const state = {
    scale: 1,
    minScale: 0.3,
    maxScale: 5,
    tx: 0, ty: 0,
    dragging: false,
    startX: 0, startY: 0,
    lastTx: 0, lastTy: 0,
    markers: [],
    category: 'all',
    selectedIdx: -1,
    imgW: 0, imgH: 0
};

const TYPES = {
    toilet: { n: '卫生间', i: 'fa-restroom', c: '#ff4d4f' },
    water: { n: '饮水点', i: 'fa-water', c: '#1677ff' },
    elevator: { n: '电梯', i: 'fa-arrow-up', c: '#722ed1' },
    medical: { n: '医疗点', i: 'fa-hospital', c: '#52c41a' },
    bike: { n: '自行车停放', i: 'fa-bicycle', c: '#faad14' },
    classroom: { n: '教室', i: 'fa-chalkboard', c: '#eb6f20' },
    office: { n: '办公室', i: 'fa-building', c: '#666' },
    shop: { n: '商店', i: 'fa-store', c: '#13c2c2' },
    stairs: { n: '楼梯', i: 'fa-stairs', c: '#8c8c8c' },
    exit: { n: '出口', i: 'fa-door-open', c: '#f5222d' }
};

const $ = id => document.getElementById(id);
const container = () => $('mapContainer');
const img = () => $('campusImage');
const layer = () => $('markersLayer');

// ============ 初始化 ============
async function init() {
    await loadMarkers();
    
    img().onload = () => {
        state.imgW = img().naturalWidth;
        state.imgH = img().naturalHeight;
        fitScreen();
        renderMarkers();
    };
    
    img().onerror = () => {
        state.imgW = 1400; state.imgH = 1000;
        img().src = placeholderSVG();
    };
    
    img().src = 'assets/images/campus-map.jpg';
    
    bindEvents();
    updateStats();
    renderList();
}

function placeholderSVG() {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000">
        <rect fill="#f0f4f8" width="1400" height="1000"/>
        <rect x="50" y="50" width="500" height="350" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="300" y="220" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">主教学楼</text>
        <rect x="620" y="50" width="400" height="250" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="820" y="170" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">图书馆</text>
        <ellipse cx="750" cy="650" rx="300" ry="150" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/>
        <text x="750" y="650" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">体育场</text>
        <rect x="50" y="480" width="300" height="200" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="200" y="580" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">食堂</text>
        <rect x="1100" y="50" width="250" height="500" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3" rx="8"/>
        <text x="1225" y="300" text-anchor="middle" fill="#64748b" font-size="20" font-weight="bold">宿舍楼</text>
        <rect x="50" y="730" width="400" height="150" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" rx="4" stroke-dasharray="10,5"/>
        <text x="250" y="810" text-anchor="middle" fill="#d97706" font-size="16">自行车停放区</text>
        <text x="700" y="920" text-anchor="middle" fill="#94a3b8" font-size="14">右键点击添加标记 · 滚轮缩放 · 左键拖动</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(s);
}

// ============ 视图 ============
function updateTransform() {
    const t = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
    if (img()) img().style.transform = t;
    if (layer()) layer().style.transform = t;
}

function fitScreen() {
    const c = container();
    if (!c) return;
    const cw = c.clientWidth, ch = c.clientHeight;
    const s = Math.min(cw / state.imgW, ch / state.imgH, 1);
    state.scale = s;
    state.tx = (cw - state.imgW * s) / 2;
    state.ty = (ch - state.imgH * s) / 2;
    updateTransform();
}

function resetView() { fitScreen(); }

// marker positions are set in pixels (raw coordinates); the markersLayer receives the
// same transform as the image so markers scale/translate automatically.


// ============ 标记渲染 ============
function renderMarkers() {
    if (!layer()) return;
    layer().innerHTML = state.markers.map((m, i) => {
        const t = TYPES[m.type] || {};
        return `<div class="facility-marker ${m.type}" style="left:${m.x}px;top:${m.y}px;" data-index="${i}" title="${m.name}">
            <i class="fas ${t.i}"></i>
        </div>`;
    }).join('');
    layer().querySelectorAll('.facility-marker').forEach(el => {
        el.addEventListener('click', e => { e.stopPropagation(); selectMarker(+el.dataset.index); });
    });
}

function renderList() {
    const list = $('facilitiesList');
    if (!list) return;
    let filtered = state.markers;
    if (state.category !== 'all') filtered = filtered.filter(m => m.type === state.category);
    const kw = ($('searchInput')?.value || '').toLowerCase();
    if (kw) filtered = filtered.filter(m => m.name.toLowerCase().includes(kw));
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-map-signs"></i><p>暂无设施</p></div>';
    } else {
        list.innerHTML = filtered.map(m => {
            const t = TYPES[m.type] || {};
            const idx = state.markers.indexOf(m);
            return `<div class="facility-card" onclick="selectMarker(${idx})">
                <div class="facility-header">
                    <div class="facility-icon ${m.type}"><i class="fas ${t.i}"></i></div>
                    <div class="facility-info"><div class="facility-name">${m.name}</div><div class="facility-location">${t.n} · (${m.x},${m.y})</div></div>
                    <button class="btn-icon" onclick="event.stopPropagation();deleteMarker(${idx})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }
}

function updateStats() {
    if ($('totalCount')) $('totalCount').textContent = state.markers.length;
    if ($('normalCount')) $('normalCount').textContent = state.markers.length;
    if ($('maintenanceCount')) $('maintenanceCount').textContent = '0';
}

// ============ 标记操作 ============
function selectMarker(idx) {
    state.selectedIdx = idx;
    const m = state.markers[idx];
    if (!m) return;
    
    document.querySelectorAll('.facility-marker').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.facility-marker[data-index="${idx}"]`)?.classList.add('selected');
    
    const r = container().getBoundingClientRect();
    state.tx = r.width / 2 - m.x * state.scale;
    state.ty = r.height / 2 - m.y * state.scale;
    updateTransform();
    
    const t = TYPES[m.type] || {};
    $('modalTitle').textContent = m.name;
    $('modalBody').innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
            <div class="facility-icon large ${m.type}" style="display:inline-flex;width:56px;height:56px;font-size:24px;"><i class="fas ${t.i}"></i></div>
        </div>
        <div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">名称</label>
            <div id="editName" contenteditable="true" style="padding:8px;border:1px solid #ddd;border-radius:6px;">${m.name}</div></div>
        <div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">类型</label>
            <select id="editType" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                ${Object.entries(TYPES).map(([k,v]) => `<option value="${k}" ${m.type===k?'selected':''}>${v.n}</option>`).join('')}
            </select></div>
        <div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">坐标</label>
            <div style="padding:8px;background:#f5f5f5;border-radius:6px;font-family:monospace;">(${m.x}, ${m.y})</div></div>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="saveMarker(${idx})"><i class="fas fa-save"></i> 保存</button>
            <button class="btn btn-danger btn-sm" style="flex:1;" onclick="deleteMarker(${idx})"><i class="fas fa-trash"></i> 删除</button>
        </div>`;
    $('facilityModal').style.display = 'flex';
}

async function saveMarker(idx) {
    const m = state.markers[idx];
    if (!m) return;
    m.name = $('editName').textContent.trim();
    m.type = $('editType').value;
    await saveMarkers();
    closeModal();
    renderMarkers();
    renderList();
    updateStats();
    toast('标记已保存', 'success');
}

async function deleteMarker(idx) {
    if (!confirm('确定删除？')) return;
    state.markers.splice(idx, 1);
    await saveMarkers();
    closeModal();
    renderMarkers();
    renderList();
    updateStats();
    toast('已删除', 'info');
}

async function addMarker(x, y, type) {
    const t = TYPES[type];
    const name = prompt(`请输入${t.n}名称：`);
    if (!name) return;
    state.markers.push({ id: Date.now(), name, type, x: Math.round(x), y: Math.round(y), note: '', createdAt: new Date().toISOString() });
    await saveMarkers();
    renderMarkers();
    renderList();
    updateStats();
    toast(`已添加${t.n}: ${name}`, 'success');
}

// ============ 数据存储 ============
async function loadMarkers() {
    try {
        const res = await fetch('/api/facility-markers');
        const data = await res.json();
        if (data.code === 0 && data.data) state.markers = data.data;
    } catch (e) { state.markers = []; }
}

async function saveMarkers() {
    try {
        await fetch('/api/facility-markers/save-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markers: state.markers })
        });
    } catch (e) { toast('保存失败', 'error'); }
}

// ============ 事件 ============
function bindEvents() {
    const c = container();
    
    c.addEventListener('wheel', e => {
        e.preventDefault();
        const r = c.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        const old = state.scale;
        state.scale += e.deltaY > 0 ? -0.15 : 0.15;
        state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale));
        const ratio = state.scale / old;
        state.tx = mx - (mx - state.tx) * ratio;
        state.ty = my - (my - state.ty) * ratio;
        updateTransform();
    });
    
    c.addEventListener('mousedown', e => {
        if (e.target.closest('.facility-marker')) return;
        state.dragging = true;
        state.startX = e.clientX; state.startY = e.clientY;
        state.lastTx = state.tx; state.lastTy = state.ty;
        c.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mousemove', e => {
        if (!state.dragging) return;
        state.tx = state.lastTx + (e.clientX - state.startX);
        state.ty = state.lastTy + (e.clientY - state.startY);
        updateTransform();
    });
    
    window.addEventListener('mouseup', () => { state.dragging = false; c.style.cursor = 'grab'; });
    
    c.addEventListener('contextmenu', e => {
        e.preventDefault();
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left - state.tx) / state.scale;
        const y = (e.clientY - r.top - state.ty) / state.scale;
        showMenu(e.clientX, e.clientY, Math.round(x), Math.round(y));
    });
    
    $('searchInput')?.addEventListener('input', e => {
        state.category = 'all';
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.category-btn[data-category="all"]')?.classList.add('active');
        renderList();
    });
    
    document.querySelector('.category-tabs')?.addEventListener('click', e => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.category = btn.dataset.category;
        if ($('searchInput')) $('searchInput').value = '';
        renderList();
    });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

function showMenu(cx, cy, imgX, imgY) {
    document.querySelector('.context-menu')?.remove();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:9999;padding:6px 0;min-width:170px;`;
    Object.entries(TYPES).forEach(([k,v]) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:9px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;';
        item.innerHTML = `<span style="color:${v.c};width:18px;text-align:center;"><i class="fas ${v.i}"></i></span>添加${v.n}`;
        item.onmouseenter = () => item.style.background = '#f5f7fa';
        item.onmouseleave = () => item.style.background = '';
        item.onclick = () => { addMarker(imgX, imgY, k); menu.remove(); };
        menu.appendChild(item);
    });
    document.body.appendChild(menu);
    const closeFn = e => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeFn); } };
    setTimeout(() => document.addEventListener('click', closeFn), 100);
}

// ============ 工具 ============
function closeModal() { $('facilityModal').style.display = 'none'; }
function toast(msg, type) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:10px 18px;border-radius:8px;color:white;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);background:${type==='success'?'#52c41a':type==='error'?'#ff4d4f':'#1677ff'};`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// ============ 全局函数 ============
window.selectMarker = selectMarker;
window.deleteMarker = deleteMarker;
window.saveMarker = saveMarker;
window.zoomIn = () => { state.scale = Math.min(state.maxScale, state.scale + 0.2); updateTransform(); };
window.zoomOut = () => { state.scale = Math.max(state.minScale, state.scale - 0.2); updateTransform(); };
window.resetView = resetView;
window.closeFacilityModal = closeModal;
window.navigateToFacility = () => toast('导航功能开发中', 'info');
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', init);