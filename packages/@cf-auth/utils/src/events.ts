/**
 * Event utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides event emitter, pub/sub, and event handling
 * utilities with type safety and performance optimizations.
 */

import type { Brand } from '@cf-auth/types';
import { EVENT_CONSTANTS } from './constants';

export type EventName = Brand<string, 'EventName'>;
export type EventId = Brand<string, 'EventId'>;

/**
 * Event interface
 */
export interface Event<T = any> {
  id: EventId;
  name: EventName;
  data: T;
  timestamp: number;
  source?: string;
  priority?: number;
}

/**
 * Event listener type
 */
export type EventListener<T = any> = (event: Event<T>) => void | Promise<void>;

/**
 * Event emitter implementation
 */
export class EventEmitter {
  private listeners = new Map<string, EventListener[]>();
  private maxListeners = 10;
  private once = new Map<string, Set<EventListener>>();

  on<T>(eventName: string, listener: EventListener<T>): this {
    const listeners = this.listeners.get(eventName) || [];
    listeners.push(listener);
    this.listeners.set(eventName, listeners);
    
    this.checkMaxListeners(eventName);
    return this;
  }

  once<T>(eventName: string, listener: EventListener<T>): this {
    const onceSet = this.once.get(eventName) || new Set();
    onceSet.add(listener);
    this.once.set(eventName, onceSet);
    
    return this.on(eventName, listener);
  }

  off<T>(eventName: string, listener: EventListener<T>): this {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.listeners.delete(eventName);
        }
      }
    }
    
    const onceSet = this.once.get(eventName);
    if (onceSet) {
      onceSet.delete(listener);
      if (onceSet.size === 0) {
        this.once.delete(eventName);
      }
    }
    
    return this;
  }

  emit<T>(eventName: string, data: T, options: { source?: string; priority?: number } = {}): boolean {
    const listeners = this.listeners.get(eventName);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    const event: Event<T> = {
      id: this.generateEventId(),
      name: eventName as EventName,
      data,
      timestamp: Date.now(),
      source: options.source,
      priority: options.priority || EVENT_CONSTANTS.PRIORITIES.NORMAL
    };

    const onceSet = this.once.get(eventName);
    
    listeners.forEach(listener => {
      try {
        listener(event);
        
        // Remove once listeners
        if (onceSet?.has(listener)) {
          this.off(eventName, listener);
        }
      } catch (error) {
        console.error(`Error in event listener for '${eventName}':`, error);
      }
    });

    return true;
  }

  removeAllListeners(eventName?: string): this {
    if (eventName) {
      this.listeners.delete(eventName);
      this.once.delete(eventName);
    } else {
      this.listeners.clear();
      this.once.clear();
    }
    return this;
  }

  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.length || 0;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  private checkMaxListeners(eventName: string): void {
    const count = this.listenerCount(eventName);
    if (count > this.maxListeners) {
      console.warn(
        `Possible EventEmitter memory leak detected. ${count} listeners added for event '${eventName}'. ` +
        `Use emitter.setMaxListeners() to increase limit.`
      );
    }
  }

  private generateEventId(): EventId {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}` as EventId;
  }
}

/**
 * Simple pub/sub implementation
 */
export class PubSub {
  private emitter = new EventEmitter();
  private channels = new Map<string, Set<string>>();

  subscribe<T>(channel: string, subscriber: string, handler: EventListener<T>): void {
    const subscribers = this.channels.get(channel) || new Set();
    subscribers.add(subscriber);
    this.channels.set(channel, subscribers);
    
    this.emitter.on(channel, handler);
  }

  unsubscribe(channel: string, subscriber: string): void {
    const subscribers = this.channels.get(channel);
    if (subscribers) {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        this.channels.delete(channel);
        this.emitter.removeAllListeners(channel);
      }
    }
  }

  publish<T>(channel: string, data: T, source?: string): void {
    this.emitter.emit(channel, data, { source });
  }

  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  getSubscriberCount(channel: string): number {
    return this.channels.get(channel)?.size || 0;
  }
}

/**
 * Global event bus
 */
export const eventBus = new EventEmitter();

/**
 * Global pub/sub instance
 */
export const pubsub = new PubSub();

/**
 * Create typed event emitter
 */
export function createEventEmitter<T extends Record<string, any>>(): EventEmitter {
  return new EventEmitter();
}

/**
 * Utility functions
 */
export function debounceEvent<T>(
  emitter: EventEmitter,
  eventName: string,
  delay: number,
  handler: EventListener<T>
): void {
  let timeoutId: NodeJS.Timeout;
  
  emitter.on(eventName, (event) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => handler(event), delay);
  });
}

export function throttleEvent<T>(
  emitter: EventEmitter,
  eventName: string,
  delay: number,
  handler: EventListener<T>
): void {
  let lastCall = 0;
  
  emitter.on(eventName, (event) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      handler(event);
    }
  });
}