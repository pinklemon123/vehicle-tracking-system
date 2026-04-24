"""
车辆业务逻辑服务
"""

import random
from datetime import datetime
from server.models.vehicle import Vehicle
from server.utils.helpers import generate_id, clamp
from server.config import MAP_CONFIG


class VehicleService:
    """车辆服务类"""
    
    def __init__(self):
        self._vehicles = {}
        self._max_vehicles = 100
    
    def create(self, data):
        """创建车辆"""
        vehicle = Vehicle(data)
        
        if not vehicle.id:
            vehicle.id = generate_id('v_')
        
        if not vehicle.name:
            vehicle.name = f"车辆{len(self._vehicles) + 1}"
        
        if not vehicle.plate:
            vehicle.plate = f"京A{random.randint(10000, 99999)}"
        
        vehicle.create_time = datetime.now().isoformat()
        vehicle.update_time = datetime.now().isoformat()
        
        self._vehicles[vehicle.id] = vehicle
        return vehicle
    
    def get(self, vehicle_id):
        """获取车辆"""
        return self._vehicles.get(vehicle_id)
    
    def get_all(self):
        """获取所有车辆"""
        return list(self._vehicles.values())
    
    def update(self, vehicle_id, data):
        """更新车辆"""
        vehicle = self._vehicles.get(vehicle_id)
        if not vehicle:
            return None
        
        # 更新允许的字段
        allowed_fields = ['name', 'plate', 'status', 'driver', 'phone', 'color']
        for field in allowed_fields:
            if field in data:
                setattr(vehicle, field, data[field])
        
        # 更新位置
        if 'lng' in data and 'lat' in data:
            lng = clamp(data['lng'], MAP_CONFIG['bounds']['lng_min'], MAP_CONFIG['bounds']['lng_max'])
            lat = clamp(data['lat'], MAP_CONFIG['bounds']['lat_min'], MAP_CONFIG['bounds']['lat_max'])
            speed = data.get('speed', vehicle.speed)
            vehicle.update_position(lng, lat, speed)
        
        # 更新其他字段
        if 'battery' in data:
            vehicle.battery = clamp(data['battery'], 0, 100)
        
        vehicle.update_time = datetime.now().isoformat()
        return vehicle
    
    def delete(self, vehicle_id):
        """删除车辆"""
        if vehicle_id in self._vehicles:
            del self._vehicles[vehicle_id]
            return True
        return False
    
    def update_position(self, vehicle_id, lng, lat, speed=None):
        """更新车辆位置"""
        vehicle = self._vehicles.get(vehicle_id)
        if vehicle:
            lng = clamp(lng, MAP_CONFIG['bounds']['lng_min'], MAP_CONFIG['bounds']['lng_max'])
            lat = clamp(lat, MAP_CONFIG['bounds']['lat_min'], MAP_CONFIG['bounds']['lat_max'])
            vehicle.update_position(lng, lat, speed)
            return vehicle
        return None
    
    def get_online_vehicles(self):
        """获取在线车辆"""
        return [v for v in self._vehicles.values() if v.is_online]
    
    def get_vehicles_in_fence(self, fence):
        """获取围栏内的车辆"""
        if not fence or not fence.is_valid:
            return []
        
        return [v for v in self._vehicles.values() 
                if v.is_online and fence.contains(v.lng, v.lat)]
    
    def get_statistics(self):
        """获取统计信息"""
        total = len(self._vehicles)
        online = sum(1 for v in self._vehicles.values() if v.is_online)
        offline = total - online
        
        speeds = [v.speed for v in self._vehicles.values() if v.is_online]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        
        batteries = [v.battery for v in self._vehicles.values()]
        avg_battery = sum(batteries) / len(batteries) if batteries else 0
        
        return {
            'total': total,
            'online': online,
            'offline': offline,
            'avg_speed': round(avg_speed, 2),
            'avg_battery': round(avg_battery, 2)
        }
    
    def count(self):
        """获取车辆数量"""
        return len(self._vehicles)
    
    def clear(self):
        """清空所有车辆"""
        self._vehicles.clear()


# 创建全局单例
vehicle_service = VehicleService()