"""
围栏数据模型
"""

from datetime import datetime
from server.utils.helpers import generate_id
from server.utils.geo_utils import calculate_polygon_area, calculate_polygon_perimeter, is_point_in_polygon


class Fence:
    """电子围栏模型"""
    
    def __init__(self, data=None):
        self.id = None
        self.name = '电子围栏'
        self.points = []
        self.color = '#ff4d4f'
        self.fill_opacity = 0.15
        self.stroke_weight = 3
        self.create_time = None
        self.update_time = None
        
        if data:
            self.from_dict(data)
        else:
            self.id = generate_id('f_')
            self.create_time = datetime.now().isoformat()
    
    def from_dict(self, data):
        """从字典加载数据"""
        self.id = data.get('id', generate_id('f_'))
        self.name = data.get('name', '电子围栏')
        self.points = data.get('points', [])
        self.color = data.get('color', '#ff4d4f')
        self.fill_opacity = data.get('fill_opacity', 0.15)
        self.stroke_weight = data.get('stroke_weight', 3)
        self.create_time = data.get('create_time', datetime.now().isoformat())
        self.update_time = data.get('update_time', datetime.now().isoformat())
        
        return self
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'points': self.points,
            'color': self.color,
            'fill_opacity': self.fill_opacity,
            'stroke_weight': self.stroke_weight,
            'create_time': self.create_time,
            'update_time': self.update_time,
            'area': self.area,
            'perimeter': self.perimeter,
            'point_count': len(self.points)
        }
    
    def add_point(self, lng, lat):
        """添加顶点"""
        self.points.append([lng, lat])
        self.update_time = datetime.now().isoformat()
    
    def remove_last_point(self):
        """移除最后一个顶点"""
        if self.points:
            self.points.pop()
            self.update_time = datetime.now().isoformat()
    
    def clear_points(self):
        """清空所有顶点"""
        self.points = []
        self.update_time = datetime.now().isoformat()
    
    def contains(self, lng, lat):
        """判断点是否在围栏内"""
        if len(self.points) < 3:
            return False
        return is_point_in_polygon([lng, lat], self.points)
    
    @property
    def area(self):
        """计算面积"""
        if len(self.points) < 3:
            return 0
        return calculate_polygon_area(self.points)
    
    @property
    def perimeter(self):
        """计算周长"""
        if len(self.points) < 2:
            return 0
        return calculate_polygon_perimeter(self.points)
    
    @property
    def is_valid(self):
        """是否有效（至少3个点）"""
        return len(self.points) >= 3
    
    @property
    def center(self):
        """计算中心点"""
        if not self.points:
            return [116.397428, 39.90923]
        
        lng_sum = sum(p[0] for p in self.points)
        lat_sum = sum(p[1] for p in self.points)
        
        return [lng_sum / len(self.points), lat_sum / len(self.points)]
    
    def __repr__(self):
        return f"<Fence {self.id}: {self.name} ({len(self.points)} points)>"