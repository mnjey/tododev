// URL 工具：从分享内容中提取有效链接

function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * 从分享目标收到的内容中提取第一个 http(s) 链接。
 * Web Share Target 的 GET 参数可能把链接放在 url 字段，也可能混在 text 里
 * （例如 "看看这个 https://example.com/article 很不错"）。
 */
function extractUrl(input) {
  if (typeof input !== 'string') return null;

  // 整个输入就是链接
  const direct = normalizeUrl(input);
  if (direct) return direct;

  // 从文本中提取第一个链接
  const m = input.match(/https?:\/\/[^\s<>"'）)\]]+/i);
  if (m) {
    const found = normalizeUrl(m[0].replace(/[.,;:!?]+$/, ''));
    if (found) return found;
  }
  return null;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

module.exports = { extractUrl, normalizeUrl, hostOf };
