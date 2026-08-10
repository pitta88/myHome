interface CategoryBadgeProps {
  icon: string;
  name: string;
  color: string;
}

const colorMap: Record<string, string> = {
  green: 'bg-green-900/50 text-green-400 border-green-800',
  blue: 'bg-blue-900/50 text-blue-400 border-blue-800',
  orange: 'bg-orange-900/50 text-orange-400 border-orange-800',
  gray: 'bg-slate-700 text-slate-400 border-slate-600',
};

export default function CategoryBadge({ icon, name, color }: CategoryBadgeProps) {
  const colorClass = colorMap[color] || colorMap.gray;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {icon} {name}
    </span>
  );
}
