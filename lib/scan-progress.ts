let progress = 0;

export function setScanProgress(p: number) {
  progress = Math.max(0, Math.min(100, Math.floor(p)));
}

export function getScanProgress() {
  return progress;
}
