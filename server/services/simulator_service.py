"""
模拟数据生成服务
"""

import random
import threading
import time
from datetime import datetime
from server.config import SIMULATOR_CONFIG, MAP_CONFIG
from server.models import Vehicle


class VehicleSimulator:
    """车辆模拟器"""
    
    def __init__(self, vehicle_service, fence_service, alarm_service):
        self.vehicle_service = vehicle_service
        self.fence_service = fence_service
        self.alarm_service = alarm_service
        self._running = False
        self._thread = None
        self._callbacks = []
        
        # 配置
        self.update_interval = SIMULATOR_CONFIG['update_interval']
        self.speed_range = SIMULATOR_CONFIG['speed_range']
        self.move_step = SIMULATOR_CONFIG['move_step']
    
    def start(self):
        """启动模拟器"""
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        print("[模拟器] 已启动")
    
    def stop(self):
        """停止模拟器"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        print("[模拟器] 已停止")
    
    def _run(self):
        """运行循环"""
        while self._running:
            try:
                self._update_vehicles()
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"[模拟器] 错误: {e}")
    
    def _update_vehicles(self):
        """更新所有车辆"""
        vehicles = self.vehicle_service.get_online_vehicles()
        updates = []
        
        for vehicle in vehicles:
            # 随机移动
            lng = vehicle.lng + random.uniform(-self.move_step, self.move_step)
            lat = vehicle.lat + random.uniform(-self.move_step, self.move_step)
            
            # 限制范围
            lng = max(MAP_CONFIG['bounds']['lng_min'], 
                     min(MAP_CONFIG['bounds']['lng_max'], lng))
            lat = max(MAP_CONFIG['bounds']['lat_min'], 
                     min(MAP_CONFIG['bounds']['lat_max'], lat))
            
            # 随机速度
            speed = random.randint(*self.speed_range)
            
            # 更新位置
            vehicle.update_position(lng, lat, speed)
            
            # 检查围栏状态
            self._check_fence_status(vehicle)
            
            # 检查超速
            if speed > 50:
                self.alarm_service.create_overspeed_alarm(vehicle, speed)
            
            # 模拟电量消耗
            vehicle.battery = max(0, vehicle.battery - random.uniform(0, 0.5))
            if vehicle.battery < 20:
                self.alarm_service.create_low_battery_alarm(vehicle)
            
            updates.append({
                'id': vehicle.id,
                'lat': vehicle.lat,
                'lng': vehicle.lng,
                'speed': vehicle.speed,
                'battery': vehicle.battery
            })
        
        # 通知回调
        if updates:
            for callback in self._callbacks:
                callback(updates)
    
    def _check_fence_status(self, vehicle):
        """检查围栏状态变化"""
        if not self.fence_service.is_valid():
            return
        
        is_in_fence = self.fence_service.contains(vehicle.lng, vehicle.lat)
        changed = vehicle.set_fence_status(is_in_fence)
        
        if changed:
            event_type = 'enter' if is_in_fence else 'leave'
            self.alarm_service.create_fence_alarm(vehicle, event_type)
    
    def add_callback(self, callback):
        """添加更新回调"""
        self._callbacks.append(callback)
    
    def remove_callback(self, callback):
        """移除更新回调"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    def init_mock_vehicles(self, count=5):
        """初始化模拟车辆"""
        names = ['货车A', '货车B', '货车C', '物流车D', '配送车E']
        plates = ['京A12345', '京B67890', '京C11223', '京D44556', '京E77889']
        
        for i in range(min(count, len(names))):
            data = {
                'name': names[i],
                'plate': plates[i],
                'lat': MAP_CONFIG['default_center'][1] + random.uniform(-0.01, 0.01),
                'lng': MAP_CONFIG['default_center'][0] + random.uniform(-0.01, 0.01),
                'status': Vehicle.STATUS_ONLINE,
                'speed': random.randint(20, 50),
                'battery': random.randint(60, 100)
            }
            self.vehicle_service.create(data)
        
        print(f"[模拟器] 创建了 {count} 辆模拟车辆")


# 创建全局单例
simulator = None

def init_simulator(vehicle_service, fence_service, alarm_service):
    """初始化模拟器"""
    global simulator
    simulator = VehicleSimulator(vehicle_service, fence_service, alarm_service)
    return simulator