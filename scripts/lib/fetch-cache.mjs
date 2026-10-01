import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const USER_AGENT = 'pokemon-availability-calculator data builder (+https://github.com/riceelijah/pokemon-availability-calculator)';

export function createFetcher({ cacheDir, delayMs = 250, refresh = false }) {
  let chain = Promise.resolve();

  async function cached(url) {
    const key = createHash('sha1').update(url).digest('hex');
    const file = path.join(cacheDir, `${key}.html`);
    if (!refresh) {
      try {
        return await readFile(file, 'utf8');
      } catch {
        // not cached yet
      }
    }

    // Serialise network requests so we stay polite to the source sites.
    const run = chain.then(() => download(url));
    chain = run.catch(() => {}).then(() => sleep(delayMs));
    const body = await run;
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, body);
    return body;
  }

  return cached;
}

async function download(url, attempt = 1) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (response.status === 404) {
      return '';
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const type = response.headers.get('content-type') || '';
    // Serebii serves Latin-1 pages.
    return /charset=(iso-8859-1|latin1|windows-1252)/i.test(type) || url.includes('serebii.net')
      ? decodeLatin1OrUtf8(buffer)
      : buffer.toString('utf8');
  } catch (error) {
    if (attempt >= 4) {
      throw error;
    }
    await sleep(1000 * 2 ** attempt);
    return download(url, attempt + 1);
  }
}

function decodeLatin1OrUtf8(buffer) {
  const utf8 = buffer.toString('utf8');
  return utf8.includes('�') ? buffer.toString('latin1') : utf8;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Binary download with an on-disk cache. Returns the file path, or null on 404.
export async function fetchBinaryCached(url, file, { refresh = false } = {}) {
  if (!refresh) {
    try {
      await readFile(file);
      return file;
    } catch {
      // not cached yet
    }
  }
  const missing = `${file}.404`;
  if (!refresh) {
    try {
      await readFile(missing);
      return null;
    } catch {
      // not known missing
    }
  }
  await mkdir(path.dirname(file), { recursive: true });
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  await sleep(150);
  if (response.status === 404) {
    await writeFile(missing, '');
    return null;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}
