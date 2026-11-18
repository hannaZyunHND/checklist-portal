import { PRESET_AVATARS } from '../../services/authService';

interface UserAvatarProps {
  name: string;
  avatarDataUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAvatar({ name, avatarDataUrl, size = 'sm' }: UserAvatarProps) {
  const sizeClass = SIZE_MAP[size];

  if (avatarDataUrl && !avatarDataUrl.startsWith('preset:')) {
    return (
      <img
        src={avatarDataUrl}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover bg-slate-100`}
      />
    );
  }

  let bg = '#0D9488';
  let fg = '#FFFFFF';
  if (avatarDataUrl?.startsWith('preset:')) {
    const presetId = avatarDataUrl.replace('preset:', '');
    const found = PRESET_AVATARS.find((p) => p.id === presetId);
    if (found) {
      bg = found.bg;
      fg = found.fg;
    }
  }

  return (
    <span
      aria-label={name}
      style={{ backgroundColor: bg, color: fg }}
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-white/60 font-semibold select-none`}
    >
      {getInitials(name)}
    </span>
  );
}
