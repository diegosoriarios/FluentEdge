import RNFS from 'react-native-fs';

export type ModelVariant = 'full' | 'small';

const GB = 1_000_000_000;

export type ModelVariantConfig = {
  url: string;
  sha256: string;
  bytes: number;
  filename: string;
  label: string;
  shortLabel: string;
  ramRecommendedBytes: number;
  ramMinimumBytes: number;
};

export const FREE_MARGIN_BYTES = 1 * GB;

export const MODEL_VARIANTS: Record<ModelVariant, ModelVariantConfig> = {
  full: {
    url: 'https://huggingface.co/bartowski/Qwen_Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    sha256: 'replace_with_x_linked_etag_of_full_file',
    bytes: 2_060_000_000,
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    label: 'Qwen 2.5 3B Instruct (Q4_K_M, about 2 GB)',
    shortLabel: 'Standard (about 2 GB)',
    ramRecommendedBytes: 4 * GB,
    ramMinimumBytes: 3 * GB,
  },
  small: {
    url: 'https://huggingface.co/bartowski/Qwen_Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q3_K_S.gguf',
    sha256: 'replace_with_x_linked_etag_of_small_file',
    bytes: 1_580_000_000,
    filename: 'qwen2.5-3b-instruct-q3_k_s.gguf',
    label: 'Qwen 2.5 3B Instruct (Q3_K_S, about 1.5 GB)',
    shortLabel: 'Smaller (about 1.5 GB)',
    ramRecommendedBytes: 3 * GB,
    ramMinimumBytes: 2 * GB,
  },
};

export const MODEL_DOWNLOAD_ID = 'fluentedge-model';

export const N_CTX = 2048;
export const N_THREADS = 4;
export const N_PREDICT = 768;
export const TEMPERATURE = 0.2;

export type ModelPaths = {
  finalPath: string;
  partPath: string;
  markerPath: string;
};

export function modelPaths(variant: ModelVariant): ModelPaths {
  const { filename } = MODEL_VARIANTS[variant];
  const finalPath = `${RNFS.DocumentDirectoryPath}/${filename}`;
  return {
    finalPath,
    partPath: `${finalPath}.part`,
    markerPath: `${finalPath}.sha256`,
  };
}

export function downloadIdFor(variant: ModelVariant): string {
  return variant === 'full'
    ? MODEL_DOWNLOAD_ID
    : `${MODEL_DOWNLOAD_ID}-${variant}`;
}

export function isModelConfigured(variant: ModelVariant): boolean {
  const config = MODEL_VARIANTS[variant];
  return (
    !config.url.startsWith('REPLACE_') &&
    !config.sha256.startsWith('replace_')
  );
}
