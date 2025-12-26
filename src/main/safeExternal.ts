import { shell } from 'electron';
import { URL } from 'url';

export function openExternalSafe(rawUrl: string): void {
  try {
    const u = new URL(rawUrl);
    const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);
    if (!allowedProtocols.has(u.protocol)) {
      console.warn('Blocked external URL protocol:', u.protocol);
      return;
    }
    shell.openExternal(rawUrl);
  } catch (e) {
    console.warn('Blocked invalid external URL:', rawUrl);
  }
}

