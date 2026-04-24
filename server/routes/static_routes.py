"""
静态文件路由
"""

from flask import send_from_directory
from server.config import ROOT_DIR


def register_static_routes(app, services):
    """注册静态文件路由"""
    
    @app.route('/')
    def index():
        """主页"""
        return send_from_directory(ROOT_DIR, 'index.html')
    
    @app.route('/admin')
    def admin():
        """后台管理页面"""
        return send_from_directory(ROOT_DIR, 'admin.html')
    
    @app.route('/parking')
    def parking():
        """停车页面"""
        return send_from_directory(ROOT_DIR, 'parking.html')
    
    @app.route('/facilities')
    def facilities():
        """设施页面"""
        return send_from_directory(ROOT_DIR, 'facilities.html')
    
    @app.route('/operator')
    def operator():
        """运营页面"""
        return send_from_directory(ROOT_DIR, 'opreater.html')
    
    @app.route('/<path:path>')
    def serve_static(path):
        """静态文件服务"""
        return send_from_directory(ROOT_DIR, path)