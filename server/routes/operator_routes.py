from flask import Blueprint, jsonify, request
from server.services.mock_data_service import MockDataService

operator_bp = Blueprint('operator', __name__, url_prefix='/api/operator')
mock_service = MockDataService()

@operator_bp.route('/stats', methods=['GET'])
def get_current_stats():
    """获取当前统计数据"""
    try:
        stats = mock_service.get_current_stats()
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@operator_bp.route('/trends', methods=['GET'])
def get_trends():
    """获取趋势数据"""
    try:
        trends = mock_service.get_trends()
        return jsonify({'success': True, 'data': trends})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@operator_bp.route('/alarms', methods=['GET'])
def get_alarms():
    """获取告警列表"""
    try:
        alarms = mock_service.get_alarms()
        return jsonify({'success': True, 'data': alarms})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@operator_bp.route('/alarms/acknowledge', methods=['POST'])
def acknowledge_alarms():
    """确认所有告警"""
    try:
        result = mock_service.acknowledge_all_alarms()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@operator_bp.route('/parking/snapshot', methods=['GET'])
def get_parking_snapshot():
    """获取车位快照"""
    try:
        snapshot = mock_service.get_parking_snapshot()
        return jsonify({'success': True, 'data': snapshot})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@operator_bp.route('/refresh', methods=['POST'])
def refresh_data():
    """刷新所有模拟数据"""
    try:
        result = mock_service.refresh_data()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@operator_bp.route('/ai/check', methods=['POST'])
def check_ai_connection():
    """检测AI连接（模拟）"""
    return jsonify({
        'success': True, 
        'data': {
            'status': 'connected',
            'model': 'deepseek-chat',
            'latency': '125ms'
        }
    })