import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/server/db";

export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug mode
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
        console.log("[AUTH] Authorize called with email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          return null;
        }

        try {
          const coach = await db.coach.findUnique({
            where: { email: credentials.email },
          });

          console.log("[AUTH] Coach found:", coach ? "yes" : "no", coach?.email);

          if (!coach || !coach.isActive) {
            console.log("[AUTH] Coach not found or not active");
            return null;
          }

          // In production, you would hash and compare passwords
          // For demo purposes, we accept any password for seeded coaches
          // or check if password matches a simple hash
          const isValidPassword = coach.passwordHash === credentials.password ||
            coach.passwordHash === `hashed_${credentials.password}`;

          console.log("[AUTH] Password check:", isValidPassword, "hash:", coach.passwordHash);

          if (!isValidPassword) {
            console.log("[AUTH] Invalid password");
            return null;
          }

          console.log("[AUTH] Login successful for:", coach.email);
          return {
            id: coach.id,
            email: coach.email,
            name: coach.name,
            image: coach.logoUrl,
          };
        } catch (error) {
          console.error("[AUTH] Error during authorization:", error);
          return null;
        }
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
