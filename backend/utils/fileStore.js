const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// We trust the file's real content (its first bytes), not its name or what the browser claims.
function detectType(buf) {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", kind: "image" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", kind: "image" };
  if (buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { ext: "webp", kind: "image" };
  if (buf.length > 4 && buf.subarray(0, 4).toString("latin1") === "%PDF") return { ext: "pdf", kind: "pdf" };
  return null;
}

// A folder inside backend/uploads where checked files are saved under random names.
function makeStore(subdir) {
  const dir = path.join(__dirname, "..", "uploads", subdir);
  fs.mkdirSync(dir, { recursive: true });
  return {
    subdir,
    async save(buffer) {
      const type = detectType(buffer);
      if (!type) return null;
      const fileName = `${crypto.randomUUID()}.${type.ext}`;
      await fs.promises.writeFile(path.join(dir, fileName), buffer, { flag: "wx" });
      return { fileName, fileType: type.kind };
    },
    remove: (name) => (name ? fs.promises.unlink(path.join(dir, path.basename(name))).catch(() => {}) : Promise.resolve()),
  };
}

module.exports = { detectType, makeStore };