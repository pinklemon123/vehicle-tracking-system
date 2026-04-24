"""
报警数据模型
"""

from datetime import datetime
from server.utils.helpers import generate_id


class Alarm:
    """报警模型"""
    
    # 报警类型
    TYPE_FENCE_ENTER = 'fence_enter'
    TYPE_FENCE_LEAVE = 'fence_leave'
    TYPE_OVERSPEED = 'overspeed'
    TYPE_LOW_BATTERY = 'low_battery'
    TYPE_OFFLINE = 'offline'
    TYPE_SYSTEM = 'system'
    
    # 报警级别
    LEVEL_INFO = 'info'
    LEVEL_WARNING = 'warning'
    LEVEL_ERROR = 'error'
    LEVEL_CRITICAL = 'critical'
    
    def __init__(self, data=None):
        self.id = None
        self.type = self.TYPE_SYSTEM
        self.level = self.LEVEL_INFO
        self.message = ''
        self.vehicle_id = None
        self.vehicle_name = ''
        self.details = {}
        self.time = None
        self.acknowledged = False
        
        if data:
            self.from_dict(data)
        else:
            self.id = generate_id('a_')
            self.time = datetime.now().isoformat()
    
    def from_dict(self, data):
        """从字典加载数据"""
        self.id = data.get('id', generate_id('a_'))
        self.type = data.get('type', self.TYPE_SYSTEM)
        self.level = data.get('level', self.LEVEL_INFO)
        self.message = data.get('message', '')
        self.vehicle_id = data.get('vehicle_id')
        self.vehicle_name = data.get('vehicle_name', '')
        self.details = data.get('details', {})
        self.time = data.get('time', datetime.now().isoformat())
        self.acknowledged = data.get('acknowledged', False)
        
        return self
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'type': self.type,
            'level': self.level,
            'message': self.message,
            'vehicle_id': self.vehicle_id,
            'vehicle_name': self.vehicle_name,
            'details': self.details,
            'time': self.time,
            'acknowledged': self.acknowledged
        }
    
    def acknowledge(self):
        """确认报警"""
        self.acknowledged = True
    
    def __repr__(self):
        return f"<Alarm {self.id}: [{self.level}] {self.message}>"