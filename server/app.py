"""
车辆定位监控系统 - 主程序入口
"""

import os
import sys

# 添加项目根目录到Python路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
sys.path.insert(0, ROOT_DIR)

from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

from server.config import Config, SOCKET_CONFIG
from server.routes import register_all_routes
from server.services.vehicle_service import vehicle_service
from server.services.fence_service import fence_service
from server.services.alarm_service import alarm_service
from server.services.simulator_service import init_simulator
from server.sockets.socket_handlers import SocketHandlers


def create_app():
    """创建Flask应用"""
    app = Flask(__name__, 
                static_folder=ROOT_DIR,
                static_url_path='',
                template_folder=ROOT_DIR)
    
    # 加载配置
    app.config.from_object(Config)
    
    # 启用CORS
    CORS(app, origins='*')
    
    return app


def create_socketio(app):
    """创建SocketIO"""
    return SocketIO(app, **SOCKET_CONFIG)


def init_services():
    """初始化服务"""
    # 初始化模拟器
    simulator = init_simulator(vehicle_service, fence_service, alarm_service)
    
    # 创建模拟车辆
    simulator.init_mock_vehicles(5)
    
    return {
        'vehicle_service': vehicle_service,
        'fence_service': fence_service,
        'alarm_service': alarm_service,
        'simulator': simulator
    }


def print_startup_info():
    """打印启动信息"""
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   🚗 车辆定位监控系统 - 后端服务                         ║
    ║   Version: 2.0.0                                         ║
    ║                                                          ║
    ║   📍 访问地址: http://localhost:5000                     ║
    ║   🔧 调试模式: 已启用                                    ║
    ║   📡 WebSocket: ws://localhost:5000                      ║
    ║                                                          ║
    ║   📄 页面路由:                                           ║
    ║      /          - 车辆监控主页                           ║
    ║      /admin     - 后台管理页面                           ║
    ║      /parking   - 智慧停车页面                           ║
    ║      /facilities - 公共设施页面                          ║
    ║      /operator  - 运营总览页面                           ║
    ║                                                          ║
    ║   🚀 按 Ctrl+C 停止服务                                  ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    """)


def main():
    """主函数"""
    # 创建应用
    app = create_app()
    socketio = create_socketio(app)
    
    # 初始化服务
    services = init_services()
    
    # 注册路由
    register_all_routes(app, services)
    
    # 初始化Socket处理
    socket_handlers = SocketHandlers(socketio, services)
    
    # 启动模拟器
    simulator = services.get('simulator')
    if simulator:
        simulator.start()
    
    # 打印启动信息
    print_startup_info()
    
    try:
        # 启动服务
        socketio.run(app, 
                     host='0.0.0.0', 
                     port=5000, 
                     debug=True,
                     allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        print("\n[服务] 正在停止...")
        if simulator:
            simulator.stop()
        print("[服务] 已停止")


if __name__ == '__main__':
    main()