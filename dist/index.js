var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/index.js
var VERSION = "1.0.0";
var CLIENTS = {
  ANDROID: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID",
    clientVersion: "20.01.35",
    headerName: "3",
    userAgent: "com.google.android.youtube/20.01.35 (Linux; U; Android 12) gzip",
    extra: { androidSdkVersion: 31, osName: "Android", osVersion: "12" }
  },
  IOS: {
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    clientName: "IOS",
    clientVersion: "20.01.2",
    headerName: "5",
    userAgent: "com.google.ios.youtube/20.01.2 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X)",
    extra: { deviceModel: "iPhone16,2", osName: "iOS", osVersion: "18.2" }
  },
  ANDROID_VR: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID_VR",
    clientVersion: "1.54.38",
    headerName: "93",
    userAgent: "Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36",
    extra: { deviceModel: "Quest 2", osName: "Android", osVersion: "10" }
  },
  ANDROID_KIDS: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID_KIDS",
    clientVersion: "8.38.1",
    headerName: "27",
    userAgent: "com.google.android.apps.youtube.kids/8.38.1 (Linux; U; Android 12) gzip",
    extra: { androidSdkVersion: 31, osName: "Android", osVersion: "12" }
  },
  IOS_KIDS: {
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    clientName: "IOS_KIDS",
    clientVersion: "8.38.1",
    headerName: "28",
    userAgent: "com.google.ios.youtubekids/8.38.1 (iPhone14,3; U; CPU iOS 18_2 like Mac OS X)",
    extra: { deviceModel: "iPhone14,3", osName: "iOS", osVersion: "18.2" }
  },
  TVHTML5: {
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    clientName: "TVHTML5",
    clientVersion: "7.20230405.08.01",
    headerName: "7",
    userAgent: "Mozilla/5.0 (SmartTV; Cobalt/Version)",
    extra: {}
  },
  WEB: {
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    clientName: "WEB",
    clientVersion: "2.20250224.01.00",
    headerName: "1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extra: {}
  }
};
var PLAYER_ORDER = [
  "ANDROID",
  "IOS",
  "ANDROID_VR",
  "ANDROID_KIDS",
  "IOS_KIDS",
  "TVHTML5",
  "WEB"
];
var VISITOR_CACHE = {};
var VISITOR_TTL_MS = 30 * 60 * 1e3;
async function fetchVisitorData(c) {
  const cached = VISITOR_CACHE[c.clientName];
  if (cached && Date.now() - cached.timestamp < VISITOR_TTL_MS) {
    return cached.data;
  }
  try {
    const url = "https://www.youtube.com/youtubei/v1/visitor_id?key=" + c.key + "&prettyPrint=false";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": c.userAgent,
        Origin: "https://www.youtube.com"
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: c.clientName,
            clientVersion: c.clientVersion,
            hl: "en",
            gl: "US",
            ...c.extra
          }
        }
      })
    });
    if (!res.ok)
      return null;
    const data = await res.json();
    const vd = data && data.responseContext && data.responseContext.visitorData;
    if (vd) {
      VISITOR_CACHE[c.clientName] = { data: vd, timestamp: Date.now() };
      return vd;
    }
  } catch (e) {
  }
  return null;
}
__name(fetchVisitorData, "fetchVisitorData");
function clearVisitorData(clientName) {
  delete VISITOR_CACHE[clientName];
}
__name(clearVisitorData, "clearVisitorData");
function buildContext(c, hl, gl, visitorData) {
  const client = {
    clientName: c.clientName,
    clientVersion: c.clientVersion,
    hl,
    gl,
    utcOffsetMinutes: 0
  };
  if (visitorData)
    client.visitorData = visitorData;
  Object.assign(client, c.extra);
  const ctx = { client };
  if (c.thirdParty)
    ctx.thirdParty = c.thirdParty;
  return ctx;
}
__name(buildContext, "buildContext");
function buildHeaders(c, visitorData) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": c.userAgent,
    "X-YouTube-Client-Name": c.headerName,
    "X-YouTube-Client-Version": c.clientVersion,
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.youtube.com",
    Referer: "https://www.youtube.com/"
  };
  if (visitorData)
    headers["X-Goog-Visitor-Id"] = visitorData;
  return headers;
}
__name(buildHeaders, "buildHeaders");
async function innertube(endpoint, clientName, bodyExtra, hl, gl) {
  const c = CLIENTS[clientName];
  if (!c)
    throw new Error("Unknown InnerTube client: " + clientName);
  const visitorData = await fetchVisitorData(c);
  const url = "https://www.youtube.com/youtubei/v1/" + endpoint + "?key=" + c.key + "&prettyPrint=false";
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(c, visitorData),
    body: JSON.stringify({
      context: buildContext(c, hl, gl, visitorData),
      ...bodyExtra
    })
  });
  if (!res.ok) {
    throw new Error("InnerTube " + endpoint + " (" + clientName + ") HTTP " + res.status);
  }
  return res.json();
}
__name(innertube, "innertube");
async function playerWithFallback(videoId, hl, gl) {
  const errors = [];
  for (const name of PLAYER_ORDER) {
    try {
      const data = await innertube(
        "player",
        name,
        { videoId, contentCheckOk: true, racyCheckOk: true },
        hl,
        gl
      );
      const status = data && data.playabilityStatus && data.playabilityStatus.status;
      if (data && data.streamingData) {
        return { data, client: name };
      }
      clearVisitorData(name);
      errors.push(name + ": " + (status || "no-streamingData"));
    } catch (e) {
      clearVisitorData(name);
      errors.push(name + ": " + e.message);
    }
  }
  throw new Error("No client returned streams -> " + errors.join(" | "));
}
__name(playerWithFallback, "playerWithFallback");
function extractMediaUrl(f) {
  if (f.url)
    return f.url;
  const raw = f.signatureCipher || f.cipher;
  if (!raw)
    return null;
  const params = new URLSearchParams(raw);
  const u = params.get("url");
  const sig = params.get("sig") || params.get("signature");
  const sp = params.get("sp") || "signature";
  if (!u)
    return null;
  if (!sig)
    return u;
  try {
    const parsed = new URL(u);
    parsed.searchParams.set(sp, sig);
    return parsed.toString();
  } catch (e) {
    return u + "&" + sp + "=" + encodeURIComponent(sig);
  }
}
__name(extractMediaUrl, "extractMediaUrl");
function normalizeFormat(f) {
  const mime = f.mimeType || "";
  return {
    itag: f.itag,
    mimeType: mime,
    isAudio: mime.indexOf("audio/") === 0,
    hasVideo: mime.indexOf("video/") === 0,
    bitrate: f.bitrate || f.averageBitrate || 0,
    averageBitrate: f.averageBitrate || 0,
    codecs: (mime.match(/codecs="([^"]+)"/) || [])[1] || null,
    quality: f.quality || null,
    audioQuality: f.audioQuality || null,
    audioSampleRate: f.audioSampleRate || null,
    channels: f.audioChannels || null,
    approxDurationMs: Number(f.approxDurationMs || 0),
    contentLength: f.contentLength || null,
    url: extractMediaUrl(f)
  };
}
__name(normalizeFormat, "normalizeFormat");
function listFormats(data) {
  const sd = data.streamingData || {};
  const raw = (sd.formats || []).concat(sd.adaptiveFormats || []);
  return raw.map(normalizeFormat).filter(function(f) {
    return !!f.url;
  });
}
__name(listFormats, "listFormats");
function chooseAudio(formats, preferItag) {
  const audio = formats.filter(function(f) {
    return f.isAudio;
  });
  const pool = audio.length ? audio : formats;
  if (preferItag) {
    const exact = pool.find(function(f) {
      return String(f.itag) === String(preferItag);
    });
    if (exact)
      return exact;
  }
  const preferred = [140, 251, 250, 139];
  for (const tag of preferred) {
    const hit = pool.find(function(f) {
      return f.itag === tag;
    });
    if (hit)
      return hit;
  }
  return pool.slice().sort(function(a, b) {
    return (b.bitrate || 0) - (a.bitrate || 0);
  })[0] || null;
}
__name(chooseAudio, "chooseAudio");
function parseDuration(text) {
  if (!text)
    return 0;
  const parts = String(text).split(":").map(Number);
  return parts.reduce(function(acc, n) {
    return acc * 60 + (n || 0);
  }, 0);
}
__name(parseDuration, "parseDuration");
function videoMeta(data) {
  const vd = data.videoDetails || {};
  const mf = data.microformat && data.microformat.playerMicroformatRenderer || {};
  return {
    id: vd.videoId,
    title: vd.title || null,
    author: vd.author || null,
    channelId: vd.channelId || null,
    lengthSeconds: Number(vd.lengthSeconds || 0),
    viewCount: Number(vd.viewCount || 0),
    isLive: !!vd.isLiveContent,
    thumbnails: vd.thumbnail && vd.thumbnail.thumbnails || [],
    publishDate: mf.publishDate || null,
    category: mf.category || null
  };
}
__name(videoMeta, "videoMeta");
function normalizeVideoRenderer(vr) {
  const thumb = vr.thumbnail && (vr.thumbnail.thumbnails || []) || [];
  const title2 = vr.title && (vr.title.simpleText || vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text) || null;
  const channel2 = vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text || vr.longBylineText && vr.longBylineText.runs && vr.longBylineText.runs[0] && vr.longBylineText.runs[0].text || null;
  const lengthText = vr.lengthText && vr.lengthText.simpleText || null;
  return {
    id: vr.videoId,
    title: title2,
    author: channel2,
    duration: lengthText,
    lengthSeconds: parseDuration(lengthText),
    views: vr.viewCountText && vr.viewCountText.simpleText || null,
    published: vr.publishedTimeText && vr.publishedTimeText.simpleText || null,
    thumbnail: thumb.length ? thumb[thumb.length - 1].url : null
  };
}
__name(normalizeVideoRenderer, "normalizeVideoRenderer");
function normalizeLockup(lk) {
  const meta = lk.metadata && lk.metadata.lockupMetadataViewModel || {};
  const title2 = meta.title && meta.title.content || null;
  let author = null;
  let views = null;
  try {
    const rows = meta.metadata.contentMetadataViewModel.metadataRows || [];
    for (const row of rows) {
      const parts = row.metadataParts || [];
      for (const p of parts) {
        const t = p.text && p.text.content;
        if (!t)
          continue;
        if (!author)
          author = t;
        else if (!views)
          views = t;
      }
    }
  } catch (e) {
  }
  let thumbnail = null;
  try {
    const srcs = lk.contentImage.thumbnailViewModel.image.sources || [];
    if (srcs.length)
      thumbnail = srcs[srcs.length - 1].url;
  } catch (e) {
  }
  return {
    id: lk.contentId,
    title: title2,
    author,
    duration: null,
    lengthSeconds: 0,
    views,
    published: null,
    thumbnail
  };
}
__name(normalizeLockup, "normalizeLockup");
function collectVideos(node, out, seen) {
  if (!node || typeof node !== "object")
    return out;
  if (Array.isArray(node)) {
    for (const item of node)
      collectVideos(item, out, seen);
    return out;
  }
  const vr = node.videoRenderer || node.compactVideoRenderer || node.gridVideoRenderer;
  if (vr && vr.videoId && !seen.has(vr.videoId)) {
    seen.add(vr.videoId);
    out.push(normalizeVideoRenderer(vr));
  }
  if (node.lockupViewModel && node.lockupViewModel.contentId && !seen.has(node.lockupViewModel.contentId)) {
    const norm = normalizeLockup(node.lockupViewModel);
    if (norm.id) {
      seen.add(norm.id);
      out.push(norm);
    }
  }
  for (const k of Object.keys(node))
    collectVideos(node[k], out, seen);
  return out;
}
__name(collectVideos, "collectVideos");
function parseSearch(data, limit) {
  const out = [];
  collectVideos(data, out, /* @__PURE__ */ new Set());
  return out.slice(0, limit);
}
__name(parseSearch, "parseSearch");
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "*"
};
function json(data, status, extraHeaders) {
  const headers = Object.assign(
    { "Content-Type": "application/json; charset=utf-8" },
    CORS,
    extraHeaders || {}
  );
  return new Response(JSON.stringify(data, null, 2), { status: status || 200, headers });
}
__name(json, "json");
function err(message, status, detail) {
  return json({ ok: false, error: message, detail: detail || null, version: VERSION }, status || 400);
}
__name(err, "err");
function authOk(request, env2, url) {
  const secret = env2 && env2.API_SECRET;
  if (!secret)
    return true;
  const q = url.searchParams.get("key");
  if (q && q === secret)
    return true;
  const h = request.headers.get("Authorization") || "";
  if (h === "Bearer " + secret)
    return true;
  const xk = request.headers.get("X-API-Key");
  return !!xk && xk === secret;
}
__name(authOk, "authOk");
async function withCache(request, ctx, ttl, producer) {
  const cache = typeof caches !== "undefined" && caches.default ? caches.default : null;
  let key = null;
  if (cache) {
    try {
      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.delete("key");
      key = new Request(cacheUrl.toString(), { method: "GET" });
      const hit = await cache.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("X-Cache", "HIT");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(hit.body, { status: hit.status, headers });
      }
    } catch (e) {
    }
  }
  const body = await producer();
  if (body && body.ok === false) {
    return json(body, body.status || 502);
  }
  const res = json(body, 200, { "Cache-Control": "public, max-age=" + ttl });
  if (cache && key && ctx && typeof ctx.waitUntil === "function") {
    try {
      ctx.waitUntil(cache.put(key, res.clone()));
    } catch (e) {
    }
  }
  res.headers.set("X-Cache", "MISS");
  return res;
}
__name(withCache, "withCache");
async function handleSearch(url, request, env2, ctx) {
  const q = url.searchParams.get("q");
  if (!q)
    return err("Missing 'q' parameter", 400);
  const limit = Math.min(Number(url.searchParams.get("limit") || 10) || 10, 50);
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  return withCache(request, ctx, 300, async function() {
    try {
      const data = await innertube(
        "search",
        "WEB",
        {
          query: q,
          params: "EgIQAQ%3D%3D",
          // filter: videos only
          client: void 0
        },
        hl,
        gl
      );
      const results = parseSearch(data, limit);
      return { ok: true, query: q, count: results.length, results };
    } catch (e) {
      return { ok: false, status: 502, error: "Search failed", detail: e.message };
    }
  });
}
__name(handleSearch, "handleSearch");
async function handleSearchSongs(url, request, env2, ctx) {
  const q = url.searchParams.get("q");
  if (!q)
    return err("Missing 'q' parameter", 400);
  const limit = Math.min(Number(url.searchParams.get("limit") || 10) || 10, 50);
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  const baseUrl = url.origin;
  return withCache(request, ctx, 300, async function() {
    try {
      const data = await innertube(
        "search",
        "WEB",
        {
          query: q,
          params: "EgIQAQ%3D%3D",
          // filter: videos only
          client: void 0
        },
        hl,
        gl
      );
      const rawResults = parseSearch(data, limit);
      const results = rawResults.map(function(item) {
        const ytUrl = "https://www.youtube.com/watch?v=" + item.id;
        return {
          id: item.id,
          title: item.title,
          artist: item.author,
          author: item.author,
          duration: item.duration,
          duration_seconds: item.lengthSeconds,
          lengthSeconds: item.lengthSeconds,
          views: item.views,
          published: item.published,
          thumbnail: item.thumbnail,
          link: ytUrl,
          url: ytUrl,
          audio_url: baseUrl + "/audio?id=" + item.id,
          proxy_url: baseUrl + "/proxy?id=" + item.id,
          stream_url: baseUrl + "/stream?id=" + item.id,
          redirect_url: baseUrl + "/redirect?id=" + item.id
        };
      });
      return {
        ok: true,
        service: "Telegram VC Music Search API",
        query: q,
        count: results.length,
        results
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Song search failed", detail: e.message };
    }
  });
}
__name(handleSearchSongs, "handleSearchSongs");
async function handleVideo(url, request, env2, ctx) {
  const id = url.searchParams.get("id");
  if (!id)
    return err("Missing 'id' parameter", 400);
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  return withCache(request, ctx, 1800, async function() {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const formats = listFormats(r.data);
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        playability: r.data.playabilityStatus && r.data.playabilityStatus.status || null,
        formatsCount: formats.length,
        keywords: r.data.videoDetails && r.data.videoDetails.keywords || []
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Failed to fetch video details", detail: e.message };
    }
  });
}
__name(handleVideo, "handleVideo");
async function handleStream(url, request, env2, ctx) {
  const id = url.searchParams.get("id");
  if (!id)
    return err("Missing 'id' parameter", 400);
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  const ttl = Math.max(60, Math.min(Number(url.searchParams.get("ttl") || 900) || 900, 3600));
  return withCache(request, ctx, ttl, async function() {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const formats = listFormats(r.data);
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        formats
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Failed to fetch stream details", detail: e.message };
    }
  });
}
__name(handleStream, "handleStream");
async function handleAudio(url, request, env2, ctx) {
  const id = url.searchParams.get("id");
  if (!id)
    return err("Missing 'id' parameter", 400);
  const itag = url.searchParams.get("itag");
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  return withCache(request, ctx, 900, async function() {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const formats = listFormats(r.data);
      const best = chooseAudio(formats, itag);
      if (!best)
        return { ok: false, status: 404, error: "No playable audio format found" };
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        audio: best,
        expiresHint: "googlevideo urls are short-lived (~6h) and may be IP-bound; re-fetch when expired"
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Failed to fetch audio stream", detail: e.message };
    }
  });
}
__name(handleAudio, "handleAudio");
async function handleRedirect(url, request, env2) {
  const id = url.searchParams.get("id");
  if (!id)
    return err("Missing 'id' parameter", 400);
  const itag = url.searchParams.get("itag");
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  try {
    const r = await playerWithFallback(id, hl, gl);
    const best = chooseAudio(listFormats(r.data), itag);
    if (!best)
      return err("No playable audio format found", 404);
    return new Response(null, { status: 302, headers: Object.assign({ Location: best.url }, CORS) });
  } catch (e) {
    return err("Failed to resolve audio redirect URL", 502, e.message);
  }
}
__name(handleRedirect, "handleRedirect");
async function handleProxy(url, request, env2) {
  const id = url.searchParams.get("id");
  const directUrl = url.searchParams.get("url");
  const itag = url.searchParams.get("itag");
  const hl = url.searchParams.get("hl") || env2.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env2.DEFAULT_GL || "US";
  let mediaUrl = null;
  let clientName = "ANDROID";
  if (id) {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const best = chooseAudio(listFormats(r.data), itag);
      if (!best)
        return err("No playable audio format found", 404);
      mediaUrl = best.url;
      clientName = r.client;
    } catch (e) {
      return err("Failed to retrieve audio stream", 502, e.message);
    }
  } else if (directUrl && env2.ALLOW_OPEN_PROXY === "true") {
    mediaUrl = directUrl;
  } else {
    return err("Provide 'id' (or enable open proxy via ALLOW_OPEN_PROXY)", 400);
  }
  const clientUA = CLIENTS[clientName] && CLIENTS[clientName].userAgent || CLIENTS.ANDROID.userAgent;
  async function fetchUpstream(targetUrl) {
    const headers = {
      "User-Agent": clientUA,
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/"
    };
    const range = request.headers.get("Range");
    if (range)
      headers["Range"] = range;
    const accept = request.headers.get("Accept");
    if (accept)
      headers["Accept"] = accept;
    return await fetch(targetUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers
    });
  }
  __name(fetchUpstream, "fetchUpstream");
  let upstream = await fetchUpstream(mediaUrl);
  if (id && (upstream.status === 403 || upstream.status === 410 || upstream.status === 404)) {
    for (const name of PLAYER_ORDER) {
      clearVisitorData(name);
    }
    try {
      const r = await playerWithFallback(id, hl, gl);
      const best = chooseAudio(listFormats(r.data), itag);
      if (best && best.url && best.url !== mediaUrl) {
        mediaUrl = best.url;
        clientName = r.client;
        upstream = await fetchUpstream(mediaUrl);
      }
    } catch (e) {
    }
  }
  const outHeaders = new Headers(CORS);
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v)
      outHeaders.set(h, v);
  }
  if (!outHeaders.has("accept-ranges")) {
    outHeaders.set("accept-ranges", "bytes");
  }
  outHeaders.set("Cache-Control", "public, max-age=3600");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: outHeaders
  });
}
__name(handleProxy, "handleProxy");
var src_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const path = url.pathname.replace(/^\/+/, "/").replace(/\/+$/, "") || "/";
    if (path === "/health" || path === "/") {
      return json({
        ok: true,
        service: "yt-innertube-api",
        version: VERSION,
        clients: PLAYER_ORDER,
        routes: ["/health", "/search", "/search_songs", "/video", "/stream", "/audio", "/proxy", "/redirect"]
      });
    }
    if (!authOk(request, env2, url)) {
      return err("Unauthorized: invalid or missing API key", 401);
    }
    try {
      switch (path) {
        case "/search":
          return await handleSearch(url, request, env2, ctx);
        case "/search_songs":
          return await handleSearchSongs(url, request, env2, ctx);
        case "/video":
          return await handleVideo(url, request, env2, ctx);
        case "/stream":
          return await handleStream(url, request, env2, ctx);
        case "/audio":
          return await handleAudio(url, request, env2, ctx);
        case "/redirect":
          return await handleRedirect(url, request, env2);
        case "/proxy":
          return await handleProxy(url, request, env2);
        default:
          return err("Unknown route: " + path, 404);
      }
    } catch (e) {
      return err("Internal error", 500, String(e && e.message || e));
    }
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
