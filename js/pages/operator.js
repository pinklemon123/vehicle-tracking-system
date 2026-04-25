// js/pages/operator.js
// 使用 /api/operator 的模拟数据绘制图表并显示统计/告警
const OP_BASE = '/api/operator';
let opCharts = { main: null, usage: null, flow: null, energy: null };

function initCharts() {
  const mainDom = document.getElementById('main-charts');
  if (mainDom) {
    opCharts.main = echarts.init(mainDom);
    opCharts.main.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['人数','车辆','告警'], bottom: 0 },
      grid: { left: '6%', right: '6%', top: '10%', bottom: '12%' },
      xAxis: { type: 'category', data: [] },
      yAxis: [{ type: 'value', name: '人数/车辆' }, { type: 'value', name: '告警数' }],
      series: [
        { name: '人数', type: 'line', smooth: true, data: [], lineStyle:{color:'#3b82f6'} },
        { name: '车辆', type: 'line', smooth: true, data: [], lineStyle:{color:'#10b981'} },
        { name: '告警', type: 'bar', data: [], yAxisIndex: 1, itemStyle:{color:'#ef4444'} }
      ]
    });
  }

  const u = document.getElementById('chart-usage');
  if (u) {
    opCharts.usage = echarts.init(u);
    opCharts.usage.setOption({ xAxis:{show:false}, yAxis:{show:false}, series:[{type:'line', data:[], areaStyle:{opacity:0.2}}] });
  }
  const f = document.getElementById('chart-flow');
  if (f) {
    opCharts.flow = echarts.init(f);
    opCharts.flow.setOption({ xAxis:{show:false}, yAxis:{show:false}, series:[{type:'line', data:[], areaStyle:{opacity:0.2}}] });
  }
  const e = document.getElementById('chart-energy');
  if (e) {
    opCharts.energy = echarts.init(e);
    opCharts.energy.setOption({ xAxis:{show:false}, yAxis:{show:false}, series:[{type:'line', data:[], areaStyle:{opacity:0.2}}] });
  }
}

async function loadOperatorStats() {
  try {
    const r = await fetch(`${OP_BASE}/stats`);
    const j = await r.json();
    if (j.success && j.data) {
      const d = j.data;
      document.getElementById('stat-people').innerText = d.people ?? '—';
      document.getElementById('stat-vehicles').innerText = d.vehicles ?? '—';
      document.getElementById('stat-alarms').innerText = d.alarms ?? 0;
      document.getElementById('stat-health').innerText = d.health || '正常';
    }
  } catch (e) { console.warn('loadOperatorStats', e); }
}

async function loadOperatorTrends() {
  try {
    const r = await fetch(`${OP_BASE}/trends`);
    const j = await r.json();
    if (j.success && Array.isArray(j.data)) {
      const trends = j.data;
      const dates = trends.map(t=>t.date);
      const people = trends.map(t=>t.people);
      const vehicles = trends.map(t=>t.vehicles);
      const alarms = trends.map(t=>t.alarms);

      if (opCharts.main) {
        opCharts.main.setOption({ xAxis:{data:dates}, series:[{name:'人数', data:people},{name:'车辆', data:vehicles},{name:'告警', data:alarms}] });
      }
      if (opCharts.usage) opCharts.usage.setOption({ series:[{data: trends.map(t=>Math.round((t.utilization||0)*100))}] });
      if (opCharts.flow) opCharts.flow.setOption({ series:[{data: trends.map(t=>t.people)}] });
      if (opCharts.energy) opCharts.energy.setOption({ series:[{data: trends.map(t=>t.energy)}] });
    }
  } catch(e){ console.warn('loadOperatorTrends', e); }
}

async function loadOperatorAlarms(){
  try{
    const r = await fetch(`${OP_BASE}/alarms`);
    const j = await r.json();
    if (j.success && Array.isArray(j.data)) {
      const container = document.getElementById('alarms');
      container.innerHTML = '';
      j.data.forEach(a=>{
        const el = document.createElement('div');
        el.className = 'p-3 bg-slate-50 rounded border border-slate-100';
        el.innerHTML = `<div class="flex justify-between"><div><div class="font-semibold">${a.type || a.message}</div><div class="text-xs text-slate-400">${a.location || ''}</div></div><div>${a.status!=='acknowledged'? '<span class="text-xs alarm-unack">未确认</span>':'<span class="text-xs text-green-600">已确认</span>'}</div></div>`;
        container.appendChild(el);
      });
    }
  }catch(e){ console.warn('loadOperatorAlarms', e); }
}

function initOperatorPage(){
  initCharts();
  document.getElementById('refreshAlarms').addEventListener('click', loadOperatorAlarms);
  document.getElementById('ackAll').addEventListener('click', async ()=>{ await fetch(`${OP_BASE}/alarms/acknowledge`, { method: 'POST' }).catch(()=>{}); loadOperatorAlarms(); loadOperatorStats(); });
  document.getElementById('btnPingAI').addEventListener('click', async ()=>{
    try{ const r = await fetch(`${OP_BASE}/ai/check`, { method:'POST' }); const j = await r.json(); document.getElementById('op-result').innerText = j.success? `AI: ${j.data.status} (${j.data.model})` : 'AI 响应异常'; }catch(e){ document.getElementById('op-result').innerText = 'AI 请求失败'; }
  });
  document.getElementById('btnSnapshot').addEventListener('click', async ()=>{
    document.getElementById('op-result').innerText = '抓取并检测...';
    try{ const snap = await fetch(`${OP_BASE}/parking/snapshot`).then(r=>r.json()); const r2 = await fetch('/api/ai/detect_parking',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({parking_snapshot: snap.data||[]})}); const j = await r2.json(); document.getElementById('op-result').innerText = j.success? '检测完成' : (j.message||'检测失败'); loadOperatorAlarms(); loadOperatorStats(); }catch(e){ document.getElementById('op-result').innerText = '请求失败'; }
  });

  // 首次加载
  loadOperatorStats(); loadOperatorTrends(); loadOperatorAlarms();
  // 定时刷新
  setInterval(()=>{ loadOperatorStats(); loadOperatorTrends(); }, 8_000);
  setInterval(loadOperatorAlarms, 15_000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOperatorPage);
else initOperatorPage();
