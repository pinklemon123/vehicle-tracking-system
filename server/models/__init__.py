"""
模型模块初始化
"""

from server.models.vehicle import Vehicle
from server.models.fence import Fence
from server.models.alarm import Alarm

__all__ = ['Vehicle', 'Fence', 'Alarm']