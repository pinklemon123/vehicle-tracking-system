"""
服务端配置文件
"""

import os

# 路径配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

# Flask配置
class Config:
    SECRET_KEY = 'vehicle-tracking-secret-key-2024'
    DEBUG = True
    SEND_FILE_MAX_AGE_DEFAULT = 0
    JSON_AS_ASCII = False
    
# 地图配置
MAP_CONFIG = {
    'default_center': [116.397428, 39.90923],
    'default_zoom': 13,
    'bounds': {
        'lng_min': 116.38,
        'lng_max': 116.42,
        'lat_min': 39.89,
        'lat_max': 39.93
    }
}

# WebSocket配置
SOCKET_CONFIG = {
    'ping_timeout': 10,
    'ping_interval': 5,
    'cors_allowed_origins': '*',
    'async_mode': 'threading'
}

# 模拟数据配置
SIMULATOR_CONFIG = {
    'update_interval': 3,  # 秒
    'max_vehicles': 10,
    'speed_range': (20, 60),
    'move_step': 0.001
}