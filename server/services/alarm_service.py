"""
报警业务逻辑服务
"""

from server.models.alarm import Alarm
from server.models.vehicle import Vehicle


class AlarmService:
    """报警服务类"""
    
    def __init__(self, max_alarms=500):
        self._alarms = []
        self._max_alarms = max_alarms
        self._observers = []
    
    def create(self, data):
        """创建报警"""
        alarm = Alarm(data)
        self._alarms.append(alarm)
        
        # 限制最大数量
        if len(self._alarms) > self._max_alarms:
            self._alarms = self._alarms[-self._max_alarms:]
        
        # 通知观察者
        self._notify_observers(alarm)
        
        return alarm
    
    def create_fence_alarm(self, vehicle, event_type):
        """创建围栏报警"""
        if event_type == 'enter':
            alarm_type = Alarm.TYPE_FENCE_ENTER
            level = Alarm.LEVEL_INFO
            message = f"车辆 {vehicle.name or vehicle.plate} 进入电子围栏"
        elif event_type == 'leave':
            alarm_type = Alarm.TYPE_FENCE_LEAVE
            level = Alarm.LEVEL_WARNING
            message = f"车辆 {vehicle.name or vehicle.plate} 离开电子围栏"
        else:
            return None
        
        return self.create({
            'type': alarm_type,
            'level': level,
            'message': message,
            'vehicle_id': vehicle.id,
            'vehicle_name': vehicle.name or vehicle.plate
        })
    
    def create_overspeed_alarm(self, vehicle, speed, limit=60):
        """创建超速报警"""
        return self.create({
            'type': Alarm.TYPE_OVERSPEED,
            'level': Alarm.LEVEL_WARNING,
            'message': f"车辆 {vehicle.name or vehicle.plate} 超速行驶 ({speed}km/h)",
            'vehicle_id': vehicle.id,
            'vehicle_name': vehicle.name or vehicle.plate,
            'details': {'speed': speed, 'limit': limit}
        })
    
    def create_low_battery_alarm(self, vehicle, threshold=20):
        """创建低电量报警"""
        return self.create({
            'type': Alarm.TYPE_LOW_BATTERY,
            'level': Alarm.LEVEL_WARNING,
            'message': f"车辆 {vehicle.name or vehicle.plate} 电量低 ({vehicle.battery}%)",
            'vehicle_id': vehicle.id,
            'vehicle_name': vehicle.name or vehicle.plate,
            'details': {'battery': vehicle.battery, 'threshold': threshold}
        })
    
    def get(self, alarm_id):
        """获取报警"""
        for alarm in self._alarms:
            if alarm.id == alarm_id:
                return alarm
        return None
    
    def get_all(self, limit=None):
        """获取所有报警"""
        if limit:
            return self._alarms[-limit:]
        return self._alarms
    
    def get_unacknowledged(self):
        """获取未确认的报警"""
        return [a for a in self._alarms if not a.acknowledged]
    
    def acknowledge(self, alarm_id):
        """确认报警"""
        alarm = self.get(alarm_id)
        if alarm:
            alarm.acknowledge()
            return True
        return False
    
    def acknowledge_all(self):
        """确认所有报警"""
        for alarm in self._alarms:
            alarm.acknowledge()
        return True
    
    def clear(self):
        """清空所有报警"""
        self._alarms = []
        return True
    
    def count(self):
        """获取报警数量"""
        return len(self._alarms)
    
    def add_observer(self, callback):
        """添加观察者"""
        self._observers.append(callback)
    
    def remove_observer(self, callback):
        """移除观察者"""
        if callback in self._observers:
            self._observers.remove(callback)
    
    def _notify_observers(self, alarm):
        """通知所有观察者"""
        for observer in self._observers:
            try:
                observer(alarm)
            except Exception as e:
                print(f"通知观察者失败: {e}")


# 创建全局单例
alarm_service = AlarmService()