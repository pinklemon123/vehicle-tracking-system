"""
AI 服务：封装与 Deepseek（或其他模型）对话与违规停车判断的代理
- 不在前端暴露 API Key：从 `server.config.Config.DEEPSEEK_API_KEY` 读取
- 若未配置 key，将返回友好错误信息
"""
import json
import os
import requests
from typing import List, Dict, Any
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from server.config import Config

class AIService:
    def __init__(self):
        self.api_key = Config.DEEPSEEK_API_KEY
        self.api_url = Config.DEEPSEEK_API_URL
        # 模型名称（来自配置）
        self.model = getattr(Config, 'DEEPSEEK_MODEL', 'deepseek-v4-flash')
        # 是否验证 SSL（用于临时调试可以设置环境变量 DEEPSEEK_VERIFY=false）
        verify_env = os.environ.get('DEEPSEEK_VERIFY', 'true').lower()
        self.verify_ssl = False if verify_env in ('0', 'false', 'no') else True

        # requests 会话，带重试策略，避免瞬时网络抖动导致失败
        self.session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.5, status_forcelist=(502, 503, 504))
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount('https://', adapter)
        self.session.mount('http://', adapter)

    def _ensure_key(self):
        if not self.api_key:
            return False, {'error': 'Deepseek API key not configured on server. Set DEEPSEEK_API_KEY environment variable.'}
        return True, None

    def chat(self, messages: List[Dict[str, Any]], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """向 Deepseek 转发对话消息，返回其响应（原样返回 JSON 或 error 字段）。"""
        ok, err = self._ensure_key()
        if not ok:
            return err

        # 使用 DeepSeek 官方 chat/completions endpoint（文档显示为 /chat/completions）
        endpoint = self.api_url.rstrip('/') + '/chat/completions'
        payload = {
            'model': self.model,
            'messages': messages
        }
        if context:
            # 额外上下文字段，用于模型参考（若 DeepSeek 支持）
            payload['context'] = context

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        try:
            resp = self.session.post(endpoint, json=payload, headers=headers, timeout=20, verify=self.verify_ssl)
            text = resp.text
            if not resp.ok:
                return {'error': f'HTTP {resp.status_code}', 'raw': text}
            try:
                return json.loads(text)
            except Exception:
                return {'error': '响应不是有效 JSON', 'raw': text}
        except requests.exceptions.SSLError as e:
            return {'error': 'SSL 错误: ' + str(e), 'hint': '如果是测试环境可以设置环境变量 DEEPSEEK_VERIFY=false 临时关闭 SSL 验证'}
        except requests.exceptions.RequestException as e:
            # 捕获所有 requests 级别错误并返回更明确的说明
            return {'error': '请求失败: ' + str(e)}

    def detect_illegal_parking(self, parking_snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """使用 AI 判断违规停车的高层封装。
        parking_snapshot: 例如包含车位列表、车辆位置、车牌等信息。
        返回结构化判断结果（示例）：
        { 'violations': [ { 'spot_id': 'A-042', 'reason': '行驶主通道停车', 'confidence': 0.92 } ], 'summary': '共 2 处疑似违规停车' }
        本实现将把 snapshot 作为 context 发送给模型，并请求结构化输出。
        """
        ok, err = self._ensure_key()
        if not ok:
            return err

        system_msg = {
            'role': 'system',
            'content': (
                '你是一个停车场违规检测助手。接收车位快照和车辆位置，识别疑似违规停车（如在行车主道、消防通道、禁停区、残疾车位被占用且无残疾标签等）。'
                ' 返回 JSON：{"violations": [...], "summary": "..."}，其中每条 violation 包含 spot_id, reason, confidence(0-1)。'
            )
        }
        user_msg = {
            'role': 'user',
            'content': '请根据以下快照判断是否存在违规停车（只返回 JSON 响应，不要带多余文字）：\n' + json.dumps(parking_snapshot, ensure_ascii=False)
        }

        return self.chat([system_msg, user_msg], context=parking_snapshot)


# 单例服务对象，其他模块可以直接导入并使用
ai_service = AIService()
