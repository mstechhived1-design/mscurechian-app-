import * as ReactNative from 'react-native';

const polyfill = {
  runAfterInteractions(task?: any) {
    let handle: any;
    const promise = new Promise<any>((resolve) => {
      if (typeof requestIdleCallback === 'function') {
        handle = requestIdleCallback(() => {
          resolve(typeof task === 'function' ? task() : (task && typeof task.gen === 'function' ? task.gen() : undefined));
        });
      } else {
        handle = setTimeout(() => {
          resolve(typeof task === 'function' ? task() : (task && typeof task.gen === 'function' ? task.gen() : undefined));
        }, 1);
      }
    });

    return {
      then: promise.then.bind(promise),
      done: (...args: any[]) => {
        if ((promise as any).done) {
          (promise as any).done(...args);
        } else {
          promise.then(...(args as [any]));
        }
      },
      cancel: () => {
        if (typeof cancelIdleCallback === 'function') {
          cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      },
    };
  },
  createInteractionHandle() {
    return 1;
  },
  clearInteractionHandle(_handle?: any) {},
  setDeadline(_deadline?: any) {},
  Events: {
    interactionStart: 'interactionStart',
    interactionComplete: 'interactionComplete',
  },
  addListener: () => ({ remove: () => {} }),
};

try {
  Object.defineProperty(ReactNative, 'InteractionManager', {
    configurable: true,
    enumerable: true,
    get: () => polyfill,
    set: () => {},
  });
} catch {
  try {
    (ReactNative as any).InteractionManager = polyfill;
  } catch {}
}

export default polyfill;
