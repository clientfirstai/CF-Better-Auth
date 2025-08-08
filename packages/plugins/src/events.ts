/**
 * Plugin Event System for CF-Better-Auth
 * Manages event emission, subscription, and routing between plugins
 */

import { EventEmitter } from 'eventemitter3';
import type {
  BasePlugin,
  PluginContext,
  PluginRegistry,
  EventHandler
} from '@cf-auth/types';

import type { PluginEventData } from './types';

import {
  PluginError,
  createPluginError,
  PluginErrorHandler
} from './errors';

import {
  PLUGIN_EVENTS,
  PLUGIN_STATUS
} from './constants';

import { debounce, throttle } from './utils';

/**
 * Event subscription info
 */
interface EventSubscription {
  pluginId: string;
  event: string;
  handler: EventHandler;
  options: EventSubscriptionOptions;
  active: boolean;
}

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  priority?: number;
  once?: boolean;
  debounce?: number;
  throttle?: number;
  condition?: (data: any) => boolean;
  transform?: (data: any) => any;
}

/**
 * Event statistics
 */
interface EventStats {
  eventName: string;
  totalEmissions: number;
  totalSubscriptions: number;
  lastEmission: Date | null;
  subscribedPlugins: Set<string>;
}

/**
 * Event emission context
 */
interface EventEmissionContext {
  event: string;
  data: any;
  source: string;
  timestamp: Date;
  propagationStopped: boolean;
}

/**
 * Plugin Event System Implementation
 */
export class PluginEventSystem extends EventEmitter {
  private subscriptions = new Map<string, EventSubscription[]>();
  private eventStats = new Map<string, EventStats>();
  private errorHandler: PluginErrorHandler;
  private registry?: PluginRegistry;
  private contextGetter?: (pluginId: string) => PluginContext | null;
  private maxListeners = 100;

  constructor() {
    super();
    this.errorHandler = PluginErrorHandler.getInstance();
    this.setMaxListeners(this.maxListeners);
  }

  /**
   * Initialize the event system
   */
  async initialize(options: EventSystemOptions = {}): Promise<void> {
    this.registry = options.registry;
    this.contextGetter = options.contextGetter;
    this.maxListeners = options.maxListeners || 100;

    this.setMaxListeners(this.maxListeners);

    // Initialize built-in event stats
    this.initializeBuiltInEvents();

    this.emit('events:initialized');
  }

  /**
   * Subscribe to an event
   */
  subscribe(
    pluginId: string,
    event: string,
    handler: EventHandler,
    options: EventSubscriptionOptions = {}
  ): () => void {
    try {
      // Validate subscription
      this.validateSubscription(pluginId, event, handler);

      // Process handler with options
      const processedHandler = this.processHandler(handler, options);

      const subscription: EventSubscription = {
        pluginId,
        event,
        handler: processedHandler,
        options,
        active: true,
      };

      // Add to subscriptions
      if (!this.subscriptions.has(event)) {
        this.subscriptions.set(event, []);
      }

      const eventSubscriptions = this.subscriptions.get(event)!;
      eventSubscriptions.push(subscription);

      // Sort by priority (higher priority first)
      eventSubscriptions.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

      // Update stats
      this.updateSubscriptionStats(event, pluginId, true);

      // Register with EventEmitter
      super.on(event, processedHandler);

      this.emit('subscription:added', {
        pluginId,
        event,
        options,
      });

      // Return unsubscribe function
      return () => this.unsubscribe(pluginId, event, handler);

    } catch (error) {
      const eventError = createPluginError(error, pluginId, `subscribe:${event}`);
      this.errorHandler.handleError(eventError);
      throw eventError;
    }
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(pluginId: string, event?: string, handler?: EventHandler): void {
    try {
      if (event && handler) {
        // Remove specific subscription
        this.removeSpecificSubscription(pluginId, event, handler);
      } else if (event) {
        // Remove all subscriptions for event from plugin
        this.removeEventSubscriptions(pluginId, event);
      } else {
        // Remove all subscriptions for plugin
        this.removeAllSubscriptions(pluginId);
      }

      this.emit('subscription:removed', {
        pluginId,
        event,
      });

    } catch (error) {
      const eventError = createPluginError(error, pluginId, `unsubscribe:${event || 'all'}`);
      this.errorHandler.handleError(eventError);
    }
  }

  /**
   * Emit an event
   */
  async emitEvent<T = any>(event: string, data?: T, source = 'system'): Promise<void> {
    try {
      const context: EventEmissionContext = {
        event,
        data,
        source,
        timestamp: new Date(),
        propagationStopped: false,
      };

      this.emit('event:before-emit', context);

      // Update stats
      this.updateEmissionStats(event);

      // Create event data object
      const eventData: PluginEventData = {
        pluginId: source,
        type: event,
        data,
        timestamp: context.timestamp,
        source: 'plugin',
      };

      // Emit the event
      super.emit(event, eventData);

      this.emit('event:after-emit', context);

    } catch (error) {
      const eventError = createPluginError(error, source, `emitEvent:${event}`);
      this.errorHandler.handleError(eventError);
      this.emit('event:error', { event, error: eventError, source });
      throw eventError;
    }
  }

  /**
   * Emit event synchronously
   */
  emitSync<T = any>(event: string, data?: T, source = 'system'): boolean {
    try {
      // Update stats
      this.updateEmissionStats(event);

      // Create event data object
      const eventData: PluginEventData = {
        pluginId: source,
        type: event,
        data,
        timestamp: new Date(),
        source: 'plugin',
      };

      return super.emit(event, eventData);

    } catch (error) {
      const eventError = createPluginError(error, source, `emitSync:${event}`);
      this.errorHandler.handleError(eventError);
      this.emit('event:error', { event, error: eventError, source });
      return false;
    }
  }

  /**
   * Subscribe to event once
   */
  once(
    pluginId: string,
    event: string,
    handler: EventHandler,
    options: Omit<EventSubscriptionOptions, 'once'> = {}
  ): () => void {
    return this.subscribe(pluginId, event, handler, { ...options, once: true });
  }

  /**
   * Get event subscriptions
   */
  getSubscriptions(event?: string): Map<string, EventSubscription[]> | EventSubscription[] {
    if (event) {
      return this.subscriptions.get(event) || [];
    }
    return new Map(this.subscriptions);
  }

  /**
   * Get active subscriptions for a plugin
   */
  getPluginSubscriptions(pluginId: string): EventSubscription[] {
    const pluginSubscriptions: EventSubscription[] = [];
    
    for (const subscriptions of this.subscriptions.values()) {
      const filtered = subscriptions.filter(sub => 
        sub.pluginId === pluginId && sub.active
      );
      pluginSubscriptions.push(...filtered);
    }

    return pluginSubscriptions;
  }

  /**
   * Get event statistics
   */
  getEventStats(event?: string): EventStats | Map<string, EventStats> {
    if (event) {
      return this.eventStats.get(event) || this.createEmptyEventStats(event);
    }
    return new Map(this.eventStats);
  }

  /**
   * Check if event has subscriptions
   */
  hasSubscriptions(event: string): boolean {
    const subscriptions = this.subscriptions.get(event);
    return subscriptions ? subscriptions.some(sub => sub.active) : false;
  }

  /**
   * Get subscription count for event
   */
  getSubscriptionCount(event: string): number {
    const subscriptions = this.subscriptions.get(event);
    return subscriptions ? subscriptions.filter(sub => sub.active).length : 0;
  }

  /**
   * Enable/disable subscription
   */
  setSubscriptionEnabled(pluginId: string, event: string, enabled: boolean): void {
    const subscriptions = this.subscriptions.get(event);
    if (subscriptions) {
      subscriptions.forEach(sub => {
        if (sub.pluginId === pluginId) {
          sub.active = enabled;
        }
      });

      this.emit(enabled ? 'subscription:enabled' : 'subscription:disabled', {
        pluginId,
        event,
      });
    }
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    // Remove all event listeners
    this.removeAllListeners();

    // Clear subscription tracking
    this.subscriptions.clear();
    this.eventStats.clear();

    this.emit('subscriptions:cleared');
  }

  /**
   * Register plugin event handlers
   */
  registerPluginEvents(plugin: BasePlugin, context: PluginContext): void {
    // This would typically register events defined in the plugin manifest
    // For now, this is a placeholder for future event registration patterns
  }

  /**
   * Unregister all events for a plugin
   */
  unregisterPluginEvents(pluginId: string): void {
    this.unsubscribe(pluginId);
  }

  /**
   * Validate subscription parameters
   */
  private validateSubscription(pluginId: string, event: string, handler: EventHandler): void {
    if (!pluginId) {
      throw new PluginError('Plugin ID is required for event subscription');
    }

    if (!event) {
      throw new PluginError('Event name is required for subscription');
    }

    if (typeof handler !== 'function') {
      throw new PluginError('Event handler must be a function');
    }

    // Check if plugin is active
    if (this.registry) {
      const plugin = this.registry.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`);
      }

      const status = this.registry.getStatus(pluginId);
      if (status !== PLUGIN_STATUS.ACTIVE) {
        console.warn(`Plugin ${pluginId} is not active, subscription may not work correctly`);
      }
    }
  }

  /**
   * Process handler with options
   */
  private processHandler(handler: EventHandler, options: EventSubscriptionOptions): EventHandler {
    let processedHandler = handler;

    // Apply condition filter
    if (options.condition) {
      const originalHandler = processedHandler;
      const condition = options.condition;
      processedHandler = (data: any) => {
        if (condition(data)) {
          return originalHandler(data);
        }
      };
    }

    // Apply data transformation
    if (options.transform) {
      const originalHandler = processedHandler;
      const transform = options.transform;
      processedHandler = (data: any) => {
        const transformedData = transform(data);
        return originalHandler(transformedData);
      };
    }

    // Apply debouncing
    if (options.debounce) {
      processedHandler = debounce(processedHandler, options.debounce);
    }

    // Apply throttling
    if (options.throttle) {
      processedHandler = throttle(processedHandler, options.throttle);
    }

    // Apply once behavior (EventEmitter handles this, but we track it)
    if (options.once) {
      const originalHandler = processedHandler;
      processedHandler = (data: any) => {
        const result = originalHandler(data);
        // Mark subscription as inactive after execution
        this.markSubscriptionInactive(handler);
        return result;
      };
    }

    return processedHandler;
  }

  /**
   * Remove specific subscription
   */
  private removeSpecificSubscription(pluginId: string, event: string, handler: EventHandler): void {
    const subscriptions = this.subscriptions.get(event);
    if (subscriptions) {
      const index = subscriptions.findIndex(sub => 
        sub.pluginId === pluginId && sub.handler === handler
      );
      
      if (index >= 0) {
        const subscription = subscriptions[index];
        subscriptions.splice(index, 1);
        
        // Remove from EventEmitter
        super.off(event, subscription.handler);
        
        // Update stats
        this.updateSubscriptionStats(event, pluginId, false);
      }
    }
  }

  /**
   * Remove all subscriptions for event from plugin
   */
  private removeEventSubscriptions(pluginId: string, event: string): void {
    const subscriptions = this.subscriptions.get(event);
    if (subscriptions) {
      const pluginSubscriptions = subscriptions.filter(sub => sub.pluginId === pluginId);
      
      pluginSubscriptions.forEach(sub => {
        const index = subscriptions.indexOf(sub);
        if (index >= 0) {
          subscriptions.splice(index, 1);
          super.off(event, sub.handler);
        }
      });

      // Update stats
      if (pluginSubscriptions.length > 0) {
        this.updateSubscriptionStats(event, pluginId, false);
      }
    }
  }

  /**
   * Remove all subscriptions for plugin
   */
  private removeAllSubscriptions(pluginId: string): void {
    for (const [event, subscriptions] of this.subscriptions.entries()) {
      const pluginSubscriptions = subscriptions.filter(sub => sub.pluginId === pluginId);
      
      pluginSubscriptions.forEach(sub => {
        const index = subscriptions.indexOf(sub);
        if (index >= 0) {
          subscriptions.splice(index, 1);
          super.off(event, sub.handler);
        }
      });

      // Update stats
      if (pluginSubscriptions.length > 0) {
        this.updateSubscriptionStats(event, pluginId, false);
      }
    }
  }

  /**
   * Mark subscription as inactive
   */
  private markSubscriptionInactive(handler: EventHandler): void {
    for (const subscriptions of this.subscriptions.values()) {
      const subscription = subscriptions.find(sub => sub.handler === handler);
      if (subscription) {
        subscription.active = false;
        break;
      }
    }
  }

  /**
   * Initialize built-in event statistics
   */
  private initializeBuiltInEvents(): void {
    Object.values(PLUGIN_EVENTS).forEach(event => {
      if (!this.eventStats.has(event)) {
        this.eventStats.set(event, this.createEmptyEventStats(event));
      }
    });
  }

  /**
   * Update subscription statistics
   */
  private updateSubscriptionStats(event: string, pluginId: string, added: boolean): void {
    if (!this.eventStats.has(event)) {
      this.eventStats.set(event, this.createEmptyEventStats(event));
    }

    const stats = this.eventStats.get(event)!;
    
    if (added) {
      stats.totalSubscriptions++;
      stats.subscribedPlugins.add(pluginId);
    } else {
      stats.totalSubscriptions = Math.max(0, stats.totalSubscriptions - 1);
      
      // Check if plugin still has subscriptions for this event
      const subscriptions = this.subscriptions.get(event) || [];
      const hasActiveSubscriptions = subscriptions.some(sub => 
        sub.pluginId === pluginId && sub.active
      );
      
      if (!hasActiveSubscriptions) {
        stats.subscribedPlugins.delete(pluginId);
      }
    }
  }

  /**
   * Update emission statistics
   */
  private updateEmissionStats(event: string): void {
    if (!this.eventStats.has(event)) {
      this.eventStats.set(event, this.createEmptyEventStats(event));
    }

    const stats = this.eventStats.get(event)!;
    stats.totalEmissions++;
    stats.lastEmission = new Date();
  }

  /**
   * Create empty event statistics
   */
  private createEmptyEventStats(event: string): EventStats {
    return {
      eventName: event,
      totalEmissions: 0,
      totalSubscriptions: 0,
      lastEmission: null,
      subscribedPlugins: new Set(),
    };
  }
}

/**
 * Event system options
 */
export interface EventSystemOptions {
  registry?: PluginRegistry;
  contextGetter?: (pluginId: string) => PluginContext | null;
  maxListeners?: number;
  enableStats?: boolean;
}

/**
 * Create event system instance
 */
export function createEventSystem(options?: EventSystemOptions): PluginEventSystem {
  return new PluginEventSystem();
}