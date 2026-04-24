// js/pages/operator.js
// Client logic for operator.html: fetch stats, alarms, AI ping and snapshot trigger
async function fetchStats() {
  try {
    const r = await fetch('/api/statistics');
    const j = await r.json();
    const d = j.data || {};
    document.getElementById('stat-people').innerText = d.people_estimate || '—';
    document.getElementById('stat-vehicles').innerText = d.vehicles_count || '—';
    document.getElementById('stat-alarms').innerText = d.alarms_total ?? '—';
  } catch(e){ console.warn(e) }
}

async function fetchAlarms(){
  try{
    const r = await fetch('/api/alarms?limit=20');
    const j = await r.json();
    const list = j.data || [];
    const container = document.getElementById('alarms');
    container.innerHTML = '';
    list.forEach(a=>{
      const el = document.createElement('div');
      el.className = 'p-3 bg-slate-50 rounded border border-slate-100';
      el.innerHTML = `<div class=\"flex justify-between\"><div><div class=\"font-semibold\">${a.message}</div><div class=\"text-xs text-slate-400\">${a.type} · ${a.level}</div></div><div><button class=\"ack-btn text-sm text-blue-600\" data-id=\"${a.id}\">确认</button></div></div>`;
      container.appendChild(el);
    });
    document.querySelectorAll('.ack-btn').forEach(b=>b.addEventListener('click', async (ev)=>{
      const id = ev.target.dataset.id;
      await fetch(`/api/alarms/${id}/acknowledge`, { method: 'PUT' });
      fetchAlarms(); fetchStats();
    }));
  }catch(e){console.warn(e)}
}

function initOperatorPage(){
  document.getElementById('refreshAlarms').addEventListener('click', ()=>fetchAlarms());
  document.getElementById('ackAll').addEventListener('click', async ()=>{ await fetch('/api/alarms/acknowledge-all', { method: 'PUT' }); fetchAlarms(); fetchStats(); });
  document.getElementById('btnPingAI').addEventListener('click', async ()=>{
    const r = await fetch('/api/ai/ping');
    const j = await r.json();
    document.getElementById('op-result').innerText = j.code===0? 'AI 通畅' : ('AI 错误: '+(j.message||'未知'));
  });
  document.getElementById('btnSnapshot').addEventListener('click', async ()=>{
    document.getElementById('op-result').innerText = '正在抓取并检测...';
    try{
      const dummy = { timestamp: Date.now(), spots: [] };
      const r = await fetch('/api/ai/detect_parking', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ parking_snapshot: dummy })});
      const j = await r.json();
      document.getElementById('op-result').innerText = j.code===0? '检测完成' : ('检测失败: '+(j.message||''));
      fetchAlarms(); fetchStats();
    }catch(e){ document.getElementById('op-result').innerText = '请求失败'; }
  });

  fetchStats(); fetchAlarms();
  setInterval(fetchStats, 15_000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOperatorPage);
else initOperatorPage();
