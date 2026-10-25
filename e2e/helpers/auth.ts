import type { Page, BrowserContext } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3001';

interface AuthSession {
  cookie: string;
  userId: string;
  userEmail: string;
}

/**
 * Регистрирует пользователя через API и возвращает session cookie.
 * Используется в fixtures для создания тестовых данных без UI.
 */
export async function apiRegister(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, consent: true }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(`Register failed: ${JSON.stringify(body)}`);
  }

  // Подтверждаем email через токен в БД (через API verify-email)
  // Сначала логинимся, чтобы получить сессию
  return apiLogin(email, password);
}

/**
 * Логинит пользователя через API и возвращает cookie + данные.
 */
export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(`Login failed: ${JSON.stringify(body)}`);
  }

  const data = await res.json();

  // Извлекаем Set-Cookie заголовок
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/donate_session=([^;]+)/);
  if (!match) {
    throw new Error('No session cookie in login response: ' + setCookie.slice(0, 120));
  }

  const rawValue = match[1];

  return {
    cookie: rawValue,
    userId: data.user.id,
    userEmail: data.user.email,
  };
}

/**
 * Устанавливает cookie аутентификации в браузерный контекст.
 * Принимает raw value (без имени куки) или полную строку `name=value`.
 */
export async function setAuthCookie(context: BrowserContext, cookieValue: string) {
  // Если передан полный формат "donate_session=value", извлекаем значение
  const value = cookieValue.startsWith('donate_session=') 
    ? cookieValue.slice('donate_session='.length) 
    : cookieValue;

  await context.addCookies([
    {
      name: 'donate_session',
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Выполняет API-запрос с кукой аутентификации.
 */
export async function apiAuthenticated(path: string, cookie: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  // cookie — это raw JWT, для Cookie header нужен формат "donate_session=<value>"
  const cookieHeader = cookie.includes('=') ? cookie : `donate_session=${cookie}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      ...(options.headers || {}),
    },
  });
  return res;
}
