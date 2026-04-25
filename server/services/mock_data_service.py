import random
import json
from datetime import datetime, timedelta
from pathlib import Path

class MockDataService:
    """模拟数据服务 - 用于开发和演示"""
    
    def __init__(self):
        self.data_file = Path(__file__).parent.parent.parent / 'data' / 'mock_stats.json'
        self._ensure_data_file()
    
    def _ensure_data_file(self):
        """确保数据文件存在"""
        if not self.data_file.exists():
            self._generate_initial_data()
    
    def _generate_initial_data(self):
        """生成初始模拟数据"""
        initial_data = {
            'current_stats': self._generate_current_stats(),
            'trends': self._generate_trends_data(),
            'alarms': self._generate_alarms(),
            'parking_snapshot': self._generate_parking_snapshot()
        }
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, ensure_ascii=False, indent=2)
    
    def _generate_current_stats(self):
        """生成当前统计数据"""
        return {
            'people': random.randint(1200, 2500),
            'vehicles': random.randint(500, 1200),
            'alarms': random.randint(2, 12),
            'health': random.choice(['正常', '正常', '正常', '注意']),
            'utilization_rate': round(random.uniform(0.55, 0.85), 2),
            'avg_duration': random.randint(35, 90),
            'timestamp': datetime.now().isoformat()
        }
    
    def _generate_trends_data(self):
        """生成7天趋势数据"""
        trends = []
        base_date = datetime.now() - timedelta(days=6)
        for i in range(7):
            date = base_date + timedelta(days=i)
            trends.append({
                'date': date.strftime('%m/%d'),
                'people': random.randint(800, 2200),
                'vehicles': random.randint(300, 1100),
                'alarms': random.randint(0, 15),
                'utilization': round(random.uniform(0.45, 0.88), 2),
                'energy': random.randint(1200, 2800)
            })
        return trends
    
    def _generate_alarms(self):
        """生成告警列表"""
        alarm_types = [
            ('违规停车', 'A区032车位'), ('车位传感器故障', 'B区105车位'),
            ('道闸识别异常', '南门入口'), ('超时占用', 'VIP-008车位'),
            ('消防通道占用', '东侧通道'), ('设备离线', 'C区摄像头')
        ]
        alarms = []
        for i in range(random.randint(3, 8)):
            alarm_type, location = random.choice(alarm_types)
            alarms.append({
                'id': i + 1,
                'type': alarm_type,
                'location': location,
                'time': (datetime.now() - timedelta(minutes=random.randint(5, 120))).strftime('%H:%M'),
                'status': 'unacknowledged',
                'level': random.choice(['warning', 'critical', 'info'])
            })
        return alarms
    
    def _generate_parking_snapshot(self):
        """生成车位快照"""
        spots = []
        for i in range(1, 151):  # 150个车位
            spots.append({
                'id': f'P{i:03d}',
                'area': random.choice(['A', 'B', 'C', 'D']),
                'occupied': random.random() > 0.3,
                'plate': f'粤B{random.randint(10000, 99999)}' if random.random() > 0.7 else None
            })
        return spots
    
    def get_current_stats(self):
        """获取当前统计数据（动态更新）"""
        import random
        # 读取现有数据
        with open(self.data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 动态更新数值
        current = data.get('current_stats', {})
        current['people'] = max(500, current.get('people', 1500) + random.randint(-80, 120))
        current['vehicles'] = max(200, current.get('vehicles', 800) + random.randint(-40, 60))
        current['alarms'] = max(0, current.get('alarms', 5) + random.randint(-2, 3))
        current['utilization_rate'] = round(random.uniform(0.55, 0.85), 2)
        current['timestamp'] = datetime.now().isoformat()
        
        # 更新告警
        if random.random() < 0.3:  # 30%概率新增告警
            new_alarm = self._generate_single_alarm()
            data['alarms'].insert(0, new_alarm)
            if len(data['alarms']) > 15:
                data['alarms'] = data['alarms'][:15]
        
        # 保存更新
        data['current_stats'] = current
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return current
    
    def _generate_single_alarm(self):
        """生成单个告警"""
        alarm_types = [
            ('违规停车', 'A区032车位'), ('车位传感器故障', 'B区105车位'),
            ('道闸识别异常', '南门入口'), ('超时占用', 'VIP-008车位')
        ]
        alarm_type, location = random.choice(alarm_types)
        return {
            'id': random.randint(100, 999),
            'type': alarm_type,
            'location': location,
            'time': datetime.now().strftime('%H:%M'),
            'status': 'unacknowledged',
            'level': random.choice(['warning', 'critical', 'info'])
        }
    
    def get_trends(self):
        """获取趋势数据"""
        with open(self.data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('trends', [])
    
    def get_alarms(self):
        """获取告警列表"""
        with open(self.data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('alarms', [])
    
    def acknowledge_all_alarms(self):
        """确认所有告警"""
        with open(self.data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 将告警标记为已确认
        for alarm in data.get('alarms', []):
            alarm['status'] = 'acknowledged'
        
        # 清空告警或保留已确认状态
        data['current_stats']['alarms'] = 0
        
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return {'success': True, 'message': '已确认所有告警'}
    
    def get_parking_snapshot(self):
        """获取车位快照"""
        with open(self.data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('parking_snapshot', [])
    
    def refresh_data(self):
        """强制刷新所有数据"""
        self._generate_initial_data()
        return {'success': True, 'message': '数据已刷新'}