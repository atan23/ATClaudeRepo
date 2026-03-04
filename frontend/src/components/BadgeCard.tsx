import { Badge } from '../types';

interface BadgeCardProps {
  badge: Badge;
  earned?: boolean;
  earnedAt?: string;
}

export default function BadgeCard({ badge, earned = false, earnedAt }: BadgeCardProps) {
  return (
    <div
      className={`card p-4 text-center transition-all duration-200 ${
        earned
          ? 'hover:shadow-md hover:-translate-y-0.5'
          : 'opacity-50 grayscale'
      }`}
    >
      <div className={`text-4xl mb-2 ${earned ? '' : 'filter grayscale'}`}>
        {badge.icon}
      </div>
      <h3 className="font-semibold text-sm text-slate-800 mb-1">{badge.name}</h3>
      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{badge.description}</p>

      {earned ? (
        <div className="space-y-1">
          {badge.points_reward > 0 && (
            <span className="badge bg-amber-100 text-amber-700 mx-auto">
              +{badge.points_reward} pts
            </span>
          )}
          {earnedAt && (
            <p className="text-xs text-slate-400">
              {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 mt-1">
          🔒 Not yet earned
        </div>
      )}
    </div>
  );
}
