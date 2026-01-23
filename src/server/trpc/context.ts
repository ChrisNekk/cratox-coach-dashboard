import { type inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/server/db";

export async function createContext(opts: CreateNextContextOptions) {
  const session = await getServerSession(authOptions);
  
  return {
    session,
    db,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
