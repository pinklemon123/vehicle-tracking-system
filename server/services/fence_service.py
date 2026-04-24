"""
电子围栏业务逻辑服务
"""

from datetime import datetime
from server.models.fence import Fence


class FenceService:
    """围栏服务类"""
    
    def __init__(self):
        self._fence = None
    
    def create(self, data=None):
        """创建围栏"""
        self._fence = Fence(data)
        return self._fence
    
    def get(self):
        """获取当前围栏"""
        return self._fence
    
    def update(self, data):
        """更新围栏"""
        if not self._fence:
            self._fence = Fence()
        
        if 'name' in data:
            self._fence.name = data['name']
        if 'color' in data:
            self._fence.color = data['color']
        if 'fill_opacity' in data:
            self._fence.fill_opacity = data['fill_opacity']
        
        self._fence.update_time = datetime.now().isoformat()
        return self._fence
    
    def set_points(self, points):
        """设置围栏顶点"""
        if not self._fence:
            self._fence = Fence()
        
        self._fence.points = points
        self._fence.update_time = datetime.now().isoformat()
        return self._fence
    
    def add_point(self, lng, lat):
        """添加顶点"""
        if not self._fence:
            self._fence = Fence()
        
        self._fence.add_point(lng, lat)
        return self._fence
    
    def remove_last_point(self):
        """移除最后一个顶点"""
        if self._fence:
            self._fence.remove_last_point()
        return self._fence
    
    def clear(self):
        """清除围栏"""
        self._fence = None
        return True
    
    def is_valid(self):
        """围栏是否有效"""
        return self._fence and self._fence.is_valid
    
    def contains(self, lng, lat):
        """判断点是否在围栏内"""
        if not self.is_valid():
            return False
        return self._fence.contains(lng, lat)
    
    def to_dict(self):
        """转换为字典"""
        if self._fence:
            return self._fence.to_dict()
        return None


# 创建全局单例
fence_service = FenceService()