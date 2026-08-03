/**
 * Self-contained Apps Script mirror for @hikoutei/kohkai.
 *
 * Apps Script cannot import npm packages at runtime. Hikoutei's gateway embeds
 * this contract-specific source, while Kohkai's parity tests compare it with
 * the Node implementation and golden vectors.
 */

function kohkaiStableHash_(value) {
  return kohkaiSha256Hex_(kohkaiStableEncode_(value, []));
}

function kohkaiStableEncode_(value, ancestors) {
  if (ancestors === undefined) ancestors = [];
  if (value === null) return "n";
  if (value === true) return "b1";
  if (value === false) return "b0";
  if (typeof value === "number") return kohkaiStableEncodeNumber_(value);
  if (typeof value === "string") return kohkaiStableEncodeString_(value);
  if (kohkaiIsDateValue_(value)) return kohkaiEncodeDate_(value.value);
  if (Array.isArray(value)) {
    if (!kohkaiIsDenseArray_(value)) throw new Error("stable array must be dense");
    kohkaiEnterContainer_(value, ancestors);
    try {
      return "a" + value.length + "[" + value.map(function (item) {
        return kohkaiStableEncode_(item, ancestors);
      }).join("") + "]";
    } finally {
      kohkaiLeaveContainer_(value, ancestors);
    }
  }
  if (kohkaiIsPlainRecord_(value)) {
    kohkaiEnterContainer_(value, ancestors);
    try {
      var entries = Object.keys(value).map(function (key) {
        var normalized = kohkaiNormalizeScalarString_(key);
        return { key: normalized, bytes: kohkaiUtf8Bytes_(normalized), value: value[key] };
      });
      var normalizedKeys = Object.create(null);
      entries.forEach(function (entry) {
        if (normalizedKeys[entry.key]) throw new Error("stable object has duplicate NFC key");
        normalizedKeys[entry.key] = true;
      });
      entries.sort(function (left, right) { return kohkaiCompareBytes_(left.bytes, right.bytes); });
      return "o" + entries.length + "{" + entries.map(function (entry) {
        return "s" + entry.bytes.length + ":" + entry.key + kohkaiStableEncode_(entry.value, ancestors);
      }).join("") + "}";
    } finally {
      kohkaiLeaveContainer_(value, ancestors);
    }
  }
  throw new Error("stable value is unsupported");
}

function kohkaiStableEncodeNumber_(value) {
  if (!isFinite(value)) throw new Error("stable number is not finite");
  var decimal = value === 0 ? "0" : String(value).replace(/e\+/, "e").replace(/e(-?)0+(\d+)/, "e$1$2");
  return "f" + kohkaiUtf8ByteLength_(decimal) + ":" + decimal;
}

function kohkaiStableEncodeString_(value) {
  var normalized = kohkaiNormalizeScalarString_(value);
  return "s" + kohkaiUtf8ByteLength_(normalized) + ":" + normalized;
}

function kohkaiEncodeDate_(value) {
  if (!kohkaiIsCanonicalDate_(value)) throw new Error("stable date is invalid");
  return "d24:" + value;
}

function kohkaiIsDateValue_(value) {
  return kohkaiIsPlainRecord_(value) && Object.keys(value).length === 2 &&
    Object.prototype.hasOwnProperty.call(value, "kind") &&
    Object.prototype.hasOwnProperty.call(value, "value") &&
    value.kind === "date" && typeof value.value === "string";
}

function kohkaiIsCanonicalDate_(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  var parsed = new Date(value);
  return !isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function kohkaiCanonicalJson_(value, ancestors) {
  ancestors = ancestors || [];
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!isFinite(value)) throw new Error("canonical JSON numbers must be finite");
    return (value === 0 ? "0" : String(value)).replace(/e\+/, "e").replace(/e(-?)0+(\d+)/, "e$1$2");
  }
  if (Array.isArray(value)) {
    if (!kohkaiIsDenseArray_(value)) throw new Error("canonical JSON arrays must be dense");
    kohkaiEnterContainer_(value, ancestors);
    try {
      return "[" + value.map(function (item) {
        return kohkaiCanonicalJson_(item, ancestors);
      }).join(",") + "]";
    } finally {
      kohkaiLeaveContainer_(value, ancestors);
    }
  }
  if (kohkaiIsPlainRecord_(value)) {
    kohkaiEnterContainer_(value, ancestors);
    try {
      return "{" + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ":" + kohkaiCanonicalJson_(value[key], ancestors);
      }).join(",") + "}";
    } finally {
      kohkaiLeaveContainer_(value, ancestors);
    }
  }
  throw new Error("canonical JSON value is unsupported");
}

function kohkaiIsPlainRecord_(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  var prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function kohkaiIsDenseArray_(value) {
  for (var index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
  }
  return true;
}

function kohkaiEnterContainer_(value, ancestors) {
  if (ancestors.indexOf(value) >= 0) throw new Error("value cannot contain cycles");
  ancestors.push(value);
}

function kohkaiLeaveContainer_(value, ancestors) {
  var index = ancestors.lastIndexOf(value);
  if (index >= 0) ancestors.splice(index, 1);
}

function kohkaiNormalizeScalarString_(value) {
  for (var index = 0; index < value.length; index += 1) {
    var codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      var next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) {
        throw new Error("stable string has an unpaired high surrogate");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new Error("stable string has an unpaired low surrogate");
    }
  }
  return value.normalize("NFC");
}

function kohkaiSha256Hex_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function (byte) {
      var unsigned = byte < 0 ? byte + 256 : byte;
      return ("0" + unsigned.toString(16)).slice(-2);
    })
    .join("");
}

function kohkaiUtf8Bytes_(value) {
  return Utilities.newBlob(value).getBytes();
}

function kohkaiUtf8ByteLength_(value) {
  return kohkaiUtf8Bytes_(value).length;
}

function kohkaiCompareBytes_(left, right) {
  var count = Math.min(left.length, right.length);
  for (var index = 0; index < count; index += 1) {
    var a = left[index] < 0 ? left[index] + 256 : left[index];
    var b = right[index] < 0 ? right[index] + 256 : right[index];
    if (a !== b) return a - b;
  }
  return left.length - right.length;
}
