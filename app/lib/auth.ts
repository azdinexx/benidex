import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcrypt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: {
          label: "Email or Group Name",
          type: "text",
          placeholder: "Email or Group Name",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const loginVal = credentials?.login || (credentials as any)?.email;
        if (!loginVal || !credentials?.password) return null;

        const admin = await prisma.admin.findFirst({
          where: { email: { equals: loginVal, mode: "insensitive" } },
        });

        if (admin) {
          const isPasswordValid = admin.password.startsWith("$2")
            ? await bcrypt.compare(credentials.password, admin.password)
            : credentials.password === admin.password;

          if (!isPasswordValid) return null;
          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: "ADMIN",
          };
        }

        const group = await prisma.group.findFirst({
          where: { name: { equals: loginVal, mode: "insensitive" } },
        });

        if (group) {
          const isPasswordValid = group.password.startsWith("$2")
            ? await bcrypt.compare(credentials.password, group.password)
            : credentials.password === group.password;

          if (!isPasswordValid) return null;
          return {
            id: group.id,
            email: `${group.name.toLowerCase()}@benidex.com`,
            name: group.name,
            role: "GROUP",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // ← was missing
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
};
