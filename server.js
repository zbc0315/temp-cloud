const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "items.json");
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EXPIRE_HOURS = 24;
const DEFAULT_EXPIRE_HOURS = 1;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ items: [] }, null, 2));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

const accessTokens = new Map();
let dbLock = Promise.resolve();

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readDb() {
  const raw = await fsp.readFile(DB_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error("Invalid database shape");
    }
    return parsed;
  } catch (error) {
    const backupPath = `${DB_PATH}.broken-${Date.now()}`;
    await fsp.writeFile(backupPath, raw);
    const fresh = { items: [] };
    await writeDb(fresh);
    return fresh;
  }
}

async function writeDb(db) {
  await fsp.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function withDbLock(task) {
  const pending = dbLock;
  let release;
  dbLock = new Promise((resolve) => {
    release = resolve;
  });
  await pending;
  try {
    return await task();
  } finally {
    release();
  }
}

function sanitizeHours(input) {
  const hours = Number(input || DEFAULT_EXPIRE_HOURS);
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_EXPIRE_HOURS;
  return Math.min(MAX_EXPIRE_HOURS, hours);
}

function publicItem(item) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    isProtected: Boolean(item.passwordHash),
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    text: item.kind === "text" ? item.text : undefined,
    mimeType: item.mimeType,
    originalName: item.originalName,
    size: item.size
  };
}

async function removeFileIfExists(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function cleanupExpired() {
  await withDbLock(async () => {
    const db = await readDb();
    const now = Date.now();
    const keep = [];

    for (const item of db.items) {
      if (new Date(item.expiresAt).getTime() > now) {
        keep.push(item);
        continue;
      }
      if (item.filePath) {
        await removeFileIfExists(item.filePath);
      }
    }

    if (keep.length !== db.items.length) {
      db.items = keep;
      await writeDb(db);
    }

    for (const [token, meta] of accessTokens.entries()) {
      if (meta.expiresAt <= now) {
        accessTokens.delete(token);
      }
    }
  });
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  if (typeof req.query.token === "string") return req.query.token;
  return "";
}

async function loadItemById(id) {
  return withDbLock(async () => {
    const db = await readDb();
    return db.items.find((item) => item.id === id);
  });
}

async function ensureAccess(req, item) {
  if (!item.passwordHash) return true;
  const token = getBearerToken(req);
  const meta = accessTokens.get(token);
  if (!meta || meta.expiresAt <= Date.now()) return false;
  return meta.passwordHash === item.passwordHash;
}

app.get("/api/config", (_req, res) => {
  res.json({
    defaultExpireHours: DEFAULT_EXPIRE_HOURS,
    maxExpireHours: MAX_EXPIRE_HOURS
  });
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "temp-cloud" });
});

app.get("/api/items/public", async (_req, res, next) => {
  try {
    await cleanupExpired();
    const db = await withDbLock(() => readDb());
    const items = db.items
      .filter((item) => !item.passwordHash)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicItem);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/access", async (req, res, next) => {
  try {
    await cleanupExpired();
    const password = String(req.body.password || "");
    if (!password) {
      return res.status(400).json({ error: "请输入密码" });
    }

    const passwordHash = sha256(password);
    const db = await withDbLock(() => readDb());
    const items = db.items
      .filter((item) => item.passwordHash === passwordHash)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicItem);

    if (!items.length) {
      return res.status(404).json({ error: "没有找到该密码对应的内容" });
    }

    const token = crypto.randomUUID();
    accessTokens.set(token, {
      passwordHash,
      expiresAt: Date.now() + TOKEN_TTL_MS
    });

    res.json({ token, items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/items", upload.single("file"), async (req, res, next) => {
  try {
    await cleanupExpired();
    const kind = String(req.body.kind || "").trim();
    const password = String(req.body.password || "");
    const title = String(req.body.title || "").trim();
    const expiresHours = sanitizeHours(req.body.expiresHours);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresHours * 60 * 60 * 1000);

    const baseItem = {
      id: crypto.randomUUID(),
      title: title || "",
      passwordHash: password ? sha256(password) : "",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    let item;
    if (kind === "text") {
      const text = String(req.body.text || "");
      if (!text.trim()) {
        return res.status(400).json({ error: "文本内容不能为空" });
      }
      item = {
        ...baseItem,
        kind,
        text
      };
    } else if (kind === "image" || kind === "file") {
      if (!req.file) {
        return res.status(400).json({ error: "请上传文件" });
      }
      const resolvedKind =
        kind === "image" || req.file.mimetype.startsWith("image/") ? "image" : "file";
      item = {
        ...baseItem,
        kind: resolvedKind,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        size: req.file.size,
        filePath: req.file.path,
        storedName: path.basename(req.file.path)
      };
    } else {
      return res.status(400).json({ error: "无效的内容类型" });
    }

    await withDbLock(async () => {
      const db = await readDb();
      db.items.push(item);
      await writeDb(db);
    });

    res.status(201).json({ item: publicItem(item) });
  } catch (error) {
    if (req.file?.path) {
      await removeFileIfExists(req.file.path);
    }
    next(error);
  }
});

app.get("/api/items/:id/content", async (req, res, next) => {
  try {
    await cleanupExpired();
    const item = await loadItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "内容不存在或已过期" });
    }
    if (!(await ensureAccess(req, item))) {
      return res.status(403).json({ error: "需要密码访问" });
    }

    if (item.kind === "text") {
      return res.json({ id: item.id, kind: item.kind, text: item.text });
    }

    if (item.kind === "image") {
      const buffer = await fsp.readFile(item.filePath);
      return res.json({
        id: item.id,
        kind: item.kind,
        mimeType: item.mimeType,
        dataUrl: `data:${item.mimeType};base64,${buffer.toString("base64")}`
      });
    }

    return res.status(400).json({ error: "该类型不支持内容预览" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/files/:id", async (req, res, next) => {
  try {
    await cleanupExpired();
    const item = await loadItemById(req.params.id);
    if (!item || !item.filePath) {
      return res.status(404).json({ error: "文件不存在或已过期" });
    }
    if (!(await ensureAccess(req, item))) {
      return res.status(403).json({ error: "需要密码访问" });
    }
    res.download(item.filePath, item.originalName);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "服务器内部错误" });
});

cleanupExpired().catch((error) => {
  console.error("Cleanup failed on startup:", error);
});
setInterval(() => {
  cleanupExpired().catch((error) => console.error("Cleanup failed:", error));
}, 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Temp Cloud running at http://0.0.0.0:${PORT}`);
});
