import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type UserAvatarProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  alwaysColor?: boolean;
};

export function getUserColorClasses(name: string): { bg: string; text: string } {
  const safeName = (name ?? '').trim() || 'Unknown';
  const initial = safeName[0]?.toUpperCase() ?? 'U';

  const palette = [
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-lime-100', text: 'text-lime-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-sky-100', text: 'text-sky-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-slate-100', text: 'text-slate-700' },
  ];

  const code = initial.charCodeAt(0);
  return palette[code % palette.length];
}

/**
 * UserAvatar renders the user's avatar with deterministic colors based on the name's initial.
 * - If an image is provided, it will be shown. Set alwaysColor to true to keep bg color behind images.
 */
export function UserAvatar({
  name,
  imageUrl,
  className,
  size = 'sm',
  alwaysColor = true,
}: UserAvatarProps) {
  const safeName = (name ?? '').trim() || 'Unknown';
  const initial = safeName[0]?.toUpperCase() || 'U';
  const { bg, text } = getUserColorClasses(safeName);

  const sizeClasses = size === 'lg' ? 'h-10 w-10' : size === 'md' ? 'h-8 w-8' : 'h-6 w-6';
  const colorClasses = `${bg} ${text}`;

  return (
    <Avatar
      className={[sizeClasses, alwaysColor ? colorClasses : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <AvatarImage src={imageUrl ?? undefined} alt={safeName} />
      <AvatarFallback className={colorClasses}>{initial}</AvatarFallback>
    </Avatar>
  );
}
