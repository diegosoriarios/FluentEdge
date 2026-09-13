import {
  evaluateCapabilities,
  readTotalRamBytesSync,
} from '../deviceCapabilities';

const GB = 1_000_000_000;

describe('readTotalRamBytesSync', () => {
  it('parses MemTotal from meminfo', () => {
    const meminfo = [
      'MemTotal:        3784600 kB',
      'MemFree:          120000 kB',
    ].join('\n');
    expect(readTotalRamBytesSync(meminfo)).toBe(3784600 * 1024);
  });

  it('returns null when MemTotal is missing', () => {
    expect(readTotalRamBytesSync('something else')).toBeNull();
    expect(readTotalRamBytesSync('')).toBeNull();
  });
});

describe('evaluateCapabilities', () => {
  it('recommends the full model on a capable device', () => {
    const capability = evaluateCapabilities(6 * GB, 32 * GB);
    expect(capability.recommendation).toBe('full');
    expect(capability.variants.full.ramOk).toBe(true);
    expect(capability.variants.full.storageOk).toBe(true);
  });

  it('recommends the smaller model when RAM is low but adequate', () => {
    const capability = evaluateCapabilities(2.5 * GB, 32 * GB);
    expect(capability.recommendation).toBe('small');
    expect(capability.variants.full.ramOk).toBe(false);
    expect(capability.variants.small.ramOk).toBe(true);
  });

  it('blocks when even the smaller model cannot run', () => {
    const capability = evaluateCapabilities(1 * GB, 32 * GB);
    expect(capability.recommendation).toBe('block');
  });

  it('blocks on insufficient storage regardless of RAM', () => {
    const capability = evaluateCapabilities(8 * GB, 0.5 * GB);
    expect(capability.recommendation).toBe('block');
    expect(capability.variants.full.storageOk).toBe(false);
    expect(capability.variants.small.storageOk).toBe(false);
  });

  it('treats unknown RAM as pass (warning-only, e.g. iOS)', () => {
    const capability = evaluateCapabilities(null, 32 * GB);
    expect(capability.variants.full.ramOk).toBeNull();
    expect(capability.recommendation).toBe('full');
  });

  it('blocks when RAM unknown and storage insufficient for both', () => {
    const capability = evaluateCapabilities(null, 1 * GB);
    expect(capability.recommendation).toBe('block');
  });
});
