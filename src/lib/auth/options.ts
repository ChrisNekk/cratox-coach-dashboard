import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/server/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const coach = await db.coach.findUnique({
          where: { email: credentials.email },
        });

        if (!coach || !coach.isActive) {
          return null;
        }

        // In production, you would hash and compare passwords
        // For demo purposes, we accept any password for seeded coaches
        // or check if password matches a simple hash
        const isValidPassword = coach.passwordHash === credentials.password || 
          coach.passwordHash === `hashed_${credentials.password}`;

        if (!isValidPassword) {
          return null;
        }

        return {
          id: coach.id,
          email: coach.email,
          name: coach.name,
          image: coach.logoUrl,
        };
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
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
