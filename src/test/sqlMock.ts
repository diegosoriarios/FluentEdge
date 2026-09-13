import SQLite from 'react-native-sqlite-storage';

type MockEntry = { match: string | RegExp; rows: unknown[] };

type MockModule = {
  __state: { responses: MockEntry[] };
  __db: { executeSql: jest.Mock };
};

function mockModule(): MockModule {
  return SQLite as unknown as MockModule;
}

export function mockSqlResponse(
  match: string | RegExp,
  rows: unknown[],
): void {
  mockModule().__state.responses.push({ match, rows });
}

export function clearSqlResponses(): void {
  mockModule().__state.responses.length = 0;
  mockModule().__db.executeSql.mockClear();
}

export function sqlCalls(): [string, unknown[]?][] {
  return mockModule().__db.executeSql.mock.calls as [string, unknown[]?][];
}
