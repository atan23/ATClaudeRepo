import { NavLink } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, Library, Sparkles, Target, LogOut, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">ReadWise</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink
          to="/library"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <Library size={18} />
          My Library
        </NavLink>
        <NavLink
          to="/recommendations"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <Sparkles size={18} />
          Discover
        </NavLink>
        <NavLink
          to="/goals"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <Target size={18} />
          Goals & Badges
        </NavLink>
      </nav>

      {/* User info */}
      {user && (
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 mb-3 px-2 py-1.5">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                <span className="font-medium">{user.points} pts</span>
                <span className="text-slate-400">· Lv {user.level}</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
