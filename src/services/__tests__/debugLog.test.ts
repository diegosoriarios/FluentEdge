import {
  MAX_DEBUG_ENTRIES,
  clearDebugLogs,
  getDebugLogText,
  getDebugLogs,
  logDebug,
} from '../debugLog';

describe('debugLog', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    clearDebugLogs();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('stores entries with tag and message', () => {
    logDebug('download', 'progress', 42);
    const logs = getDebugLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].tag).toBe('download');
    expect(logs[0].message).toBe('progress 42');
    expect(typeof logs[0].ts).toBe('number');
  });

  it('forwards entries to console.log', () => {
    logDebug('model', 'state change');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[FE:dl][model]',
      'state change',
    );
  });

  it('caps the buffer at MAX_DEBUG_ENTRIES', () => {
    for (let index = 0; index < MAX_DEBUG_ENTRIES + 50; index += 1) {
      logDebug('test', `entry ${index}`);
    }
    const logs = getDebugLogs();
    expect(logs).toHaveLength(MAX_DEBUG_ENTRIES);
    expect(logs[logs.length - 1].message).toBe(
      `entry ${MAX_DEBUG_ENTRIES + 49}`,
    );
    expect(logs[0].message).toBe('entry 50');
  });

  it('clearDebugLogs empties the buffer', () => {
    logDebug('test', 'something');
    clearDebugLogs();
    expect(getDebugLogs()).toHaveLength(0);
  });

  it('getDebugLogText renders timestamped lines', () => {
    logDebug('download', 'begin id=abc expectedBytes=123');
    const text = getDebugLogText();
    expect(text).toMatch(/\[download\] begin id=abc expectedBytes=123/);
  });

  it('serializes non-string arguments', () => {
    logDebug('modelManager', 'startDownload', { variant: 'full' });
    expect(getDebugLogs()[0].message).toBe(
      'startDownload {"variant":"full"}',
    );
  });
});
