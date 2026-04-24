"""
WebSocket事件处理
"""

from flask import request
from flask_socketio import emit
from datetime import datetime


class SocketHandlers:
    """Socket事件处理器"""
    
    def __init__(self, socketio, services):
        self.socketio = socketio
        self.vehicle_service = services.get('vehicle_service')
        self.fence_service = services.get('fence_service')
        self.alarm_service = services.get('alarm_service')
        self.simulator = services.get('simulator')
        
        self.connected_clients = set()
        
        # 注册事件
        self._register_events()
        
        # 设置模拟器回调
        if self.simulator:
            self.simulator.add_callback(self._on_vehicle_updates)
        
        # 设置报警观察者
        self.alarm_service.add_observer(self._on_new_alarm)
    
    def _register_events(self):
        """注册Socket事件"""
        
        @self.socketio.on('connect')
        def handle_connect():
            client_id = request.sid
            self.connected_clients.add(client_id)
            print(f'[WebSocket] 客户端连接: {client_id}')
            
            # 发送当前状态
            self._send_initial_data()
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            client_id = request.sid
            self.connected_clients.discard(client_id)
            print(f'[WebSocket] 客户端断开: {client_id}')
        
        @self.socketio.on('ping')
        def handle_ping():
            emit('pong', {'timestamp': datetime.now().isoformat()})
        
        @self.socketio.on('get_vehicles')
        def handle_get_vehicles():
            vehicles = self.vehicle_service.get_all()
            emit('vehicles_data', {
                'vehicles': [v.to_dict() for v in vehicles]
            })
        
        @self.socketio.on('update_vehicle_position')
        def handle_update_position(data):
            vehicle_id = data.get('vehicle_id')
            lng = data.get('lng')
            lat = data.get('lat')
            speed = data.get('speed')
            
            vehicle = self.vehicle_service.update_position(vehicle_id, lng, lat, speed)
            
            if vehicle:
                # 检查围栏状态
                self._check_fence_status(vehicle)
                
                # 广播位置更新
                emit('vehicle_position_updated', {
                    'vehicle_id': vehicle_id,
                    'lat': vehicle.lat,
                    'lng': vehicle.lng,
                    'speed': vehicle.speed
                }, broadcast=True)
        
        @self.socketio.on('set_fence')
        def handle_set_fence(data):
            points = data.get('points', [])
            name = data.get('name', '电子围栏')
            
            fence = self.fence_service.set_points(points)
            if fence:
                fence.name = name
                emit('fence_updated', {'fence': fence.to_dict()}, broadcast=True)
                print(f'[WebSocket] 电子围栏已设置: {len(points)} 个点')
        
        @self.socketio.on('clear_fence')
        def handle_clear_fence():
            self.fence_service.clear()
            emit('fence_deleted', broadcast=True)
            print('[WebSocket] 电子围栏已清除')
    
    def _send_initial_data(self):
        """发送初始数据"""
        vehicles = self.vehicle_service.get_all()
        fence = self.fence_service.get()
        alarms = self.alarm_service.get_all(10)
        
        emit('connected', {
            'client_id': request.sid,
            'vehicles': [v.to_dict() for v in vehicles],
            'fence': fence.to_dict() if fence else None,
            'alarms': [a.to_dict() for a in alarms],
            'timestamp': datetime.now().isoformat()
        })
    
    def _on_vehicle_updates(self, updates):
        """车辆更新回调"""
        self.socketio.emit('vehicles_batch_update', {'vehicles': updates})
    
    def _on_new_alarm(self, alarm):
        """新报警回调"""
        self.socketio.emit('new_alarm', {'alarm': alarm.to_dict()})
    
    def _check_fence_status(self, vehicle):
        """检查围栏状态"""
        if not self.fence_service.is_valid():
            return
        
        is_in_fence = self.fence_service.contains(vehicle.lng, vehicle.lat)
        changed = vehicle.set_fence_status(is_in_fence)
        
        if changed:
            event_type = 'enter' if is_in_fence else 'leave'
            self.alarm_service.create_fence_alarm(vehicle, event_type)
    
    def get_client_count(self):
        """获取连接客户端数量"""
        return len(self.connected_clients)