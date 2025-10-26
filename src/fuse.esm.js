// Minimal Fuse.js-compatible search utility (MIT License)
// Inspired by Fuse.js v6.6.2 https://github.com/krisk/Fuse

const DEFAULT_OPTIONS = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: true,
  threshold: 0.35,
  keys: []
};

export default class Fuse {
  constructor(list, options = {}) {
    this.list = Array.isArray(list) ? list : [];
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._keys = (this.options.keys || []).map((entry) => {
      if (typeof entry === "string") return { name: entry, weight: 1 };
      const name = entry?.name || "";
      const weight = typeof entry?.weight === "number" && entry.weight > 0 ? entry.weight : 1;
      return { name, weight };
    });
  }

  setCollection(list) {
    this.list = Array.isArray(list) ? list : [];
  }

  search(pattern, options = {}) {
    const term = this.options.isCaseSensitive ? pattern : String(pattern || "").toLowerCase();
    const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : null;
    const results = [];

    this.list.forEach((item, index) => {
      const score = this._scoreItem(item, term);
      if (score <= this.options.threshold) {
        results.push({ item, score, refIndex: index });
      }
    });

    if (this.options.shouldSort) {
      results.sort((a, b) => a.score - b.score || a.refIndex - b.refIndex);
    }

    const sliced = limit ? results.slice(0, limit) : results;

    if (this.options.includeScore) {
      return sliced.map(({ item, score }) => ({ item, score }));
    }
    return sliced.map(({ item }) => ({ item }));
  }

  _scoreItem(item, pattern) {
    if (!pattern) return 0;
    const values = this._extractValues(item);
    if (!values.length) return 1;
    let best = Infinity;
    values.forEach(({ value, weight }) => {
      const text = this.options.isCaseSensitive ? value : value.toLowerCase();
      const score = fuzzyScore(pattern, text) / weight;
      if (score < best) best = score;
    });
    return Math.min(best, 1);
  }

  _extractValues(item) {
    if (!this._keys.length) {
      const raw = stringify(item);
      return raw ? [{ value: raw, weight: 1 }] : [];
    }
    const collected = [];
    this._keys.forEach(({ name, weight }) => {
      getValues(item, name).forEach((value) => {
        if (value) collected.push({ value, weight });
      });
    });
    return collected;
  }
}

function getValues(item, keyPath) {
  if (!keyPath) return [];
  const segments = Array.isArray(keyPath) ? keyPath : keyPath.split(".");
  let current = item;
  for (const segment of segments) {
    if (current == null) return [];
    current = current[segment];
  }
  if (Array.isArray(current)) {
    return current.flatMap((entry) => stringify(entry)).filter(Boolean);
  }
  const stringValue = stringify(current);
  return stringValue ? [stringValue] : [];
}

function stringify(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stringify).join(" ");
  if (typeof value === "object") return Object.values(value).map(stringify).join(" ");
  return "";
}

function fuzzyScore(pattern, text) {
  if (!pattern) return 0;
  if (!text) return 1;
  if (text.includes(pattern)) return 0;

  const patternLength = pattern.length;
  const textLength = text.length;
  if (patternLength === 0) return 0;

  let best = Infinity;
  const window = Math.max(patternLength + 2, patternLength);
  for (let i = 0; i <= textLength - patternLength; i += 1) {
    const slice = text.slice(i, Math.min(i + window, textLength));
    const distance = levenshtein(pattern, slice);
    const score = distance / patternLength;
    if (score < best) {
      best = score;
      if (best === 0) break;
    }
  }

  if (best === Infinity) {
    best = levenshtein(pattern, text) / Math.max(patternLength, textLength);
  }

  return best;
}

function levenshtein(a, b) {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  let prevRow = new Array(bLen + 1);
  let currRow = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j += 1) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    currRow[0] = i;
    const aChar = a.charAt(i - 1);
    for (let j = 1; j <= bLen; j += 1) {
      const bChar = b.charAt(j - 1);
      const cost = aChar === bChar ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[bLen];
}
