import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "ts-event-system",
  title: "Event System",
  icon: "📡",
  description: "Build event-driven systems from scratch: EventEmitter, pub/sub, and the observer pattern — classic JS interview territory.",
  accentColor: "#6366f1",
  challenges: [
    {
      id: "event-emitter",
      topicId: "ts-event-system",
      title: "Implement an EventEmitter with on, off, emit",
      difficulty: "medium",
      description:
        "Implement an `EventEmitter` class with three methods: `on(event, listener)` — registers a listener; `off(event, listener)` — removes that specific listener; `emit(event, ...args)` — calls all listeners registered for that event, passing any args. Multiple listeners per event must be supported.",
      concepts: ["Map", "EventEmitter", "callbacks", "observer pattern"],
      starterCode: `class EventEmitter {
  constructor() {
    // TODO: initialize storage for event → listeners[]
  }

  on(event, listener) {
    // TODO: register listener for event
  }

  off(event, listener) {
    // TODO: remove this specific listener from event
  }

  emit(event, ...args) {
    // TODO: call all listeners for event with args
  }
}

// Usage:
// const emitter = new EventEmitter();
// const handler = (msg) => console.log(msg);
// emitter.on("message", handler);
// emitter.emit("message", "hello");  // logs "hello"
// emitter.off("message", handler);
// emitter.emit("message", "bye");    // nothing logged`,
      hints: [
        "Use `this.listeners = new Map()` in the constructor.",
        "`on`: `if (!this.listeners.has(event)) this.listeners.set(event, []); this.listeners.get(event).push(listener);`",
        "`off`: filter out the listener — `this.listeners.set(event, arr.filter(l => l !== listener))`.",
        "`emit`: `(this.listeners.get(event) || []).forEach(l => l(...args))`.",
      ],
      tests: [
        {
          description: "on + emit calls the listener",
          code: `
it("emit calls registered listener with args", () => {
  const emitter = new EventEmitter();
  let received = null;
  emitter.on("data", (v) => { received = v; });
  emitter.emit("data", 42);
  expect(received).toBe(42);
});`,
        },
        {
          description: "multiple listeners all get called",
          code: `
it("all listeners for an event are called", () => {
  const emitter = new EventEmitter();
  const calls = [];
  emitter.on("tick", () => calls.push(1));
  emitter.on("tick", () => calls.push(2));
  emitter.emit("tick");
  expect(calls.length).toBe(2);
});`,
        },
        {
          description: "off removes only the specified listener",
          code: `
it("off removes only the specified listener", () => {
  const emitter = new EventEmitter();
  const calls = [];
  const a = () => calls.push("a");
  const b = () => calls.push("b");
  emitter.on("x", a);
  emitter.on("x", b);
  emitter.off("x", a);
  emitter.emit("x");
  expect(calls.length).toBe(1);
  expect(calls[0]).toBe("b");
});`,
        },
        {
          description: "emit on unknown event does not throw",
          code: `
it("emitting unknown event does not throw", () => {
  const emitter = new EventEmitter();
  expect(() => emitter.emit("nonexistent")).not.toThrow();
});`,
        },
        {
          description: "emit passes multiple args",
          code: `
it("emit passes multiple arguments to listener", () => {
  const emitter = new EventEmitter();
  let result = null;
  emitter.on("sum", (a, b) => { result = a + b; });
  emitter.emit("sum", 3, 7);
  expect(result).toBe(10);
});`,
        },
      ],
      estimatedMinutes: 20,
    },
    {
      id: "once-listener",
      topicId: "ts-event-system",
      title: "Add once(event, listener) to EventEmitter",
      difficulty: "easy",
      description:
        "Extend your `EventEmitter` with a `once(event, listener)` method that registers a listener which automatically removes itself after being called the first time. The rest of `on`/`off`/`emit` behaviour stays the same.",
      concepts: ["EventEmitter", "self-removing listener", "closures"],
      starterCode: `class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(listener);
    return this;
  }

  off(event, listener) {
    const arr = this.listeners.get(event) || [];
    this.listeners.set(event, arr.filter(l => l !== listener));
    return this;
  }

  emit(event, ...args) {
    (this.listeners.get(event) || []).forEach(l => l(...args));
    return this;
  }

  once(event, listener) {
    // TODO: register a wrapper that calls listener once then removes itself
  }
}`,
      hints: [
        "Create a wrapper: `const wrapper = (...args) => { listener(...args); this.off(event, wrapper); };`",
        "Register the wrapper: `this.on(event, wrapper)`.",
        "When emit fires, `wrapper` runs, calls `listener`, then removes `wrapper` from the listeners list.",
      ],
      tests: [
        {
          description: "once listener fires exactly once",
          code: `
it("once listener fires only once", () => {
  const emitter = new EventEmitter();
  let count = 0;
  emitter.once("ping", () => { count++; });
  emitter.emit("ping");
  emitter.emit("ping");
  emitter.emit("ping");
  expect(count).toBe(1);
});`,
        },
        {
          description: "once listener receives args correctly",
          code: `
it("once listener receives emitted args", () => {
  const emitter = new EventEmitter();
  let received = null;
  emitter.once("msg", (v) => { received = v; });
  emitter.emit("msg", "hello");
  expect(received).toBe("hello");
});`,
        },
        {
          description: "on listeners still work after once fires",
          code: `
it("regular on listeners still fire after once completes", () => {
  const emitter = new EventEmitter();
  const onCalls = [];
  emitter.on("event", () => onCalls.push(1));
  emitter.once("event", () => {});
  emitter.emit("event");
  emitter.emit("event");
  expect(onCalls.length).toBe(2);
});`,
        },
      ],
      estimatedMinutes: 12,
    },
    {
      id: "pub-sub",
      topicId: "ts-event-system",
      title: "Implement a PubSub system",
      difficulty: "medium",
      description:
        "Implement a `createPubSub()` factory that returns `{ subscribe, publish, unsubscribe }`. `subscribe(topic, callback)` returns an unsubscribe token (an id). `publish(topic, data)` calls all subscribers for that topic. `unsubscribe(token)` removes the subscriber identified by that token.",
      concepts: ["pub/sub", "factory function", "Map", "tokens"],
      starterCode: `function createPubSub() {
  // TODO: return { subscribe, publish, unsubscribe }
  // subscribe(topic, cb) → returns a unique token (number or string)
  // publish(topic, data) → calls all callbacks for topic with data
  // unsubscribe(token)   → removes the subscriber with that token
}

// Usage:
// const ps = createPubSub();
// const token1 = ps.subscribe("news", data => console.log("A:", data));
// const token2 = ps.subscribe("news", data => console.log("B:", data));
// ps.publish("news", { headline: "Big news!" }); // A and B both called
// ps.unsubscribe(token1);
// ps.publish("news", { headline: "More news" }); // only B called`,
      hints: [
        "Use two Maps: `topics: Map<topic, Map<token, callback>>` or `topics: Map<topic, {token, cb}[]>`.",
        "For tokens: use a counter `let nextId = 0` that increments on each subscribe.",
        "Also store a reverse map `tokenMap: Map<token, topic>` so you can find the topic from a token in `unsubscribe`.",
        "Or: store `{ token, cb }` objects in the topic array and filter them out on unsubscribe.",
      ],
      tests: [
        {
          description: "subscribe + publish calls the callback",
          code: `
it("publish calls subscriber callback with data", () => {
  const ps = createPubSub();
  let received = null;
  ps.subscribe("news", (d) => { received = d; });
  ps.publish("news", "breaking");
  expect(received).toBe("breaking");
});`,
        },
        {
          description: "multiple subscribers all receive data",
          code: `
it("all subscribers for a topic receive the data", () => {
  const ps = createPubSub();
  const calls = [];
  ps.subscribe("tick", () => calls.push("a"));
  ps.subscribe("tick", () => calls.push("b"));
  ps.publish("tick", null);
  expect(calls.length).toBe(2);
});`,
        },
        {
          description: "unsubscribe stops the subscriber",
          code: `
it("unsubscribed callback is not called on next publish", () => {
  const ps = createPubSub();
  let count = 0;
  const token = ps.subscribe("event", () => { count++; });
  ps.publish("event", null);
  ps.unsubscribe(token);
  ps.publish("event", null);
  expect(count).toBe(1);
});`,
        },
        {
          description: "different topics are isolated",
          code: `
it("subscribing to 'a' does not receive publishes to 'b'", () => {
  const ps = createPubSub();
  let called = false;
  ps.subscribe("a", () => { called = true; });
  ps.publish("b", "data");
  expect(called).toBe(false);
});`,
        },
        {
          description: "publish to topic with no subscribers does not throw",
          code: `
it("publishing to topic with no subscribers is safe", () => {
  const ps = createPubSub();
  expect(() => ps.publish("empty", "data")).not.toThrow();
});`,
        },
      ],
      estimatedMinutes: 25,
    },
    {
      id: "observable",
      topicId: "ts-event-system",
      title: "Implement a basic Observable (subscribe with next/complete)",
      difficulty: "medium",
      description:
        "Implement `createObservable(subscribeFn)` that returns an object with a `subscribe(observer)` method. `observer` is `{ next, complete, error }`. The observable calls `subscribeFn(observer)` on subscribe. Implement `map(fn)` and `filter(fn)` operators as standalone functions that take an observable and return a new one.",
      concepts: ["observable pattern", "functional composition", "callbacks"],
      starterCode: `function createObservable(subscribeFn) {
  return {
    subscribe(observer) {
      // TODO: call subscribeFn passing the observer
      // observer = { next, complete, error }
      subscribeFn(observer);
    }
  };
}

function map(observable, transformFn) {
  // TODO: return a new observable that calls transformFn on each next value
}

function filter(observable, predicateFn) {
  // TODO: return a new observable that only emits values where predicateFn is true
}

// Usage:
// const numbers = createObservable(obs => {
//   obs.next(1); obs.next(2); obs.next(3); obs.complete();
// });
//
// const doubled = map(numbers, x => x * 2);
// doubled.subscribe({ next: v => console.log(v) }); // 2, 4, 6
//
// const evens = filter(numbers, x => x % 2 === 0);
// evens.subscribe({ next: v => console.log(v) }); // 2`,
      hints: [
        "`map`: return a new observable whose `subscribeFn` subscribes to the original, passing each value through `transformFn`.",
        "`filter`: same idea — only call `observer.next(value)` when `predicateFn(value)` is true.",
        "Guard against missing observer methods: `if (observer.next) observer.next(val)`.",
      ],
      tests: [
        {
          description: "observable calls next for each emitted value",
          code: `
it("observable emits values via next", () => {
  const values = [];
  const obs = createObservable(o => {
    o.next(1); o.next(2); o.next(3);
  });
  obs.subscribe({ next: v => values.push(v) });
  expect(values).toEqual([1, 2, 3]);
});`,
        },
        {
          description: "complete is called at the end",
          code: `
it("observable calls complete", () => {
  let done = false;
  const obs = createObservable(o => { o.next(1); o.complete(); });
  obs.subscribe({ next: () => {}, complete: () => { done = true; } });
  expect(done).toBe(true);
});`,
        },
        {
          description: "map transforms values",
          code: `
it("map transforms each emitted value", () => {
  const values = [];
  const src = createObservable(o => { o.next(1); o.next(2); o.next(3); });
  const doubled = map(src, x => x * 2);
  doubled.subscribe({ next: v => values.push(v) });
  expect(values).toEqual([2, 4, 6]);
});`,
        },
        {
          description: "filter passes only matching values",
          code: `
it("filter passes only values matching predicate", () => {
  const values = [];
  const src = createObservable(o => { o.next(1); o.next(2); o.next(3); o.next(4); });
  const evens = filter(src, x => x % 2 === 0);
  evens.subscribe({ next: v => values.push(v) });
  expect(values).toEqual([2, 4]);
});`,
        },
      ],
      estimatedMinutes: 25,
    },
  ],
};

export default topic;
