import { useEffect, useMemo, useState } from "react";
import { useContextStore } from "../../../app/store/context";
import { fetchPlatformMembers, type PlatformMember } from "../services/membersService";

export default function UsersPage() {
  const platformId = useContextStore((s) => s.currentPlatform?.id);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!platformId) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await fetchPlatformMembers(platformId);
        if (!active) return;
        setMembers(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load members");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [platformId]);

  const content = useMemo(() => {
    if (isLoading) return <div className="text-sm text-theme-secondary">Loading…</div>;
    if (error) return <div className="text-sm text-red-500">Error: {error}</div>;
    if (!members.length) return <div className="text-sm text-theme-secondary">No users found</div>;
    return (
      <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium text-theme-primary">{m.email}</div>
              <div className="mt-1 text-xs text-theme-secondary">
                {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : ""}
              </div>
            </div>
            <div className="text-xs text-theme-tertiary capitalize">{m.role}</div>
          </li>
        ))}
      </ul>
    );
  }, [members, isLoading, error]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-theme-primary">Users</h1>
      {content}
    </div>
  );
}


