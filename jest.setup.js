jest.mock('react-native-sqlite-storage', () => {
  const state = { responses: [] };
  const emptyResult = {
    rows: {
      length: 0,
      item: () => null,
    },
    rowsAffected: 0,
    insertId: undefined,
  };
  const db = {
    executeSql: jest.fn(sql => {
      for (const entry of state.responses) {
        const matches =
          typeof entry.match === 'string'
            ? sql.includes(entry.match)
            : entry.match.test(sql);
        if (matches) {
          return Promise.resolve([
            {
              rows: {
                length: entry.rows.length,
                item: index => entry.rows[index],
              },
              rowsAffected: entry.rows.length,
            },
          ]);
        }
      }
      return Promise.resolve([emptyResult]);
    }),
    close: jest.fn(() => Promise.resolve()),
  };
  return {
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() => Promise.resolve(db)),
    __db: db,
    __state: state,
  };
});

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    DocumentDirectoryPath: '/tmp/documents',
    getFSInfo: jest.fn(() =>
      Promise.resolve({ freeSpace: 64_000_000_000, totalSpace: 128_000_000_000 }),
    ),
    exists: jest.fn(() => Promise.resolve(false)),
    unlink: jest.fn(() => Promise.resolve()),
    moveFile: jest.fn(() => Promise.resolve()),
    hash: jest.fn(() => Promise.resolve('0'.repeat(64))),
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('')),
    stat: jest.fn(() =>
      Promise.resolve({
        size: 1_950_000_000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        name: 'model.gguf',
        path: '/tmp/documents/model.gguf',
        mode: 0,
        originalFilepath: '/tmp/documents/model.gguf',
      }),
    ),
  },
}));

jest.mock('react-native-background-downloader', () => {
  const makeTask = () => ({
    id: 'fluentedge-model',
    state: 'PENDING',
    percent: 0,
    bytesWritten: 0,
    totalBytes: 0,
    begin: jest.fn(t => t),
    progress: jest.fn(t => t),
    done: jest.fn(t => t),
    error: jest.fn(t => t),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
  });
  const mod = {
    download: jest.fn(() => makeTask()),
    checkForExistingDownloads: jest.fn(() => Promise.resolve([])),
    setHeaders: jest.fn(),
    directories: { documents: '/tmp/documents' },
    Network: { WIFI_ONLY: 'wifi_only', ALL: 'all' },
    Priority: { HIGH: 'high', MEDIUM: 'normal', LOW: 'low' },
  };
  return { __esModule: true, ...mod, default: mod };
});

jest.mock('llama.rn', () => require('llama.rn/jest/mock'));

jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock'),
);
