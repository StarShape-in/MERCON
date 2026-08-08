import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { userService } from '@/services/userService';
import type { User } from '@mercon/shared-types';
import { cn } from '@/lib/utils';

/** GET /users is open to both Admin and Operator — the same audience as this
 *  page — so trip audit fields (which only store a raw user id, no relation)
 *  can be resolved to a name/role client-side without a backend change. */
export function useUserLookup() {
  const { data } = useQuery({
    queryKey: ['users-lookup'],
    queryFn: () => userService.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const byId = new Map<string, User>((data || []).map((u) => [u.id, u]));
  return byId;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

interface UserChipProps {
  userId: string | null | undefined;
  users: Map<string, User>;
  /** Small = inline text-only, no avatar (audit rows). Default renders avatar + name. */
  size?: 'sm' | 'default';
  className?: string;
}

export default function UserChip({ userId, users, size = 'default', className = '' }: UserChipProps) {
  if (!userId) {
    return <span className={cn("text-[11px] font-semibold text-[#9898A4]", className)}>System</span>;
  }

  const user = users.get(userId);
  const label = user?.name || user?.username || 'Unknown user';

  if (size === 'sm') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className={cn("text-[11px] font-bold text-[#111] dark:text-slate-200 underline decoration-dotted decoration-[#9898A4] underline-offset-2 cursor-default", className)}>
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{user?.role ? `${label} · ${user.role}` : label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6">
        <AvatarFallback className="text-[9px] font-bold bg-[#E8450F]/10 text-[#E8450F]">
          {initials(label)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#111] truncate">{label}</p>
        {user?.role && <p className="text-[9px] text-[#9898A4] font-semibold">{user.role}</p>}
      </div>
    </div>
  );
}
