import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          // Google will show the account chooser only inside the chosen domain
          // when hd is set. We still re-check below.
          hd: allowedDomain || undefined,
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ profile, user }) {
      const email = profile?.email ?? user?.email;
      if (!email) return false;
      if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain}`)) {
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
