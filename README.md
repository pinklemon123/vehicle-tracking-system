# 车辆定位可视化系统

这是一个基于Python Flask和WebSocket的车辆定位可视化系统，支持自定义电子围栏、动态车辆管理和后台监控。

## 功能特性

- ✅ 实时显示多个车辆位置（1-20辆可调）
- ✅ 车辆轨迹回放
- ✅ 自定义电子围栏（绘制多边形）
- ✅ 车辆超出围栏实时报警
- ✅ 后台管理系统（报警历史、统计数据）
- ✅ WebSocket实时通信

## 技术栈

- 后端：Python Flask + Flask-SocketIO
- 前端：HTML + JavaScript + Leaflet.js + Leaflet.Draw
- 通信：WebSocket
- 地图：OpenStreetMap

## 安装和运行

1. 安装Python依赖：
   ```
   pip install -r requirements.txt
   ```

2. 运行应用：
   ```
   python app.py
   ```

3. 在浏览器中访问：
   - 主页面：http://localhost:5000
   - 后台管理：http://localhost:5000/admin

## 使用说明

### 主页面功能
- **车辆数量控制**：左侧面板可调整车辆数量（1-20辆）
- **绘制围栏**：点击"绘制围栏"按钮，在地图上绘制多边形围栏
- **清除围栏**：清除当前围栏设置
- **实时监控**：右侧面板显示车辆列表和围栏状态
- **报警提示**：车辆超出围栏时会弹出报警并在面板显示

### 后台管理功能
- **统计数据**：显示当前车辆数量、总报警次数、围栏状态等
- **报警历史**：查看最近20条报警记录详情
- **自动刷新**：每30秒自动更新数据

## 数据格式

后端通过WebSocket推送车辆位置数据：
```json
{
  "car1": {"id": "car1", "x": 39.9042, "y": 116.4074, "color": "#ff0000"},
  "car2": {"id": "car2", "x": 39.9142, "y": 116.4174, "color": "#00ff00"}
}
```

报警数据格式：
```json
{
  "id": 1,
  "car_id": "car1",
  "message": "车辆 car1 已超出电子围栏！",
  "time": "2024-01-01 12:00:00",
  "location": "(39.9042, 116.4074)"
}
```

## API接口

- `GET /api/stats` - 获取系统统计数据
- `GET /api/alarms` - 获取报警历史记录

## 项目结构

```
vehicle-tracking-system/
├── app.py                 # Flask后端服务器
├── requirements.txt       # Python依赖
├── templates/
│   ├── index.html        # 主页面
│   └── admin.html        # 后台管理页面
└── README.md             # 项目说明
```
