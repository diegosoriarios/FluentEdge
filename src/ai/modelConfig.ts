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
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    sha256: '626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d',
    bytes: 2_104_932_768,
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    label: 'Qwen 2.5 3B Instruct (Q4_K_M, about 2 GB)',
    shortLabel: 'Standard (about 2 GB)',
    ramRecommendedBytes: 4 * GB,
    ramMinimumBytes: 3 * GB,
  },
  small: {
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q3_k_m.gguf',
    sha256: 'ba8627a48c2bddefac2f995caf7887551304f26a72137fb94b74449121d0df4e',
    bytes: 1_724_178_848,
    filename: 'qwen2.5-3b-instruct-q3_k_m.gguf',
    label: 'Qwen 2.5 3B Instruct (Q3_K_M, about 1.7 GB)',
    shortLabel: 'Smaller (about 1.7 GB)',
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
