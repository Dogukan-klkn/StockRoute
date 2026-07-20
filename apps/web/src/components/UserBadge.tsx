import { Avatar, Box, Typography } from '@mui/material';
import { useAuthStore } from '../lib/auth-store';
import { ROLE_COLORS, ROLE_LABELS } from '../lib/role-labels';

/** "Ayşe Yılmaz" → "AY" gibi en fazla iki baş harf üretir. */
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}

export function UserBadge() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
        {initialsOf(user.fullName)}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {user.fullName}
        </Typography>
        <Typography variant="caption" sx={{ color: ROLE_COLORS[user.role], lineHeight: 1.2 }}>
          {ROLE_LABELS[user.role]}
        </Typography>
      </Box>
    </Box>
  );
}
