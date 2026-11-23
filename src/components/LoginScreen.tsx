import React, { useState } from 'react';
import { AppUser, Role } from '../types/cadbury';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [usernameInput, setUsernameInput] = useState<string>('admin');
  const [passwordInput, setPasswordInput] = useState<string>('cadbury123');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase());
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setErrorMsg('Invalid credentials. Please use one of the quick role profiles below.');
    }
  };

  const handleQuickLogin = (user: AppUser) => {
    onLogin(user);
  };

  const roles = [
    { role: 'ALL', label: 'All Staff' },
    { role: Role.ADMIN, label: 'Admin / Owner' },
    { role: Role.LOADER, label: 'Warehouse Loader' },
    { role: Role.DRIVER, label: 'Fleet Driver' },
    { role: Role.DELIVERY_BOY, label: 'Delivery Staff' },
    { role: Role.ACCOUNTANT, label: 'Accountant' }
  ];

  const filteredUsers = users.filter(u => 
    selectedRole === 'ALL' || u.role === selectedRole
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cadbury-900 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600 rounded-full blur-3xl opacity-30"></div>

      <div className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 text-cadbury-950 flex items-center justify-center text-3xl font-black mx-auto shadow-lg">
            <i className="fa-solid fa-candy-cane"></i>
          </div>
          <h1 className="text-2xl font-black text-cadbury-950 tracking-tight">
            CADBURY DISTRIBUTOR & LOGISTICS
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            Distributor Management System: Goods Tracking, Vehicle GPS, Loader Operations & Party Ledgers
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Username / Employee ID</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. admin or loader_ramesh"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-cadbury-950 hover:bg-cadbury-900 text-white font-black text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-to-bracket text-gold-400"></i> Secure Login to DMS
          </button>
        </form>

        {/* One-Click Quick Role Switcher for Demo */}
        <div className="border-t border-slate-200/80 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Single-Click Role Demo Logins:
            </span>
            <span className="text-[10px] text-cadbury-700 font-semibold">Test role views instantly</span>
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {roles.map(r => (
              <button
                key={r.role}
                type="button"
                onClick={() => setSelectedRole(r.role)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedRole === r.role
                    ? 'bg-cadbury-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Quick Login Profiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleQuickLogin(user)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-cadbury-400 bg-slate-50/70 hover:bg-cadbury-50/30 transition-all text-left flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-cadbury-900">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {user.employeeId} • <span className="font-bold text-cadbury-700">{user.role}</span>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-right text-slate-400 group-hover:text-cadbury-900 group-hover:translate-x-0.5 transition-all text-xs"></i>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400">
          Cadbury Authorized Distributor Network • Mumbai Territory
        </div>
      </div>
    </div>
  );
};
