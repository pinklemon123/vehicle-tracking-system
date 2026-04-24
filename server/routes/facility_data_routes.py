"""
设施标记数据路由 - 读写JSON文件
"""

import os
import json
from flask import request, jsonify
from server.utils.helpers import json_response

# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data')
DATA_FILE = os.path.join(DATA_DIR, 'facility_markers.json')


def load_markers():
    """从JSON文件加载标记数据"""
    try:
        if not os.path.exists(DATA_FILE):
            # 创建目录和初始文件
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
            return []
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f'加载标记数据失败: {e}')
        return []


def save_markers(markers):
    """保存标记数据到JSON文件"""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(markers, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f'保存标记数据失败: {e}')
        return False


def register_facility_data_routes(app, services):
    """注册设施数据路由"""
    
    @app.route('/api/facility-markers', methods=['GET'])
    def get_markers():
        """获取所有标记"""
        markers = load_markers()
        return jsonify(json_response(data=markers, message=f'共 {len(markers)} 个标记'))
    
    @app.route('/api/facility-markers', methods=['POST'])
    def add_marker():
        """添加标记"""
        try:
            data = request.json or {}
            markers = load_markers()
            
            marker = {
                'id': data.get('id', int(__import__('time').time() * 1000)),
                'name': data.get('name', '未命名'),
                'type': data.get('type', 'toilet'),
                'x': data.get('x', 100),
                'y': data.get('y', 100),
                'note': data.get('note', ''),
                'createdAt': data.get('createdAt', __import__('datetime').datetime.now().isoformat())
            }
            
            markers.append(marker)
            save_markers(markers)
            
            return jsonify(json_response(data=marker, message='标记添加成功'))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/facility-markers/<int:marker_id>', methods=['PUT'])
    def update_marker(marker_id):
        """更新标记"""
        try:
            data = request.json or {}
            markers = load_markers()
            
            for marker in markers:
                if marker['id'] == marker_id:
                    if 'name' in data:
                        marker['name'] = data['name']
                    if 'type' in data:
                        marker['type'] = data['type']
                    if 'x' in data:
                        marker['x'] = data['x']
                    if 'y' in data:
                        marker['y'] = data['y']
                    if 'note' in data:
                        marker['note'] = data['note']
                    
                    save_markers(markers)
                    return jsonify(json_response(data=marker, message='标记更新成功'))
            
            return jsonify(json_response(code=404, message='标记不存在')), 404
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/facility-markers/<int:marker_id>', methods=['DELETE'])
    def delete_marker(marker_id):
        """删除标记"""
        try:
            markers = load_markers()
            markers = [m for m in markers if m['id'] != marker_id]
            save_markers(markers)
            return jsonify(json_response(message='标记删除成功'))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500
    
    @app.route('/api/facility-markers/save-all', methods=['POST'])
    def save_all_markers():
        """批量保存所有标记"""
        try:
            data = request.json or {}
            markers = data.get('markers', [])
            save_markers(markers)
            return jsonify(json_response(message=f'已保存 {len(markers)} 个标记'))
        except Exception as e:
            return jsonify(json_response(code=500, message=str(e))), 500