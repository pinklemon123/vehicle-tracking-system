"""
车辆数据模型
"""

from datetime import datetime
from server.utils.helpers import generate_id, random_color


class Vehicle:
    """车辆模型"""
    
    STATUS_ONLINE = 'online'
    STATUS_OFFLINE = 'offline'
    STATUS_MAINTENANCE = 'maintenance'
    
    def __init__(self, data=None):
        self.id = None
        self.name = ''
        self.plate = ''
        self.lng = 116.397428
        self.lat = 39.90923
        self.status = self.STATUS_ONLINE
        self.speed = 0
        self.battery = 100
        self.color = '#1677ff'
        self.driver = ''
        self.phone = ''
        self.create_time = None
        self.update_time = None
        self._in_fence = False
        
        if data:
            self.from_dict(data)
    
    def from_dict(self, data):
        """从字典加载数据"""
        self.id = data.get('id', generate_id('v_'))
        self.name = data.get('name', '')
        self.plate = data.get('plate', '')
        self.lng = data.get('lng', 116.397428)
        self.lat = data.get('lat', 39.90923)
        self.status = data.get('status', self.STATUS_ONLINE)
        self.speed = data.get('speed', 0)
        self.battery = data.get('battery', 100)
        self.color = data.get('color', random_color())
        self.driver = data.get('driver', '')
        self.phone = data.get('phone', '')
        self.create_time = data.get('create_time', datetime.now().isoformat())
        self.update_time = data.get('update_time', datetime.now().isoformat())
        self._in_fence = data.get('_in_fence', False)
        
        return self
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'plate': self.plate,
            'lng': self.lng,
            'lat': self.lat,
            'status': self.status,
            'speed': self.speed,
            'battery': self.battery,
            'color': self.color,
            'driver': self.driver,
            'phone': self.phone,
            'create_time': self.create_time,
            'update_time': self.update_time,
            '_in_fence': self._in_fence
        }
    
    def update_position(self, lng, lat, speed=None):
        """更新位置"""
        self.lng = lng
        self.lat = lat
        if speed is not None:
            self.speed = speed
        self.update_time = datetime.now().isoformat()
    
    def set_fence_status(self, in_fence):
        """设置围栏状态"""
        changed = self._in_fence != in_fence
        self._in_fence = in_fence
        return changed
    
    @property
    def position(self):
        """获取位置"""
        return [self.lng, self.lat]
    
    @property
    def is_online(self):
        """是否在线"""
        return self.status == self.STATUS_ONLINE
    
    def __repr__(self):
        return f"<Vehicle {self.id}: {self.name} ({self.plate})>"