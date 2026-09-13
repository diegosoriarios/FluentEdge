declare module 'react-native-background-downloader' {
  export type DownloadTaskState =
    | 'PENDING'
    | 'DOWNLOADING'
    | 'PAUSED'
    | 'DONE'
    | 'FAILED';

  export interface DownloadTask {
    id: string;
    state: DownloadTaskState;
    percent: number;
    bytesWritten: number;
    totalBytes: number;
    begin(handler: (expectedBytes: number) => void): DownloadTask;
    progress(
      handler: (percent: number, bytesWritten: number, totalBytes: number) => void,
    ): DownloadTask;
    done(handler: () => void): DownloadTask;
    error(handler: (error: string, errorCode?: number) => void): DownloadTask;
    pause(): void;
    resume(): void;
    stop(): void;
  }

  export interface DownloadOptions {
    id: string;
    url: string;
    destination: string;
    headers?: Record<string, string>;
    network?: string;
    priority?: string;
  }

  export function download(options: DownloadOptions): DownloadTask;
  export function checkForExistingDownloads(): Promise<DownloadTask[]>;
  export function setHeaders(headers: Record<string, string>): void;
  export const directories: { documents: string };
  export const Network: { WIFI_ONLY: string; ALL: string };
  export const Priority: { HIGH: string; MEDIUM: string; LOW: string };

  const BackgroundDownloader: {
    download: typeof download;
    checkForExistingDownloads: typeof checkForExistingDownloads;
    setHeaders: typeof setHeaders;
    directories: typeof directories;
    Network: typeof Network;
    Priority: typeof Priority;
  };

  export default BackgroundDownloader;
}
