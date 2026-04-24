import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') {
      throw new AuthenticationError('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AuthenticationError('Credenciais inválidas');

    if (user.mfaEnabled) {
      return { requiresMfa: true, userId: user.id };
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this.generateTokens(user);
  }

  async verifyMfa(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new AuthenticationError();

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!valid) throw new AuthenticationError('Código MFA inválido');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.generateTokens(user);
  }

  async setupMfa(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuário');

    const secret = speakeasy.generateSecret({ name: `HealthTech (${user.email})`, length: 32 });
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret.base32 } });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
    return { secret: secret.base32, qrCode: qrCodeUrl };
  }

  async enableMfa(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new ValidationError('Configure o MFA primeiro');

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!valid) throw new ValidationError('Código MFA inválido');
    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { mfaEnabled: true };
  }

  async disableMfa(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { mfaEnabled: false };
  }

  async refreshToken(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AuthenticationError('Token inválido ou expirado');
    }

    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AuthenticationError('Token inválido ou expirado');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status !== 'ACTIVE') throw new AuthenticationError();

    await prisma.refreshToken.delete({ where: { token } });
    return this.generateTokens(user);
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => null);
  }

  private async generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { userId: user.id, email: user.email, role: user.role as import('@prisma/client').UserRole };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuário');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError('Senha atual incorreta');

    const hash = await bcrypt.hash(newPassword, config.bcrypt.rounds);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}

export const authService = new AuthService();
