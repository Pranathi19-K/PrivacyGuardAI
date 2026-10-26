import bcrypt from "bcryptjs";
import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import {
  DeleteAccountResponse,
  GetCurrentUserResponse,
  LoginUserBody,
  LoginUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
} from "@workspace/api-zod";
import { clearSessionCookie, requireAuth, setSessionCookie, userIdFrom } from "../middlewares/auth";
import { AuditModel, DetectionRuleModel, ScanModel, UserModel } from "../lib/models";
import { clearUserScanDrafts } from "../lib/scan-drafts";

const router: IRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again later." },
});

function authUser(user: { id?: string; _id: { toString(): string }; name: string; email: string }) {
  return {
    id: user.id ?? user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a name, valid email, and password of at least 10 characters." });
    return;
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  if (!name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }

  const existing = await UserModel.findOne({ email }).select("_id").lean();
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await UserModel.create({ name, email, passwordHash });
    const response = RegisterUserResponse.parse(authUser(user));
    setSessionCookie(res, user._id.toString());
    res.status(201).json(response);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    throw error;
  }
});

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  setSessionCookie(res, user._id.toString());
  res.json(LoginUserResponse.parse(authUser(user)));
});

router.post("/auth/logout", (_req, res): void => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, async (_req, res): Promise<void> => {
  const user = await UserModel.findById(userIdFrom(res)).select("name email").lean();
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  res.json(GetCurrentUserResponse.parse(authUser(user)));
});

router.delete("/account", requireAuth, async (_req, res): Promise<void> => {
  const ownerId = userIdFrom(res);
  clearUserScanDrafts(ownerId);
  await Promise.all([
    ScanModel.deleteMany({ ownerId }),
    DetectionRuleModel.deleteMany({ ownerId }),
    AuditModel.deleteMany({ ownerId }),
    UserModel.deleteOne({ _id: ownerId }),
  ]);
  clearSessionCookie(res);
  res.status(204).json(DeleteAccountResponse.parse(undefined));
});

export default router;
