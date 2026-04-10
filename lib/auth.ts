import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { normalizeEmail } from "./normalize";
import { rateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email);
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        const forwardedFor =
          req?.headers?.["x-forwarded-for"] ||
          req?.headers?.["x-real-ip"] ||
          "unknown";

        const ip = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : String(forwardedFor).split(",")[0].trim();

        const rl = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);

        if (!rl.success) {
          throw new Error("Demasiados intentos. Probá más tarde.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          image: user.image ?? null,
          username: user.username ?? null,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.phone = (user as any).phone ?? null;
        token.image = (user as any).image ?? null;
        token.username = (user as any).username ?? null;
      }
      // Called when client invokes useSession().update(...)
      if (trigger === "update" && updateData) {
        const u = updateData as { image?: string | null; name?: string; username?: string | null };
        if (typeof u.image !== "undefined") token.image = u.image;
        if (typeof u.name !== "undefined") token.name = u.name;
        if (typeof u.username !== "undefined") token.username = u.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).phone = token.phone ?? null;
        (session.user as any).image = token.image ?? null;
        (session.user as any).username = token.username ?? null;
        // Keep session.user.name in sync with token.name
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
};