import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { FREE_MARGIN_BYTES, MODEL_VARIANTS } from '../ai/modelConfig';
import type { ModelVariant } from '../ai/modelConfig';

export type VariantVerdict = {
  ramOk: boolean | null;
  storageOk: boolean;
};

export type DeviceCapability = {
  ramBytes: number | null;
  freeSpaceBytes: number;
  totalSpaceBytes: number;
  variants: Record<ModelVariant, VariantVerdict>;
  recommendation: 'full' | 'small' | 'block';
};

export function readTotalRamBytesSync(meminfo: string): number | null {
  const match = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 1024;
}

export async function readTotalRamBytes(): Promise<number | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    const meminfo = await RNFS.readFile('/proc/meminfo', 'utf8');
    return readTotalRamBytesSync(meminfo);
  } catch {
    return null;
  }
}

export function evaluateCapabilities(
  ramBytes: number | null,
  freeSpaceBytes: number,
): DeviceCapability {
  const variants = {} as Record<ModelVariant, VariantVerdict>;
  for (const key of Object.keys(MODEL_VARIANTS) as ModelVariant[]) {
    const config = MODEL_VARIANTS[key];
    variants[key] = {
      ramOk: ramBytes == null ? null : ramBytes >= config.ramMinimumBytes,
      storageOk: freeSpaceBytes >= config.bytes + FREE_MARGIN_BYTES,
    };
  }

  let recommendation: DeviceCapability['recommendation'] = 'block';
  if (meetsVariant(variants.full)) {
    recommendation = 'full';
  } else if (meetsVariant(variants.small)) {
    recommendation = 'small';
  }

  return {
    ramBytes,
    freeSpaceBytes,
    totalSpaceBytes: 0,
    variants,
    recommendation,
  };
}

function meetsVariant(verdict: VariantVerdict): boolean {
  const ramOk = verdict.ramOk !== false;
  return ramOk && verdict.storageOk;
}

export async function checkDeviceCapabilities(): Promise<DeviceCapability> {
  const [ramBytes, fsInfo] = await Promise.all([
    readTotalRamBytes(),
    RNFS.getFSInfo(),
  ]);
  const capability = evaluateCapabilities(ramBytes, fsInfo.freeSpace);
  capability.totalSpaceBytes = fsInfo.totalSpace;
  return capability;
}
