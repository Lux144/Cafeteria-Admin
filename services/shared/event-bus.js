const { EventEmitter } = require('events');
const { createLogger } = require('./logger');

const logger = createLogger('EventBus');

// Shared memory bus fallback (works in standalone single-process or can be bridged)
class LocalEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  async publish(channel, data) {
    logger.info(`[EventBus] Broadcast event '${channel}'`, { channel, dataSummary: typeof data === 'object' ? Object.keys(data) : data });
    this.emit(channel, data);
    return true;
  }

  subscribe(channel, handler) {
    this.on(channel, handler);
    return () => this.off(channel, handler);
  }

  async health() {
    return {
      status: 'up',
      type: 'in-memory-pubsub',
      listeners: this.eventNames().length
    };
  }
}

// Global instance to share across modules in same process or fallback
let busInstance = global.__CAFE_EVENT_BUS__ || new LocalEventBus();
global.__CAFE_EVENT_BUS__ = busInstance;

function getEventBus(serviceName = 'service') {
  const serviceLogger = createLogger(`${serviceName}:EventBus`);
  return {
    async publish(channel, data) {
      serviceLogger.info(`Published event: ${channel}`);
      return busInstance.publish(channel, data);
    },
    subscribe(channel, handler) {
      serviceLogger.info(`Subscribed to: ${channel}`);
      return busInstance.subscribe(channel, handler);
    },
    health() {
      return busInstance.health();
    }
  };
}

module.exports = { getEventBus, LocalEventBus };
