"""
服务端配置文件
"""

import os

# 路径配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)


def load_local_env():
    env_path = os.path.join(ROOT_DIR, '.env')
    if not os.path.exists(env_path):
        return

    with open(env_path, 'r', encoding='utf-8') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue

            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


load_local_env()

# Flask配置
class Config:
    SECRET_KEY = 'vehicle-tracking-secret-key-2024'
    DEBUG = True
    SEND_FILE_MAX_AGE_DEFAULT = 0
    JSON_AS_ASCII = False
    # Deepseek API 配置（建议通过环境变量设置）
    # 注意：默认不应在代码中硬编码真实秘钥，优先通过环境变量注入
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
    # 使用 DeepSeek 官方 base URL（OpenAI 兼容），具体调用路径将在 ai_service 中拼接
    DEEPSEEK_API_URL = os.environ.get('DEEPSEEK_API_URL', 'https://api.deepseek.com')
    # 默认模型，若需要可在环境变量中覆盖
    DEEPSEEK_MODEL = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')
    
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
