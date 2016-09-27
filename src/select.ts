import { isFunction, isString, get } from 'lodash';
import { Store, StoreSelector } from './Store';

export interface ReduxSelectConfig {
  subscribe?: boolean|string;
}


/**
 * Decorates a property that represents derived data from the applications store.
 * 
 * @export
 * @template S The root application state.
 * @template T The return type of the selector.
 * @param {(string|Array<string|number>|StoreSelector<S, T>|null)} [selector] If a string is used it will be used
 *   as a path to access on the root state. The path can also be an array of strings representing a path. If a function 
 *   is used, it will be invoked with the root state. If not value is given then the property name will be used as the path.
 * @param {ReduxSelectConfig} [config={}] A config object to configure behavior.
 * @returns {PropertyDecorator}

 */
export function select<S, T>(selector?: string|Array<string|number>|StoreSelector<S, T>|null, config: ReduxSelectConfig = {}): PropertyDecorator {
  return function(target: any, propertyKey: string): void {
    const handlerName = isString(config.subscribe) ? config.subscribe as string : `${propertyKey}Changed`;
    let lastValue: T;
    let lastChangeId: number;
    
    if (!selector) {
      selector = propertyKey;
    }
    
    (getter as any).__redux__ = true;

    if (delete target[propertyKey]) {
      Object.defineProperty(target, propertyKey, {
        get: getter,
        enumerable: true,
        configurable: true
      });
    }
    
    if (config.subscribe) {
      // This needs to come after we define the getter to get the correct observer.
      Store.queue(() => Store.instance.observe(target, propertyKey, observer));
    }
    
    function getter(): T {
      let value = lastValue;
      
      if (Store.instance.changeId !== lastChangeId) {
        value = Store.instance.select(selector as StoreSelector<S, T>);
        lastValue = value;
        lastChangeId = Store.instance.changeId;
      }

      return value
    }

    function observer(...args: any[]): void {
      target[handlerName].apply(target, args);
    }
  }
}