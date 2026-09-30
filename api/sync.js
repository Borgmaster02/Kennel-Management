import { neon } from "@neondatabase/serverless";
import { mergeStates } from "../src/utils/stateMerge.js";
import { migrateState } from "../src/utils/storage.js";

const STATE_KEY = "default";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body || "{}"));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function checkAccess(req) {
  const expected = process.env.KENNEL_ACCESS_CODE || process.env.BACKUP_SECRET || "";
  if (!expected) return true;
  const provided = req.headers["x-kennel-access-code"] || req.headers["X-Kennel-Access-Code"] || "";
  return String(provided).trim() === String(expected).trim();
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS kennel_app_state (
      state_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function loadRow(sql) {
  const rows = await sql`
    SELECT data, updated_at
    FROM kennel_app_state
    WHERE state_key = ${STATE_KEY}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function saveState(sql, state) {
  const cleanState = migrateState(state || {});
  const json = JSON.stringify(cleanState);
  const rows = await sql`
    INSERT INTO kennel_app_state (state_key, data, updated_at)
    VALUES (${STATE_KEY}, ${json}::jsonb, now())
    ON CONFLICT (state_key)
    DO UPDATE SET data = ${json}::jsonb, updated_at = now()
    RETURNING updated_at
  `;
  return { state: cleanState, updatedAt: rows[0]?.updated_at || new Date().toISOString() };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 200, { ok: true });
  if (!process.env.DATABASE_URL) return send(res, 500, { ok: false, error: "DATABASE_URL is not configured." });
  if (!checkAccess(req)) return send(res, 401, { ok: false, error: "Cloud access code required or incorrect." });

  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureTable(sql);

    if (req.method === "GET") {
      const row = await loadRow(sql);
      return send(res, 200, {
        ok: true,
        state: row?.data ? migrateState(row.data) : null,
        updatedAt: row?.updated_at || null,
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const incoming = migrateState(body?.state || {});
      const row = await loadRow(sql);
      const nextState = body?.mode === "replace" || !row?.data ? incoming : mergeStates(row.data, incoming);
      const saved = await saveState(sql, nextState);
      return send(res, 200, { ok: true, state: saved.state, updatedAt: saved.updatedAt });
    }

    return send(res, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    console.error("Cloud sync failed", error);
    return send(res, 500, { ok: false, error: error.message || "Cloud sync failed." });
  }
}
