import { ReadingGoal } from '../types';
import { Trophy, Calendar, Trash2 } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface GoalCardProps {
  goal: ReadingGoal;
  onDelete?: (id: number) => void;
}

export default function GoalCard({ goal, onDelete }: GoalCardProps) {
  const percentage = Math.min(100, Math.round((goal.progress / goal.target) * 100));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const label = goal.type === 'yearly'
    ? `${goal.year} Reading Goal`
    : `${MONTHS[(goal.month || 1) - 1]} ${goal.year}`;

  const progressColor = goal.completed ? '#16a34a' : percentage >= 75 ? '#2563eb' : percentage >= 50 ? '#d97706' : '#e2e8f0';
  const trackColor = '#f1f5f9';

  return (
    <div className={`card p-5 ${goal.completed ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {goal.type === 'yearly' ? (
              <Trophy size={16} className={goal.completed ? 'text-amber-500' : 'text-slate-400'} />
            ) : (
              <Calendar size={16} className={goal.completed ? 'text-green-600' : 'text-slate-400'} />
            )}
            <span className="font-semibold text-slate-800 text-sm">{label}</span>
            {goal.completed && (
              <span className="badge bg-green-100 text-green-700">✓ Completed!</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            {goal.progress} of {goal.target} books
          </p>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
            title="Delete goal"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* SVG progress ring */}
        <div className="flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke={trackColor} strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={progressColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="progress-ring__circle"
            />
            <text x="50" y="46" textAnchor="middle" className="fill-slate-800 font-bold" fontSize="18">
              {percentage}%
            </text>
            <text x="50" y="61" textAnchor="middle" className="fill-slate-400" fontSize="10">
              done
            </text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Completed</span>
            <span className="font-semibold text-slate-800">{goal.progress}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Remaining</span>
            <span className="font-semibold text-slate-800">
              {Math.max(0, goal.target - goal.progress)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Goal</span>
            <span className="font-semibold text-slate-800">{goal.target} books</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                goal.completed ? 'bg-green-500' : percentage >= 75 ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
