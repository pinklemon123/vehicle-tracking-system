/**
 * WebSocket服务
 */

class WSClient {
    constructor(options = {}) {
        this.url = options.url || CONFIG.server?.websocket?.url || 'ws://localhost:5000';
        this.reconnectInterval = options.reconnectInterval || 5000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
        
        this.socket = null;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        this.isManualClose = false;
        
        this.onMessage = options.onMessage;
        this.onConnect = options.onConnect;
        this.onDisconnect = options.onDisconnect;
        
        this.connect();
    }
    
    /**
     * 连接WebSocket
     */
    connect() {
        try {
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = () => {
                console.log('WebSocket连接成功');
                this.reconnectAttempts = 0;
                this._startHeartbeat();
                
                if (this.onConnect) {
                    this.onConnect();
                }
                
                eventBus.emit(EVENTS.WS_CONNECTED);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'pong') {
                        return;
                    }
                    
                    if (this.onMessage) {
                        this.onMessage(data);
                    }
                    
                    eventBus.emit(EVENTS.WS_MESSAGE, data);
                } catch (error) {
                    console.error('解析WebSocket消息失败:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('WebSocket连接关闭');
                this._stopHeartbeat();
                
                if (!this.isManualClose) {
                    this._reconnect();
                }
                
                if (this.onDisconnect) {
                    this.onDisconnect();
                }
                
                eventBus.emit(EVENTS.WS_DISCONNECTED);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket错误:', error);
            };
            
        } catch (error) {
            console.error('创建WebSocket失败:', error);
            this._reconnect();
        }
    }
    
    /**
     * 发送消息
     */
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
            return true;
        }
        return false;
    }
    
    /**
     * 关闭连接
     */
    close() {
        this.isManualClose = true;
        this._stopHeartbeat();
        this._clearReconnectTimer();
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    
    /**
     * 重新连接
     */
    _reconnect() {
        if (this.isManualClose) return;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('WebSocket重连次数已达上限');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`WebSocket尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this._clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }
    
    /**
     * 开始心跳
     */
    _startHeartbeat() {
        this._stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.send({ type: 'ping' });
        }, this.heartbeatInterval);
    }
    
    /**
     * 停止心跳
     */
    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * 清除重连定时器
     */
    _clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

// 导出（使用类名，实例由调用方创建）