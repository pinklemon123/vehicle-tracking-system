"""
服务模块初始化
"""

from server.services.vehicle_service import vehicle_service, VehicleService
from server.services.fence_service import fence_service, FenceService
from server.services.alarm_service import alarm_service, AlarmService
from server.services.simulator_service import init_simulator, VehicleSimulator

__all__ = [
    'vehicle_service',
    'VehicleService',
    'fence_service', 
    'FenceService',
    'alarm_service',
    'AlarmService',
    'init_simulator',
    'VehicleSimulator'
]