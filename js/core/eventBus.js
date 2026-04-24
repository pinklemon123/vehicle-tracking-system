/**
 * 事件总线 - 用于组件间通信
 */

class EventBus {
    constructor() {
        this.events = new Map();
    }
    
    /**
     * 订阅事件
     */
    on(event, callback, context = null) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push({ callback, context });
    }
    
    /**
     * 取消订阅
     */
    off(event, callback = null) {
        if (!this.events.has(event)) return;
        
        if (!callback) {
            this.events.delete(event);
            return;
        }
        
        const handlers = this.events.get(event);
        const index = handlers.findIndex(h => h.callback === callback);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }
    
    /**
     * 触发事件
     */
    emit(event, ...args) {
        if (!this.events.has(event)) return;
        
        const handlers = this.events.get(event);
        for (const handler of handlers) {
            handler.callback.apply(handler.context, args);
        }
    }
    
    /**
     * 只订阅一次
     */
    once(event, callback, context = null) {
        const wrapper = (...args) => {
            callback.apply(context, args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
    
    /**
     * 清除所有事件
     */
    clear() {
        this.events.clear();
    }
}

// 创建全局单例
const eventBus = new EventBus();

// 事件常量
const EVENTS = {
    MAP_READY: 'map:ready',
    MAP_CLICK: 'map:click',
    MAP_MOVE: 'map:move',
    VEHICLE_ADDED: 'vehicle:added',
    VEHICLE_UPDATED: 'vehicle:updated',
    VEHICLE_REMOVED: 'vehicle:removed',
    VEHICLE_SELECTED: 'vehicle:selected',
    FENCE_UPDATED: 'fence:updated',
    FENCE_CLEARED: 'fence:cleared',
    ALARM_NEW: 'alarm:new',
    ALARM_CLEARED: 'alarm:cleared',
    STATS_UPDATED: 'stats:updated',
    WS_CONNECTED: 'ws:connected',
    WS_DISCONNECTED: 'ws:disconnected',
    WS_MESSAGE: 'ws:message'
};