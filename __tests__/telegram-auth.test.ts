import { describe, it, expect, afterEach } from 'vitest';
import {
  verifyTelegramInitData,
  requireTelegramId,
} from '../supabase/functions/_shared/telegram-auth';

// --- Хелперы: строим валидный initData тем же алгоритмом, что и функция ---
async function hmac(keyData: Uint8Array | ArrayBuffer, msg: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
}
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
async function makeSignedInitData(
  botToken: string,
  user: Record<string, unknown>,
  authDate: number
): Promise<string> {
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(authDate));
  const dcs = Array.from(params.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = await hmac(new TextEncoder().encode('WebAppData'), botToken);
  const hash = toHex(await hmac(new Uint8Array(secret), dcs));
  params.set('hash', hash);
  return params.toString();
}
function devModeInitData(userId: number): string {
  const p = new URLSearchParams();
  p.set('user', JSON.stringify({ id: userId }));
  p.set('hash', 'dev-mode');
  return p.toString();
}

/**
 * Реальный Telegram (Bot API 7.10+) присылает ещё поля query_id и signature.
 * Свой `hash` он считает по всем полям КРОМЕ hash и signature — signature
 * относится к отдельной Ed25519-проверке для третьих сторон.
 */
async function makeRealisticInitData(
  botToken: string,
  user: Record<string, unknown>,
  authDate: number
): Promise<string> {
  const signed = new URLSearchParams();
  signed.set('query_id', 'AAGYiDoYAAAAAJiIOhgXZ4dt');
  signed.set('user', JSON.stringify(user));
  signed.set('auth_date', String(authDate));

  const dcs = Array.from(signed.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = await hmac(new TextEncoder().encode('WebAppData'), botToken);
  const hash = toHex(await hmac(new Uint8Array(secret), dcs));

  const out = new URLSearchParams(signed);
  out.set('signature', 'Ksh4gPaZc0k_ed25519_signature_example');
  out.set('hash', hash);
  return out.toString();
}

function shimDeno(env: Record<string, string | undefined>) {
  (globalThis as any).Deno = { env: { get: (k: string) => env[k] } };
}

const now = () => Math.floor(Date.now() / 1000);

afterEach(() => {
  delete (globalThis as any).Deno;
});

describe('verifyTelegramInitData', () => {
  it('accepts a correctly signed payload and returns the user', async () => {
    const initData = await makeSignedInitData('bot-token', { id: 7, first_name: 'A' }, now());
    const user = await verifyTelegramInitData(initData, 'bot-token');
    expect(user.id).toBe(7);
  });


  it('accepts real Telegram initData that carries a signature field', async () => {
    // Регрессия: signature попадал в строку для хеша, и подпись не сходилась —
    // вход ломался у всех на свежих клиентах Telegram.
    const initData = await makeRealisticInitData('bot-token', { id: 406489240, first_name: 'Н' }, now());
    const user = await verifyTelegramInitData(initData, 'bot-token');
    expect(user.id).toBe(406489240);
  });


  it('accepts initData whose hash was computed WITH the signature field', async () => {
    // Документация не даёт однозначного ответа, входит ли signature в строку для
    // hash, поэтому верификация обязана принимать оба варианта.
    const params = new URLSearchParams();
    params.set('query_id', 'AAGYiDoYAAAAAJiIOhibKCoD');
    params.set('user', JSON.stringify({ id: 406489240 }));
    params.set('auth_date', String(now()));
    params.set('signature', 'Ksh4gPaZc0k_ed25519_signature_example');

    const dcs = Array.from(params.entries())
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');
    const secret = await hmac(new TextEncoder().encode('WebAppData'), 'bot-token');
    params.set('hash', toHex(await hmac(new Uint8Array(secret), dcs)));

    const user = await verifyTelegramInitData(params.toString(), 'bot-token');
    expect(user.id).toBe(406489240);
  });

  it('rejects a tampered payload (wrong signature)', async () => {
    const initData = await makeSignedInitData('bot-token', { id: 7 }, now());
    const tampered = initData.replace('%22id%22%3A7', '%22id%22%3A999');
    await expect(verifyTelegramInitData(tampered, 'bot-token')).rejects.toThrow();
  });

  it('rejects the wrong bot token', async () => {
    const initData = await makeSignedInitData('bot-token', { id: 7 }, now());
    await expect(verifyTelegramInitData(initData, 'other-token')).rejects.toThrow();
  });

  it('rejects an expired auth_date', async () => {
    const old = now() - 100000; // старше 86400с по умолчанию
    const initData = await makeSignedInitData('bot-token', { id: 7 }, old);
    await expect(verifyTelegramInitData(initData, 'bot-token')).rejects.toThrow();
  });
});

describe('requireTelegramId — dev-mode gate (регрессия на бэкдор)', () => {
  it('REJECTS hash=dev-mode when ALLOW_DEV_AUTH is not set (prod)', async () => {
    shimDeno({ TELEGRAM_JOBBOT_TOKEN: 'bot-token' }); // ALLOW_DEV_AUTH отсутствует
    await expect(requireTelegramId({ initData: devModeInitData(999) })).rejects.toThrow();
  });

  it('accepts hash=dev-mode only when ALLOW_DEV_AUTH=true (local)', async () => {
    shimDeno({ ALLOW_DEV_AUTH: 'true' });
    const id = await requireTelegramId({ initData: devModeInitData(999) });
    expect(id).toBe(999);
  });

  it('accepts a real signed payload in prod (dev-mode off)', async () => {
    shimDeno({ TELEGRAM_JOBBOT_TOKEN: 'bot-token' });
    const initData = await makeSignedInitData('bot-token', { id: 55 }, now());
    const id = await requireTelegramId({ initData });
    expect(id).toBe(55);
  });

  it('throws without initData', async () => {
    shimDeno({ TELEGRAM_JOBBOT_TOKEN: 'bot-token' });
    await expect(requireTelegramId({})).rejects.toThrow();
  });
});
