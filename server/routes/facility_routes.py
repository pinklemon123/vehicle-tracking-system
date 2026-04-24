"""
设施相关路由
"""

from flask import jsonify, request
from server.utils.helpers import json_response


# 模拟设施数据
MOCK_FACILITIES = [
    {
        'id': 'f1',
        'name': '急诊医学中心',
        'type': 'medical',
        'floor': 1,
        'lat': 39.90923,
        'lng': 116.397428,
        'status': 'normal',
        'distance': 120,
        'details': {'waitingCount': 12, 'avgTime': 15, 'doctors': 5}
    },
    {
        'id': 'f2',
        'name': '2号直饮水机',
        'type': 'water',
        'floor': 2,
        'lat': 39.91023,
        'lng': 116.398428,
        'status': 'maintenance',
        'distance': 300,
        'details': {'temperature': 45, 'tds': 12, 'filterLife': 30}
    },
    {
        'id': 'f3',
        'name': '西侧观光电梯',
        'type': 'elevator',
        'floor': 1,
        'lat': 39.90823,
        'lng': 116.396428,
        'status': 'normal',
        'distance': 450,
        'details': {'currentFloor': 5, 'capacity': 65, 'maxLoad': 1000}
    },
    {
        'id': 'f4',
        'name': '1A公共卫生间',
        'type': 'toilet',
        'floor': 1,
        'lat': 39.90723,
        'lng': 116.399428,
        'status': 'maintenance',
        'distance': 600,
        'details': {'maleAvailable': 2, 'maleTotal': 5, 'femaleAvailable': 0, 'femaleTotal': 5}
    },
    {
        'id': 'f5',
        'name': '自行车停放区A',
        'type': 'bike',
        'floor': 1,
        'lat': 39.91123,
        'lng': 116.395428,
        'status': 'normal',
        'distance': 250,
        'details': {'totalSpots': 50, 'availableSpots': 23, 'chargingSpots': 10}
    },
    {
        'id': 'f6',
        'name': '3F卫生间',
        'type': 'toilet',
        'floor': 3,
        'lat': 39.90850,
        'lng': 116.39800,
        'status': 'normal',
        'distance': 180,
        'details': {'maleAvailable': 3, 'maleTotal': 4, 'femaleAvailable': 2, 'femaleTotal': 4}
    },
    {
        'id': 'f7',
        'name': '自行车停放区B',
        'type': 'bike',
        'floor': -1,
        'lat': 39.90980,
        'lng': 116.39600,
        'status': 'normal',
        'distance': 150,
        'details': {'totalSpots': 80, 'availableSpots': 45, 'chargingSpots': 20}
    }
]


def register_facility_routes(app, services):
    """注册设施路由"""
    
    @app.route('/api/facilities', methods=['GET'])
    def get_facilities():
        """获取设施列表"""
        facility_type = request.args.get('type')
        floor = request.args.get('floor', type=int)
        
        facilities = MOCK_FACILITIES
        
        if facility_type:
            facilities = [f for f in facilities if f['type'] == facility_type]
        
        if floor is not None:
            facilities = [f for f in facilities if f['floor'] == floor]
        
        return jsonify(json_response(data=facilities, message=f'共 {len(facilities)} 个设施'))
    
    @app.route('/api/facilities/<facility_id>', methods=['GET'])
    def get_facility(facility_id):
        """获取单个设施"""
        facility = next((f for f in MOCK_FACILITIES if f['id'] == facility_id), None)
        if facility:
            return jsonify(json_response(data=facility))
        return jsonify(json_response(code=404, message='设施不存在')), 404
    
    @app.route('/api/facilities/types', methods=['GET'])
    def get_facility_types():
        """获取设施类型列表"""
        types = [
            {'value': 'toilet', 'label': '卫生间', 'icon': 'restroom'},
            {'value': 'water', 'label': '饮水点', 'icon': 'water'},
            {'value': 'elevator', 'label': '电梯', 'icon': 'arrow-up'},
            {'value': 'medical', 'label': '医疗点', 'icon': 'hospital'},
            {'value': 'bike', 'label': '自行车停放', 'icon': 'bicycle'}
        ]
        return jsonify(json_response(data=types))