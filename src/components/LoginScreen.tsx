import React, { useState } from 'react';
import { AppUser, Role } from '../types/cadbury';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [usernameInput, setUsernameInput] = useState<string>('admin');
  const [passwordInput, setPasswordInput] = useState<string>('88283671');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showQuickProfiles, setShowQuickProfiles] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoggingIn(true);

    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('कृपया User ID और Password दोनों दर्ज करें।');
      setIsLoggingIn(false);
      return;
    }

    // 1. Try server auth endpoint
    try {
      const res = await fetch('/api/cadbury/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLogin(data.user);
        setIsLoggingIn(false);
        return;
      } else if (data.message) {
        setErrorMsg(data.message);
        setIsLoggingIn(false);
        return;
      }
    } catch (err) {
      // Fallback local check
    }

    // 2. Local fallback check
    const foundUser = users.find(u => u.username.toLowerCase() === cleanUsername);
    if (!foundUser) {
      setErrorMsg(`User ID "${usernameInput}" नहीं मिला। कृपया सही User ID डालें।`);
      setIsLoggingIn(false);
      return;
    }

    if (foundUser.status === 'Inactive') {
      setErrorMsg('⚠️ आपका अकाउंट निष्क्रिय (Inactive / Disabled) है। कृपया डिस्ट्रीब्यूटर एडमिन से संपर्क करें।');
      setIsLoggingIn(false);
      return;
    }

    const expectedPass = foundUser.password || (foundUser.username === 'admin' ? '88283671' : 'cadbury123');
    if (expectedPass !== cleanPassword) {
      setErrorMsg('⚠️ गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      setIsLoggingIn(false);
      return;
    }

    onLogin(foundUser);
    setIsLoggingIn(false);
  };

  const handleQuickSelect = (user: AppUser) => {
    setUsernameInput(user.username);
    setPasswordInput(user.password || 'cadbury123');
    setErrorMsg('');
  };

  const roles = [
    { role: 'ALL', label: 'All Staff' },
    { role: Role.ADMIN, label: 'Admin / Owner' },
    { role: Role.MANAGER, label: 'Manager' },
    { role: Role.ACCOUNTANT, label: 'Accountant' },
    { role: Role.LOADER, label: 'Warehouse Loader' },
    { role: Role.DRIVER, label: 'Fleet Driver' },
    { role: Role.DELIVERY_BOY, label: 'Delivery Boy' },
    { role: Role.SALESMAN, label: 'Salesman' }
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
            Distributor Management System: Goods Tracking, Vehicle GPS, Loader Operations & Secure Staff Portals
          </p>
        </div>

        {/* Security Shield Indicator */}
        <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 flex items-center justify-between text-xs text-purple-950">
          <div className="flex items-center gap-2 font-bold">
            <i className="fa-solid fa-shield-halved text-purple-700 text-sm"></i>
            <span>सुरक्षित स्टाफ लॉगिन (Role-Based Access Protected)</span>
          </div>
          <span className="text-[10px] text-purple-700 font-semibold bg-purple-100 px-2 py-0.5 rounded-full">
            Admin Dashboard Protected
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold flex items-center gap-2 animate-shake">
              <i className="fa-solid fa-circle-exclamation text-sm flex-shrink-0"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              यूजर आईडी (Username / User ID)
            </label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="उदा. admin या ramesh_billing"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">पासवर्ड (Password)</label>
              <span className="text-[10px] text-slate-400">डिफ़ॉल्ट: cadbury123</span>
            </div>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="पासवर्ड डालें"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-cadbury-950 hover:bg-cadbury-900 text-white font-black text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoggingIn ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-right-to-bracket text-gold-400"></i>
            )}
            <span>{isLoggingIn ? 'प्रमाणीकरण हो रहा है...' : 'सुरक्षित लॉगिन (Secure Login to DMS)'}</span>
          </button>
        </form>

        {/* Quick Staff Profiles Helper */}
        <div className="border-t border-slate-200/80 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowQuickProfiles(!showQuickProfiles)}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <i className={`fa-solid ${showQuickProfiles ? 'fa-chevron-down' : 'fa-chevron-right'} text-[10px]`}></i>
              <span>स्टाफ प्रोफाइल्स (Quick Fill for Staff Accounts)</span>
            </button>
            <span className="text-[10px] text-cadbury-700 font-semibold">क्लिक करके यूजरनेम भरें</span>
          </div>

          {showQuickProfiles && (
            <div className="space-y-2.5 animate-fadeIn">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto pr-1">
                {filteredUsers.map(user => {
                  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleQuickSelect(user)}
                      className="p-2 rounded-xl border border-slate-200 hover:border-cadbury-400 bg-slate-50/70 hover:bg-cadbury-50/40 transition-all text-left flex items-center justify-between group"
                    >
                      <div className="truncate">
                        <div className="font-bold text-slate-800 group-hover:text-cadbury-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                          <span>@{user.username}</span>
                          <span>•</span>
                          <span className={`font-bold ${isAdmin ? 'text-purple-700' : 'text-cadbury-700'}`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <i className="fa-solid fa-arrow-turn-down text-slate-300 group-hover:text-cadbury-700 group-hover:translate-x-0.5 transition-all text-xs"></i>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
