import { useState } from "react";
import { Bell, HelpCircle, Search, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { Breadcrumb } from "../ui/Breadcrumb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { CURRENT_USER } from "../../data/mockData";

export function Header({ breadcrumb }: { breadcrumb: Array<{ label: string; to?: string }> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const user = currentUser ?? CURRENT_USER;

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  }

  return (
    <header className="h-16 sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center gap-4 px-5 shrink-0">
      <Breadcrumb items={breadcrumb} />

      <div className="flex-1 max-w-md ml-2 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            placeholder="Search by owner, survey no., document ID…"
            className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1" />

      <button className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hidden sm:inline-flex" aria-label="Help">
        <HelpCircle className="h-4.5 w-4.5" />
      </button>

      <div className="relative">
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 relative"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger-500" />
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-slate-200 shadow-lg py-2 z-40">
            <p className="px-3.5 py-2 text-xs font-semibold text-navy-800 border-b border-slate-100">Notifications</p>
            {[
              ["3 new documents assigned for verification", "5 mins ago"],
              ["Validation failed on DOC-2024-1044", "22 mins ago"],
              ["Weekly digitization report is ready", "2 hrs ago"],
            ].map(([msg, time]) => (
              <div key={msg} className="px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer">
                <p className="text-xs text-navy-800">{msg}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{time}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-8 w-px bg-slate-200 hidden sm:block" />

      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-md hover:bg-slate-100">
          <span className="h-8 w-8 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {user.avatarInitials}
          </span>
          <span className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-navy-900 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{user.role}</p>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-40">
            <button
              onClick={() => { setMenuOpen(false); navigate("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-navy-700 hover:bg-slate-50"
            >
              <User className="h-3.5 w-3.5" /> Profile
            </button>
            <button
              onClick={() => { setMenuOpen(false); navigate("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-navy-700 hover:bg-slate-50"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-danger-600 hover:bg-danger-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

