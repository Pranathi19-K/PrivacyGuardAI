import jwt, { type JwtPayload } from "jsonwebtoken";
import type { RequestHandler } from "express";

export const SESSION_COOKIE = "pg_session";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured.");
  }
  return secret;
}

export function setSessionCookie(res: Parameters<RequestHandler>[1], userId: string): void {
  const token = jwt.sign({}, getSessionSecret(), {
    subject: userId,
    expiresIn: "12h",
    issuer: "privacyguard-ai",
    audience: "privacyguard-ai-user",
  });

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Parameters<RequestHandler>[1]): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }

  try {
    const payload = jwt.verify(token, getSessionSecret(), {
      issuer: "privacyguard-ai",
      audience: "privacyguard-ai-user",
    }) as JwtPayload;
    if (typeof payload.sub !== "string" || !payload.sub) {
      res.status(401).json({ error: "Please sign in to continue." });
      return;
    }

    res.locals.userId = payload.sub;
    next();
  } catch {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
};

export function userIdFrom(res: Parameters<RequestHandler>[1]): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Authenticated user context is unavailable.");
  }
  return userId;
}
