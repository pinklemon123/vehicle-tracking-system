"""
车辆相关路由
"""

from flask import request, jsonify
from server.utils.helpers import json_response


def register_vehicle_routes(app, services):
    """注册车辆路由"""
    
    vehicle_service = services.get('vehicle_service')
    fence_service = services.get('fence_service')
    
    @app.route('/api/vehicles', methods=['GET'])
    def get_vehicles():
        """获取所有车辆"""
        vehicles = vehicle_service.get_all()
        return jsonify(json_response(
            data=[v.to_dict() for v in vehicles],
            message=f'共 {len(vehicles)} 辆车'
        ))
    
    @app.route('/api/vehicles/<vehicle_id>', methods=['GET'])
    def get_vehicle(vehicle_id):
        """获取单个车辆"""
        vehicle = vehicle_service.get(vehicle_id)
        if vehicle:
            return jsonify(json_response(data=vehicle.to_dict()))
        return jsonify(json_response(code=404, message='车辆不存在')), 404
    
    @app.route('/api/vehicles', methods=['POST'])
    def add_vehicle():
        """添加车辆"""
        try:
            data = request.json or {}
            vehicle = vehicle_service.create(data)
            return jsonify(json_response(data=vehicle.to_dict(), message='添加成功'))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/vehicles/<vehicle_id>', methods=['PUT'])
    def update_vehicle(vehicle_id):
        """更新车辆"""
        try:
            data = request.json or {}
            vehicle = vehicle_service.update(vehicle_id, data)
            if vehicle:
                return jsonify(json_response(data=vehicle.to_dict(), message='更新成功'))
            return jsonify(json_response(code=404, message='车辆不存在')), 404
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/vehicles/<vehicle_id>', methods=['DELETE'])
    def delete_vehicle(vehicle_id):
        """删除车辆"""
        if vehicle_service.delete(vehicle_id):
            return jsonify(json_response(message='删除成功'))
        return jsonify(json_response(code=404, message='车辆不存在')), 404
    
    @app.route('/api/vehicles/<vehicle_id>/position', methods=['PUT'])
    def update_vehicle_position(vehicle_id):
        """更新车辆位置"""
        try:
            data = request.json or {}
            vehicle = vehicle_service.update_position(
                vehicle_id,
                data.get('lng'),
                data.get('lat'),
                data.get('speed')
            )
            if vehicle:
                return jsonify(json_response(data=vehicle.to_dict()))
            return jsonify(json_response(code=404, message='车辆不存在')), 404
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500