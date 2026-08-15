// 抓取网页 <title>。零第三方依赖：内置 fetch + TextDecoder。
// 失败时返回 null（调用方回退到 URL 作为标题），绝不抛异常。

const FETCH_TIMEOUT_MS = 4000;
const MAX_BYTES = 512 * 1024; // 标题在 <head> 里，读前 512KB 足够
const MAX_TITLE_LEN = 300;

const UA = 'Mozilla/5.0 (compatible; ReadItLater/1.0)';

function normalizeCharset(cs) {
  const c = String(cs).toLowerCase();
  if (c === 'gb2312' || c === 'gbk' || c === 'gb18030' || c === 'cp936' || c === '936') return 'gbk';
  if (c === 'big5' || c === 'big5-hkscs') return 'big5';
  if (c === 'iso-8859-1' || c === 'latin1' || c === 'latin-1') return 'windows-1252';
  return c;
}

function decode(buf, charset) {
  try {
    return new TextDecoder(normalizeCharset(charset)).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

function safeFromCode(code) {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCode(parseInt(d, 10)))
    .replace(/&([a-z#0-9]+);/gi, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m));
}

async function fetchTitle(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let reader = null;
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5',
      },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml\+xml/.test(contentType)) return null;

    // 只读前 MAX_BYTES 字节
    const chunks = [];
    let total = 0;
    reader = res.body.getReader();
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    if (reader) reader.cancel().catch(() => {});

    const buf = Buffer.concat(chunks);

    // charset：优先 HTTP 响应头，其次页面 meta
    let charset = 'utf-8';
    const headerCharset = contentType.match(/charset\s*=\s*["']?([\w-]+)/i);
    if (headerCharset) {
      charset = headerCharset[1];
    } else {
      const head = buf.subarray(0, 2048).toString('latin1');
      const meta = head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i);
      if (meta) charset = meta[1];
    }

    const html = decode(buf, charset);
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) return null;

    const title = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
    return title.slice(0, MAX_TITLE_LEN) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchTitle };
