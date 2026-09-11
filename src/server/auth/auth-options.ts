import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";

/**
 * NextAuth credentials authentication with stateless JWT sessions.
 *
 * Security notes:
 * - No database session table is required for the MVP.
 * - Credentials are validated with Zod before touching the database.
 * - Password hashes are compared with bcrypt; failures are generic
 *   ("Invalid email or password") and never reveal which part failed.
 * - Only the user id and email travel in the JWT/session.
 */

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
          },
        });

        if (!user) {
          // Constant-ish response: same message for unknown user and
          // wrong password to avoid account enumeration.
          return null;
        }

        const passwordMatches = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) {
          return null;
        }

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};
