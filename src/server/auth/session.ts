import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth/auth-options";

/**
 * Server-side session helpers.
 *
 * Server components and server actions resolve the session through
 * getServerSession — the session cookie is read from the request and the
 * JWT is verified server-side. Client components never receive anything
 * beyond the public session payload (id, name, email).
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

/** Returns the authenticated user, or null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user || !user.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
  };
}

/**
 * Returns the authenticated user or redirects to sign-in.
 * Use in protected server components and actions.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
