"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/types/api";

/**
 * Client-side precise role guard. middleware.ts handles the coarse redirect;
 * this prevents a flash of admin content and covers direct client navigation.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user && !allow.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, allow, router]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user && !allow.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="text-lg font-semibold">Access restricted</p>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
