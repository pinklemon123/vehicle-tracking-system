"""
通用辅助函数
"""

import time
import json
from datetime import datetime


def generate_id(prefix=''):
    """
    生成唯一ID
    """
    return f"{prefix}{int(time.time() * 1000)}_{id(object()) % 10000}"


def format_datetime(dt=None, fmt='%Y-%m-%d %H:%M:%S'):
    """
    格式化日期时间
    """
    if dt is None:
        dt = datetime.now()
    return dt.strftime(fmt)


def json_response(code=0, message='success', data=None):
    """
    生成标准JSON响应
    """
    return {
        'code': code,
        'message': message,
        'data': data,
        'timestamp': datetime.now().isoformat()
    }


def safe_get(dict_obj, key, default=None):
    """
    安全获取字典值
    """
    if isinstance(dict_obj, dict):
        return dict_obj.get(key, default)
    return default


def clamp(value, min_val, max_val):
    """
    限制数值范围
    """
    return max(min_val, min(value, max_val))


def random_color():
    """
    生成随机颜色
    """
    import random
    colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96']
    return random.choice(colors)