"""
围栏相关路由
"""

from flask import request, jsonify
from server.utils.helpers import json_response


def register_fence_routes(app, services):
    """注册围栏路由"""
    
    fence_service = services.get('fence_service')
    
    @app.route('/api/fence', methods=['GET'])
    def get_fence():
        """获取电子围栏"""
        fence = fence_service.get()
        return jsonify(json_response(data=fence.to_dict() if fence else None))
    
    @app.route('/api/fence', methods=['POST'])
    def set_fence():
        """设置电子围栏"""
        try:
            data = request.json or {}
            
            if 'points' in data:
                fence = fence_service.set_points(data['points'])
            else:
                fence = fence_service.create(data)
            
            return jsonify(json_response(data=fence.to_dict(), message='围栏设置成功'))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/fence/point', methods=['POST'])
    def add_fence_point():
        """添加围栏顶点"""
        try:
            data = request.json or {}
            fence = fence_service.add_point(data.get('lng'), data.get('lat'))
            return jsonify(json_response(data=fence.to_dict()))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/fence/point/last', methods=['DELETE'])
    def remove_last_point():
        """移除最后一个顶点"""
        fence = fence_service.remove_last_point()
        return jsonify(json_response(data=fence.to_dict() if fence else None))
    
    @app.route('/api/fence', methods=['DELETE'])
    def delete_fence():
        """删除电子围栏"""
        fence_service.clear()
        return jsonify(json_response(message='围栏已清除'))
    
    @app.route('/api/fence/contains', methods=['POST'])
    def check_point_in_fence():
        """检查点是否在围栏内"""
        data = request.json or {}
        lng = data.get('lng')
        lat = data.get('lat')
        
        if lng is None or lat is None:
            return jsonify(json_response(code=400, message='缺少坐标参数')), 400
        
        contains = fence_service.contains(lng, lat)
        return jsonify(json_response(data={'contains': contains}))