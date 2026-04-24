"""
地理计算工具函数
"""

import math


def calculate_distance(lat1, lng1, lat2, lng2):
    """
    计算两点之间的距离（米）
    使用Haversine公式
    """
    R = 6371000  # 地球半径（米）
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def is_point_in_polygon(point, polygon):
    """
    判断点是否在多边形内（射线法）
    
    Args:
        point: [lng, lat]
        polygon: [[lng, lat], ...]
    
    Returns:
        bool: 点是否在多边形内
    """
    x, y = point
    inside = False
    
    n = len(polygon)
    if n < 3:
        return False
    
    for i in range(n):
        j = (i + 1) % n
        
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        
        # 检查射线与边的交点
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
    
    return inside


def calculate_polygon_area(polygon):
    """
    计算多边形面积（平方米）
    使用鞋带公式
    """
    n = len(polygon)
    if n < 3:
        return 0
    
    area = 0
    for i in range(n):
        j = (i + 1) % n
        
        # 转换为弧度计算
        lng1, lat1 = polygon[i]
        lng2, lat2 = polygon[j]
        
        area += lng1 * lat2 - lng2 * lat1
    
    area = abs(area) / 2
    
    # 转换为平方米（近似）
    area = area * 111000 * 111000 * math.cos(math.radians(polygon[0][1]))
    
    return area


def calculate_polygon_perimeter(polygon):
    """
    计算多边形周长（米）
    """
    n = len(polygon)
    if n < 2:
        return 0
    
    perimeter = 0
    for i in range(n):
        j = (i + 1) % n
        
        lng1, lat1 = polygon[i]
        lng2, lat2 = polygon[j]
        
        perimeter += calculate_distance(lat1, lng1, lat2, lng2)
    
    return perimeter


def get_bounding_box(points):
    """
    获取点集的边界框
    """
    if not points:
        return None
    
    lngs = [p[0] for p in points]
    lats = [p[1] for p in points]
    
    return {
        'min_lng': min(lngs),
        'max_lng': max(lngs),
        'min_lat': min(lats),
        'max_lat': max(lats)
    }


def random_position(center_lng, center_lat, radius=0.01):
    """
    生成随机位置
    """
    import random
    
    lng = center_lng + random.uniform(-radius, radius)
    lat = center_lat + random.uniform(-radius, radius)
    
    return [lng, lat]