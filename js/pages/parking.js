/**
 * Operator overview page logic.
 * Loads mock operator metrics, renders charts, manages alarms, and triggers AI parking checks.
 */

const API_BASE = '/api/operator';

let refreshInterval = null;
let aiChatHistory = [];
const charts = {
    mainChart: null,
    usageChart: null,
    flowChart: null,
    energyChart: null
};

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderDate();
    initCharts();
    bindEventListeners();
    loadAllData();
    startAutoRefresh();
});

function updateHeaderDate() {
    const dateElement = document.getElementById('current-date');
    if (!dateElement) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateElement.textContent = `${year}年${month}月${day}日`;
}

function initCharts() {
    if (typeof echarts === 'undefined') {
        showOperationResult('图表库加载失败', 'warning');
        return;
    }

    const mainChartDom = document.getElementById('main-chart');
    if (mainChartDom) {
        charts.mainChart = echarts.init(mainChartDom);
        charts.mainChart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['入园人数', '入园车辆', '告警数'], bottom: 0 },
            grid: { left: '8%', right: '5%', top: '10%', bottom: '14%', containLabel: true },
            xAxis: { type: 'category', data: [] },
            yAxis: [
                { type: 'value', name: '人数/车辆' },
                { type: 'value', name: '告警数' }
            ],
            series: [
                { name: '入园人数', type: 'line', smooth: true, data: [], lineStyle: { color: '#3b82f6', width: 2 }, symbol: 'circle', symbolSize: 6 },
                { name: '入园车辆', type: 'line', smooth: true, data: [], lineStyle: { color: '#10b981', width: 2 }, symbol: 'diamond', symbolSize: 6 },
                { name: '告警数', type: 'bar', data: [], yAxisIndex: 1, itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] } }
            ]
        });
    }

    charts.usageChart = initMiniChart('chart-usage', '#3b82f6', 100);
    charts.flowChart = initMiniChart('chart-flow', '#f59e0b');
    charts.energyChart = initMiniChart('chart-energy', '#8b5cf6');
}

function initMiniChart(id, color, maxValue) {
    const element = document.getElementById(id);
    if (!element || typeof echarts === 'undefined') return null;

    const chart = echarts.init(element);
    chart.setOption({
        tooltip: { show: false },
        grid: { show: false, left: 0, right: 0, top: 5, bottom: 0 },
        xAxis: { show: false, data: [] },
        yAxis: { show: false, min: 0, max: maxValue },
        series: [{
            type: 'line',
            smooth: true,
            data: [],
            lineStyle: { color, width: 2 },
            areaStyle: { opacity: 0.2, color },
            symbol: 'none'
        }]
    });
    return chart;
}

async function loadAllData() {
    await Promise.all([
        loadStatsData(),
        loadTrendsData(),
        loadAlarmsData()
    ]);
}

async function loadStatsData() {
    try {
        const result = await fetchJson(`${API_BASE}/stats`);
        if (!result.success || !result.data) return;

        const stats = result.data;
        setText('stat-people', formatNumber(stats.people));
        setText('stat-vehicles', formatNumber(stats.vehicles));
        setText('stat-alarms', stats.alarms ?? 0);
        setText('stat-health', stats.health || '正常');

        const healthElement = document.getElementById('stat-health');
        if (healthElement) {
            healthElement.className = stats.health === '注意'
                ? 'text-2xl font-bold text-orange-600'
                : 'text-2xl font-bold text-green-600';
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
        showOperationResult('统计数据加载失败', 'error');
    }
}

async function loadTrendsData() {
    try {
        const result = await fetchJson(`${API_BASE}/trends`);
        if (result.success && Array.isArray(result.data)) {
            updateChartsData(result.data);
        }
    } catch (error) {
        console.error('加载趋势数据失败:', error);
    }
}

async function loadAlarmsData() {
    try {
        const result = await fetchJson(`${API_BASE}/alarms`);
        if (result.success && Array.isArray(result.data)) {
            renderAlarms(result.data);
        }
    } catch (error) {
        console.error('加载告警数据失败:', error);
        const alarmsContainer = document.getElementById('alarms-list');
        if (alarmsContainer) {
            alarmsContainer.innerHTML = '<div class="text-center text-red-500 text-sm">加载告警失败</div>';
        }
    }
}

function renderAlarms(alarms) {
    const container = document.getElementById('alarms-list');
    if (!container) return;

    if (!alarms.length) {
        container.innerHTML = '<div class="text-center text-slate-400 text-sm py-8">暂无告警</div>';
        return;
    }

    container.innerHTML = alarms.map((alarm) => {
        const levelClass = getAlarmLevelClass(alarm.level, alarm.status);
        const levelLabel = getAlarmLevelLabel(alarm.level);
        const status = alarm.status === 'acknowledged'
            ? '<span class="text-[10px] text-green-500">已确认</span>'
            : '<span class="text-[10px] text-red-500 animate-pulse">未处理</span>';

        return `
            <div class="alarm-item p-3 rounded-lg ${levelClass} bg-white border border-slate-100">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] rounded bg-white/70 px-1.5 py-0.5">${levelLabel}</span>
                            <span class="text-xs font-semibold">${escapeHtml(alarm.type || alarm.message || '告警')}</span>
                            <span class="text-[10px] text-slate-400">${escapeHtml(alarm.time || '')}</span>
                        </div>
                        <div class="text-xs text-slate-600">${escapeHtml(alarm.location || '')}</div>
                    </div>
                    ${status}
                </div>
            </div>
        `;
    }).join('');
}

function getAlarmLevelClass(level, status) {
    let levelClass = 'alarm-info';
    if (level === 'critical') levelClass = 'alarm-critical';
    if (level === 'warning') levelClass = 'alarm-warning';
    if (status === 'acknowledged') levelClass += ' alarm-acknowledged';
    return levelClass;
}

function getAlarmLevelLabel(level) {
    if (level === 'critical') return '严重';
    if (level === 'warning') return '预警';
    return '提示';
}

async function acknowledgeAllAlarms() {
    try {
        showOperationResult('确认中...', 'info');
        const result = await fetchJson(`${API_BASE}/alarms/acknowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (result.success) {
            showOperationResult('所有告警已确认', 'success');
            await loadAlarmsData();
            await loadStatsData();
        } else {
            showOperationResult(`确认失败: ${result.error || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('确认告警失败:', error);
        showOperationResult('请求失败', 'error');
    }
}

async function checkAIConnection() {
    try {
        showOperationResult('检测 AI 服务中...', 'info');
        const result = await fetchJson(`${API_BASE}/ai/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (result.success && result.data) {
            showOperationResult(`AI 服务正常，延迟 ${result.data.latency}`, 'success');
        } else {
            showOperationResult('AI 服务响应异常', 'warning');
        }
    } catch (error) {
        console.error('AI 检测失败:', error);
        showOperationResult('AI 服务不可用', 'error');
    }
}

async function refreshAllData() {
    try {
        showOperationResult('刷新数据中...', 'info');
        const result = await fetchJson(`${API_BASE}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (result.success) {
            showOperationResult('数据已刷新', 'success');
            await loadAllData();
        } else {
            showOperationResult('刷新失败', 'error');
        }
    } catch (error) {
        console.error('刷新数据失败:', error);
        showOperationResult('刷新请求失败', 'error');
    }
}

async function runAIDetectAndShowDialog() {
    const dialog = document.getElementById('ai-dialog');
    const resultsContainer = document.getElementById('ai-results');
    if (!dialog || !resultsContainer) return;

    showOperationResult('正在请求 AI 检测...', 'info');
    resultsContainer.innerHTML = '<div class="text-sm text-slate-500">检测中...</div>';

    try {
        const snapshotResult = await fetchJson(`${API_BASE}/parking/snapshot`);
        const snapshot = snapshotResult.success && snapshotResult.data ? snapshotResult.data : [];

        const result = await fetchJson('/api/ai/detect_parking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parking_snapshot: snapshot })
        });

        renderAIResult(resultsContainer, result);
        dialog.classList.remove('hidden');
        dialog.classList.add('flex');
        showOperationResult('AI 检测完成', 'success');

        await loadAlarmsData();
        await loadStatsData();
    } catch (error) {
        console.error('AI 检测请求失败:', error);
        resultsContainer.innerHTML = `<div class="text-red-500">请求失败: ${escapeHtml(error.message || String(error))}</div>`;
        dialog.classList.remove('hidden');
        dialog.classList.add('flex');
        showOperationResult('AI 请求失败', 'error');
    }
}

function renderAIResult(container, result) {
    const data = result.data || result;
    const aiData = data.ai || data;
    const violations = Array.isArray(aiData.violations) ? aiData.violations : [];

    if (!result.success && result.code !== 0) {
        container.innerHTML = `<div class="text-red-500">AI 返回错误: ${escapeHtml(result.message || JSON.stringify(result))}</div>`;
        return;
    }

    if (violations.length) {
        container.innerHTML = violations.map((item) => `
            <div class="p-3 border rounded alarm-warning bg-yellow-50">
                <div class="font-semibold">${escapeHtml(item.spot_id || item.spot || '未知车位')}</div>
                <div class="text-sm text-slate-600">${escapeHtml(item.reason || JSON.stringify(item))}</div>
                <div class="text-xs text-slate-400">置信度: ${escapeHtml(String(item.confidence ?? 'N/A'))}</div>
            </div>
        `).join('');
        return;
    }

    if (aiData.summary) {
        container.innerHTML = `<div class="text-sm text-slate-700">${escapeHtml(aiData.summary)}</div>`;
        return;
    }

    container.innerHTML = '<div class="text-sm text-green-600">未检测到明显违规停车。</div>';
}

function showOperationResult(message, type = 'info') {
    const resultDiv = document.getElementById('operation-result');
    if (!resultDiv) return;

    let colorClass = 'text-slate-500';
    if (type === 'success') colorClass = 'text-green-600';
    if (type === 'error') colorClass = 'text-red-600';
    if (type === 'warning') colorClass = 'text-orange-600';
    if (type === 'info') colorClass = 'text-blue-600';

    resultDiv.innerHTML = `<span class="${colorClass} flex items-center gap-1">${escapeHtml(message)}</span>`;

    window.setTimeout(() => {
        if (resultDiv.textContent === message) {
            resultDiv.innerHTML = '';
        }
    }, 3000);
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshDataSilently, 5000);
}

async function refreshDataSilently() {
    try {
        const [stats, trends, alarms] = await Promise.all([
            fetchJson(`${API_BASE}/stats`),
            fetchJson(`${API_BASE}/trends`),
            fetchJson(`${API_BASE}/alarms`)
        ]);

        if (stats.success && stats.data) {
            setText('stat-people', formatNumber(stats.data.people));
            setText('stat-vehicles', formatNumber(stats.data.vehicles));
            setText('stat-alarms', stats.data.alarms ?? 0);
        }

        if (trends.success && Array.isArray(trends.data)) {
            updateChartsData(trends.data);
        }

        if (alarms.success && Array.isArray(alarms.data)) {
            renderAlarms(alarms.data);
        }
    } catch (error) {
        console.error('静默刷新失败:', error);
    }
}

function updateChartsData(trends) {
    if (!Array.isArray(trends) || !trends.length) return;

    const dates = trends.map((item) => item.date);
    const peopleData = trends.map((item) => item.people);
    const vehiclesData = trends.map((item) => item.vehicles);
    const alarmsData = trends.map((item) => item.alarms);

    if (charts.mainChart) {
        charts.mainChart.setOption({
            xAxis: { data: dates },
            series: [
                { name: '入园人数', data: peopleData },
                { name: '入园车辆', data: vehiclesData },
                { name: '告警数', data: alarmsData }
            ]
        });
    }

    if (charts.usageChart) {
        charts.usageChart.setOption({
            xAxis: { data: dates },
            series: [{ data: trends.map((item) => Math.round((item.utilization || 0) * 100)) }]
        });
    }

    if (charts.flowChart) {
        charts.flowChart.setOption({
            xAxis: { data: dates },
            series: [{ data: trends.map((item) => Math.round((item.people || 0) / 25)) }]
        });
    }

    if (charts.energyChart) {
        charts.energyChart.setOption({
            xAxis: { data: dates },
            series: [{ data: trends.map((item) => item.energy || 0) }]
        });
    }
}

function bindEventListeners() {
    document.getElementById('refresh-alarms')?.addEventListener('click', loadAlarmsData);
    document.getElementById('ack-all-alarms')?.addEventListener('click', acknowledgeAllAlarms);
    document.getElementById('check-ai')?.addEventListener('click', checkAIConnection);
    document.getElementById('refresh-data')?.addEventListener('click', refreshAllData);
    document.getElementById('run-ai-detect')?.addEventListener('click', runAIDetectAndShowDialog);
    document.getElementById('ai-chat-toggle')?.addEventListener('click', openAIChat);
    document.getElementById('ai-chat-close')?.addEventListener('click', closeAIChat);
    document.getElementById('ai-chat-send')?.addEventListener('click', sendAIChatMessage);

    const chatInput = document.getElementById('ai-chat-input');
    chatInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendAIChatMessage();
        }
    });

    const dialog = document.getElementById('ai-dialog');
    document.getElementById('ai-close')?.addEventListener('click', () => closeDialog(dialog));
    dialog?.addEventListener('click', (event) => {
        if (event.target === dialog) closeDialog(dialog);
    });
}

function openAIChat() {
    document.getElementById('ai-chat-panel')?.classList.remove('hidden');
    document.getElementById('ai-chat-input')?.focus();
}

function closeAIChat() {
    document.getElementById('ai-chat-panel')?.classList.add('hidden');
}

async function sendAIChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const message = input?.value.trim();
    if (!message) return;

    input.value = '';
    appendAIChatMessage('user', message);
    const pending = appendAIChatMessage('assistant', '正在思考...');

    aiChatHistory.push({ role: 'user', content: message });
    aiChatHistory = aiChatHistory.slice(-8);

    try {
        const result = await fetchJson('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: buildAIChatMessages(),
                context: await buildAIChatContext()
            })
        });

        const answer = extractAIText(result);
        pending.textContent = answer || 'AI 没有返回可读内容。';
        aiChatHistory.push({ role: 'assistant', content: pending.textContent });
        aiChatHistory = aiChatHistory.slice(-8);
    } catch (error) {
        pending.textContent = `请求失败: ${error.message || error}`;
        pending.classList.add('text-red-600');
    }
}

function buildAIChatMessages() {
    return [
        {
            role: 'system',
            content: '你是智慧园区停车运营助手。回答要简洁、可执行，优先结合停车、告警、车位利用率、运营指标给出判断和建议。'
        },
        ...aiChatHistory
    ];
}

async function buildAIChatContext() {
    try {
        const [stats, alarms, snapshot] = await Promise.all([
            fetchJson(`${API_BASE}/stats`).catch(() => null),
            fetchJson(`${API_BASE}/alarms`).catch(() => null),
            fetchJson(`${API_BASE}/parking/snapshot`).catch(() => null)
        ]);

        return {
            current_stats: stats?.data || null,
            recent_alarms: alarms?.data || [],
            parking_snapshot_sample: Array.isArray(snapshot?.data) ? snapshot.data.slice(0, 30) : []
        };
    } catch {
        return {};
    }
}

function appendAIChatMessage(role, text) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return document.createElement('div');

    const row = document.createElement('div');
    row.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';

    const bubble = document.createElement('div');
    bubble.className = role === 'user'
        ? 'max-w-[86%] whitespace-pre-wrap rounded-lg bg-blue-600 px-3 py-2 text-sm text-white'
        : 'max-w-[86%] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700';
    bubble.textContent = text;

    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

function extractAIText(result) {
    const payload = result?.data || result;
    if (payload?.error) {
        return payload.error;
    }

    const choice = payload?.choices?.[0];
    if (choice?.message?.content) {
        return choice.message.content;
    }
    if (choice?.text) {
        return choice.text;
    }
    if (payload?.content) {
        return payload.content;
    }
    if (typeof payload === 'string') {
        return payload;
    }

    return JSON.stringify(payload, null, 2);
}

function closeDialog(dialog) {
    if (!dialog) return;
    dialog.classList.add('hidden');
    dialog.classList.remove('flex');
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    return data;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '0';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);

    Object.values(charts).forEach((chart) => {
        if (chart && typeof chart.dispose === 'function') {
            chart.dispose();
        }
    });
});
