"""
路由模块初始化
"""

from server.routes.static_routes import register_static_routes
from server.routes.vehicle_routes import register_vehicle_routes
from server.routes.fence_routes import register_fence_routes
from server.routes.facility_routes import register_facility_routes
from server.routes.api_routes import register_api_routes


def register_all_routes(app, services):
    """注册所有路由"""
    register_static_routes(app, services)
    register_vehicle_routes(app, services)
    register_fence_routes(app, services)
    register_facility_routes(app, services)
    register_api_routes(app, services)

__all__ = ['register_all_routes']