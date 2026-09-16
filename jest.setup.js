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
    downloadFile: jest.fn(() => ({
      jobId: 1,
      promise: Promise.resolve({ jobId: 1, statusCode: 200, bytesWritten: 0 }),
    })),
    stopDownload: jest.fn(),
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

jest.mock('@kesha-antonov/react-native-background-downloader', () => {
  const makeTask = () => ({
    id: 'fluentedge-model',
    state: 'PENDING',
    metadata: {},
    errorCode: 0,
    bytesDownloaded: 0,
    bytesTotal: 0,
    begin: jest.fn(t => t),
    progress: jest.fn(t => t),
    done: jest.fn(t => t),
    error: jest.fn(t => t),
    start: jest.fn(),
    pause: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  });
  return {
    __esModule: true,
    createDownloadTask: jest.fn(() => makeTask()),
    getExistingDownloadTasks: jest.fn(() => Promise.resolve([])),
    setConfig: jest.fn(),
    completeHandler: jest.fn(),
    directories: { documents: '/tmp/documents' },
  };
});

jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = props => <Text>{props.name}</Text>;
  Icon.getName = jest.fn(name => name);
  Icon.getRawGlyphMap = jest.fn(() => ({}));
  Icon.hasIcon = jest.fn(() => true);
  Icon.loadFont = jest.fn(() => Promise.resolve());
  return Icon;
});

jest.mock('llama.rn', () => require('llama.rn/jest/mock'));

jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock'),
);
