import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { StorageService } from '../services/storage.service.ts';
import { generateUserToken } from '../middleware/auth.middleware.ts';
import { UserRole } from '../models/User.ts';

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const { name, email, password, organization, department } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and password are required.',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long.',
        });
      }

      const existing = await StorageService.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A user with this email address already exists.',
        });
      }

      const assignedRole: UserRole = 'analyst';

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await StorageService.createUser({
        name,
        email,
        passwordHash,
        role: assignedRole,
        organization: organization || 'Enterprise Security Team',
        department: department || 'Privacy & Compliance',
      });

      const token = generateUserToken({
        id: (user as any)._id?.toString() || (user as any).id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        token,
        user: {
          id: (user as any)._id?.toString() || (user as any).id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          department: user.department,
          preferences: user.preferences,
        },
      });
    } catch (err: any) {
      console.error('[Auth Register Error]', err);
      return res.status(500).json({
        success: false,
        error: `Registration failed: ${err.message}`,
      });
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required.',
        });
      }

      const user = await StorageService.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      const token = generateUserToken({
        id: (user as any)._id?.toString() || (user as any).id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      });

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: (user as any)._id?.toString() || (user as any).id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          department: user.department,
          preferences: user.preferences,
        },
      });
    } catch (err: any) {
      console.error('[Auth Login Error]', err);
      return res.status(500).json({
        success: false,
        error: `Login failed: ${err.message}`,
      });
    }
  }

  public static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized.' });
      }

      const user = await StorageService.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      return res.json({
        success: true,
        user: {
          id: (user as any)._id?.toString() || (user as any).id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          department: user.department,
          preferences: user.preferences,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async listTeam(req: Request, res: Response) {
    try {
      const users = await StorageService.listUsers();
      return res.json({
        success: true,
        users,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}


