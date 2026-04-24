"""
统一API路由
"""

from flask import jsonify, request
from server.utils.helpers import json_response
from server.services.ai_service import ai_service


def register_api_routes(app, services):
    """注册API路由"""
    
    vehicle_service = services.get('vehicle_service')
    fence_service = services.get('fence_service')
    alarm_service = services.get('alarm_service')
    
    @app.route('/api/status', methods=['GET'])
    def get_status():
        """获取系统状态"""
        return jsonify(json_response(data={
            'status': 'running',
            'version': '2.0.0',
            'vehicles_count': vehicle_service.count(),
            'fence_active': fence_service.is_valid(),
            'alarms_count': alarm_service.count()
        }))
    
    @app.route('/api/statistics', methods=['GET'])
    def get_statistics():
        """获取统计信息"""
        stats = vehicle_service.get_statistics()
        stats['fence_active'] = fence_service.is_valid()
        stats['alarms_total'] = alarm_service.count()
        stats['alarms_unacknowledged'] = len(alarm_service.get_unacknowledged())
        
        return jsonify(json_response(data=stats))
    
    @app.route('/api/alarms', methods=['GET'])
    def get_alarms():
        """获取报警列表"""
        limit = request.args.get('limit', 50, type=int)
        alarms = alarm_service.get_all(limit)
        return jsonify(json_response(
            data=[a.to_dict() for a in alarms],
            message=f'共 {len(alarms)} 条报警'
        ))
    
    @app.route('/api/alarms/<alarm_id>/acknowledge', methods=['PUT'])
    def acknowledge_alarm(alarm_id):
        """确认报警"""
        if alarm_service.acknowledge(alarm_id):
            return jsonify(json_response(message='报警已确认'))
        return jsonify(json_response(code=404, message='报警不存在')), 404
    
    @app.route('/api/alarms/acknowledge-all', methods=['PUT'])
    def acknowledge_all_alarms():
        """确认所有报警"""
        alarm_service.acknowledge_all()
        return jsonify(json_response(message='所有报警已确认'))

    @app.route('/api/ai/chat', methods=['POST'])
    def ai_chat():
        """AI 对话代理：接收 messages 列表并转发到后端 ai_service，返回模型响应"""
        payload = request.get_json() or {}
        messages = payload.get('messages')
        context = payload.get('context')

        if not messages:
            return jsonify(json_response(code=400, message='缺少 messages 字段')), 400

        resp = ai_service.chat(messages=messages, context=context)
        return jsonify(json_response(data=resp))

    @app.route('/api/ai/detect_parking', methods=['POST'])
    def ai_detect_parking():
        """AI 违规停车检测：接收 parking_snapshot 并返回检测结果"""
        payload = request.get_json() or {}
        snapshot = payload.get('parking_snapshot')
        if not snapshot:
            return jsonify(json_response(code=400, message='缺少 parking_snapshot 字段')), 400
        resp = ai_service.detect_illegal_parking(snapshot)

        # 如果 AI 返回结构化违规列表，则为每条违规创建报警（去重简单处理）
        try:
            data = resp if isinstance(resp, dict) else {}
            violations = data.get('violations') if isinstance(data.get('violations'), list) else None
            created = []
            if violations:
                for v in violations:
                    spot = v.get('spot_id') or v.get('spot')
                    reason = v.get('reason', '疑似违规停车')
                    confidence = v.get('confidence', None)
                    message = f"疑似违规停车: {spot} - {reason}"
                    details = {'confidence': confidence, 'raw': v}
                    alarm = alarm_service.create({
                        'type': 'illegal_parking',
                        'level': 'warning',
                        'message': message,
                        'vehicle_id': None,
                        'vehicle_name': spot,
                        'details': details
                    })
                    created.append(alarm.to_dict())

            return jsonify(json_response(data={'ai': resp, 'created_alarms': created}))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e), data={'ai': resp})), 500

    @app.route('/api/ai/ping', methods=['GET'])
    def ai_ping():
        """简单检测 DeepSeek 或 AI 后端连通性（会用一个轻量请求）"""
        test_prompt = [{'role': 'system', 'content': 'ping'}, {'role': 'user', 'content': 'ping'}]
        try:
            r = ai_service.chat(messages=test_prompt)
            return jsonify(json_response(data={'ok': True, 'response': r}))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500