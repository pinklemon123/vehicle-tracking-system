/**
 * 报警管理器
 */

class AlarmManager {
    constructor() {
        this.alarms = [];
        this.maxAlarms = CONFIG.alarm.maxAlarms || 100;
        this.onNewAlarm = null;
    }
    
    /**
     * 添加报警
     */
    add(alarmData) {
        const alarm = {
            id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: alarmData.type || 'info',
            level: alarmData.level || 'info',
            message: alarmData.message || '未知报警',
            vehicleId: alarmData.vehicleId,
            vehicleName: alarmData.vehicleName,
            time: alarmData.time || new Date().toISOString(),
            read: false
        };
        
        this.alarms.unshift(alarm);
        
        // 限制最大数量
        if (this.alarms.length > this.maxAlarms) {
            this.alarms = this.alarms.slice(0, this.maxAlarms);
        }
        
        if (this.onNewAlarm) {
            this.onNewAlarm(alarm);
        }
        
        eventBus.emit(EVENTS.ALARM_NEW, alarm);
        
        return alarm;
    }
    
    /**
     * 获取所有报警
     */
    getAll() {
        return this.alarms;
    }
    
    /**
     * 获取未读报警
     */
    getUnread() {
        return this.alarms.filter(a => !a.read);
    }
    
    /**
     * 标记为已读
     */
    markRead(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.read = true;
        }
    }
    
    /**
     * 标记所有为已读
     */
    markAllRead() {
        this.alarms.forEach(a => a.read = true);
        eventBus.emit(EVENTS.ALARM_CLEARED);
    }
    
    /**
     * 清除所有报警
     */
    clear() {
        this.alarms = [];
        eventBus.emit(EVENTS.ALARM_CLEARED);
    }
    
    /**
     * 获取未读数量
     */
    getUnreadCount() {
        return this.getUnread().length;
    }
}