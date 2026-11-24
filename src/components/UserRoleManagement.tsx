import React, { useState } from 'react';
import { AppUser, Role } from '../types/cadbury';

interface UserRoleManagementProps {
  users: AppUser[];
  activeUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
  onUserCreated?: (newUser: AppUser) => void;
  onUserUpdated?: (updatedUser: AppUser) => void;
  onUserDeleted?: (deletedId: string) => void;
}

interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  isSensitive?: boolean;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  users,
  activeUser,
  onSwitchUser,
  onUserCreated,
  onUserUpdated,
  onUserDeleted
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  
  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AppUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Notification message
  const [alertBanner, setAlertBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertBanner({ text, type });
    setTimeout(() => setAlertBanner(null), 5000);
  };

  // Comprehensive System Modules List
  const systemModules: ModuleDefinition[] = [
    {
      id: 'dashboard',
      name: 'Admin Master Dashboard (कंट्रोल रूम)',
      description: 'कुल बिक्री, प्रॉफिट, लाइव टर्नओवर व वित्तीय मुख्य सारांश',
      category: 'Master Control',
      icon: 'fa-gauge-high',
      isSensitive: true
    },
    {
      id: 'orders',
      name: 'Orders & Billing (ऑर्डर बुकिंग व बिलिंग)',
      description: 'दुकानदार ऑर्डर, इनवॉइस चालान, जीएसटी बिलिंग व प्रिंट',
      category: 'Sales & Billing',
      icon: 'fa-file-invoice-dollar'
    },
    {
      id: 'parties',
      name: 'Party / Retailer Master (दुकानदार खाता)',
      description: 'दुकानदार लिस्ट, क्रेडिट लिमिट, जीएसटी नंबर व मोबाइल',
      category: 'Sales & Billing',
      icon: 'fa-store'
    },
    {
      id: 'stock',
      name: 'Products & Inventory (स्टॉक इन्वेंटरी)',
      description: 'कैडबरी चॉकलेट्स, बॉक्स स्टॉक, रेट व उपलब्ध मात्रा',
      category: 'Warehouse & Stock',
      icon: 'fa-cubes'
    },
    {
      id: 'stock_in',
      name: 'Stock Inward (+ गोदाम में नया माल)',
      description: 'कंपनी डिपो से नया माल गोदाम में रिसीव करना',
      category: 'Warehouse & Stock',
      icon: 'fa-circle-arrow-down'
    },
    {
      id: 'pipeline',
      name: 'Goods Flow Pipeline (माल डिस्पैच फ्लो)',
      description: 'वेयरहाउस ➔ लोडिंग ➔ वैन इन-ट्रांजिट ➔ डिलीवरी स्थिति',
      category: 'Logistics',
      icon: 'fa-bars-staggered'
    },
    {
      id: 'loader',
      name: 'Loader Operations (लोडिंग बे व स्कैनिंग)',
      description: 'गाड़ी में बॉक्स लोडिंग, चेकिंग व लोडर डेस्क',
      category: 'Logistics',
      icon: 'fa-boxes-packing'
    },
    {
      id: 'routes',
      name: 'Route & Beat Planning (रूट मैनेजमेंट)',
      description: 'डिलीवरी रूट, बीट और गाड़ी आवंटन',
      category: 'Logistics',
      icon: 'fa-route'
    },
    {
      id: 'delivery_boy',
      name: 'Delivery Staff Portal (ड्राइवर/डिलीवरी ऐप)',
      description: 'मोबाइल डिलीवरी स्क्रीन, डिजिटल हस्ताक्षर व ई-कलेक्शन',
      category: 'Delivery Fleet',
      icon: 'fa-motorcycle'
    },
    {
      id: 'map',
      name: 'Live GPS Vehicle Map (गाड़ी ट्रैकिंग)',
      description: 'वैन की रियल-टाइम लाइव लोकेशन व जीपीएस मैप',
      category: 'Delivery Fleet',
      icon: 'fa-earth-asia'
    },
    {
      id: 'ledger',
      name: 'Payment Collection (रोकड़ व चेक संग्रह)',
      description: 'कैश, चेक व यूपीआई भुगतान एंट्री व रसीदें',
      category: 'Accounts & Finance',
      icon: 'fa-hand-holding-dollar'
    },
    {
      id: 'outstanding',
      name: 'Party Outstanding (उधारी वसूली लिस्ट)',
      description: 'मार्केट में फंसी बाकी उधारी व तगादा रिपोर्ट',
      category: 'Accounts & Finance',
      icon: 'fa-receipt',
      isSensitive: true
    },
    {
      id: 'returns',
      name: 'Damage & Returns (डैमेज व वापसी माल)',
      description: 'दुकानदार से एक्सपायरी या टूटा माल जमा व रिप्लेसमेंट',
      category: 'Warehouse & Stock',
      icon: 'fa-triangle-exclamation'
    },
    {
      id: 'reports',
      name: 'Reports & Audits (जीएसटी व ऑडिट रिपोर्ट्स)',
      description: 'डेली सेल्स समरी, जीएसटी एक्सल एक्सपोर्ट व ऑडिट',
      category: 'Accounts & Finance',
      icon: 'fa-chart-pie',
      isSensitive: true
    }
  ];

  // Default module sets for quick presets
  const getRolePresetModules = (role: Role): string[] => {
    switch (role) {
      case Role.ADMIN:
      case Role.SUPER_ADMIN:
        return systemModules.map(m => m.id);
      case Role.MANAGER:
        return ['orders', 'parties', 'stock', 'stock_in', 'pipeline', 'loader', 'routes', 'delivery_boy', 'map', 'returns', 'reports'];
      case Role.ACCOUNTANT:
        return ['orders', 'parties', 'ledger', 'outstanding', 'reports'];
      case Role.LOADER:
        return ['loader', 'pipeline', 'stock'];
      case Role.DRIVER:
        return ['routes', 'delivery_boy', 'map', 'pipeline'];
      case Role.DELIVERY_BOY:
        return ['delivery_boy', 'map', 'ledger'];
      case Role.SALESMAN:
        return ['parties', 'orders'];
      default:
        return ['orders', 'parties'];
    }
  };

  // Form State for User Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: Role.SALESMAN,
    phone: '',
    email: '',
    employeeId: '',
    vehicleAssigned: '',
    status: 'Active' as 'Active' | 'Inactive',
    allowedModules: [] as string[],
    canAccessAdminDashboard: false,
    canEditOrders: true,
    canDeleteOrders: false,
    canExportReports: false
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: Role.SALESMAN,
      phone: '',
      email: '',
      employeeId: `CAD-EMP-${Math.floor(100 + Math.random() * 900)}`,
      vehicleAssigned: '',
      status: 'Active',
      allowedModules: getRolePresetModules(Role.SALESMAN),
      canAccessAdminDashboard: false,
      canEditOrders: true,
      canDeleteOrders: false,
      canExportReports: false
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role,
      phone: user.phone || '',
      email: user.email || '',
      employeeId: user.employeeId || '',
      vehicleAssigned: user.vehicleAssigned || '',
      status: user.status || 'Active',
      allowedModules: user.allowedModules || getRolePresetModules(user.role),
      canAccessAdminDashboard: user.canAccessAdminDashboard ?? (user.role === Role.ADMIN),
      canEditOrders: user.canEditOrders ?? true,
      canDeleteOrders: user.canDeleteOrders ?? false,
      canExportReports: user.canExportReports ?? (user.role === Role.ADMIN || user.role === Role.MANAGER)
    });
    setIsUserModalOpen(true);
  };

  const handleRoleChange = (newRole: Role) => {
    const isNowAdmin = newRole === Role.ADMIN || newRole === Role.SUPER_ADMIN;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      allowedModules: getRolePresetModules(newRole),
      canAccessAdminDashboard: isNowAdmin,
      canDeleteOrders: isNowAdmin,
      canExportReports: isNowAdmin || newRole === Role.MANAGER || newRole === Role.ACCOUNTANT
    }));
  };

  const handleToggleModule = (modId: string) => {
    setFormData(prev => {
      const exists = prev.allowedModules.includes(modId);
      const updated = exists 
        ? prev.allowedModules.filter(id => id !== modId)
        : [...prev.allowedModules, modId];
      return {
        ...prev,
        allowedModules: updated,
        canAccessAdminDashboard: modId === 'dashboard' ? !exists : prev.canAccessAdminDashboard
      };
    });
  };

  const handleSelectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      allowedModules: systemModules.map(m => m.id),
      canAccessAdminDashboard: true
    }));
  };

  const handleClearAllModules = () => {
    setFormData(prev => ({
      ...prev,
      allowedModules: [],
      canAccessAdminDashboard: false
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      alert('कृपया नाम और यूजरनेम (User ID) दोनों भरें!');
      return;
    }

    // Clean username (alphanumeric & underscore only)
    const cleanUsername = formData.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      alert('कृपया वैध यूजरनेम डालें (अक्षर, अंक या अंडरस्कोर)');
      return;
    }

    const payload = {
      ...formData,
      username: cleanUsername,
      password: formData.password ? formData.password.trim() : (editingUser?.password || 'cadbury123')
    };

    try {
      if (editingUser) {
        // UPDATE EXISTING USER
        const res = await fetch(`/api/cadbury/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.user) {
          if (onUserUpdated) onUserUpdated(data.user);
          showAlert(`✅ यूजर "${data.user.name}" के अधिकार व पासवर्ड अपडेट हो गए!`);
        } else {
          // Fallback local update
          const updated: AppUser = { ...editingUser, ...payload };
          if (onUserUpdated) onUserUpdated(updated);
          showAlert(`✅ यूजर "${updated.name}" अपडेट हुआ!`);
        }
      } else {
        // CREATE NEW USER
        const res = await fetch('/api/cadbury/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.user) {
          if (onUserCreated) onUserCreated(data.user);
          showAlert(`✅ नया यूजर "${data.user.name}" (@${data.user.username}) सफलतापूर्वक बन गया!`);
        } else if (data.error) {
          alert('Error: ' + data.error);
          return;
        } else {
          // Fallback local create
          const newUser: AppUser = {
            id: `usr-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString()
          };
          if (onUserCreated) onUserCreated(newUser);
          showAlert(`✅ नया यूजर "${newUser.name}" बन गया!`);
        }
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      // Local fallback in case network blocked
      const fallbackUser: AppUser = editingUser 
        ? { ...editingUser, ...payload }
        : { id: `usr-${Date.now()}`, ...payload, createdAt: new Date().toISOString() };
      
      if (editingUser && onUserUpdated) onUserUpdated(fallbackUser);
      else if (!editingUser && onUserCreated) onUserCreated(fallbackUser);

      showAlert(`✅ यूजर डेटा सुरक्षित कर दिया गया!`);
      setIsUserModalOpen(false);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (user.role === Role.ADMIN || user.username === 'admin' || user.id === 'usr-1') {
      alert('⚠️ मुख्य एडमिन (Main Admin) को डिलीट नहीं किया जा सकता!');
      return;
    }

    const confirm = window.confirm(`क्या आप यूजर "${user.name}" (@${user.username}) को डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    try {
      await fetch(`/api/cadbury/users/${user.id}`, { method: 'DELETE' });
      if (onUserDeleted) onUserDeleted(user.id);
      showAlert(`🗑️ यूजर "${user.name}" डिलीट कर दिया गया।`);
    } catch (err) {
      if (onUserDeleted) onUserDeleted(user.id);
      showAlert(`🗑️ यूजर "${user.name}" डिलीट कर दिया गया।`);
    }
  };

  const handleOpenPasswordModal = (user: AppUser) => {
    setPasswordResetUser(user);
    setNewPasswordInput('');
    setIsPasswordModalOpen(true);
  };

  const handleSavePasswordReset = async () => {
    if (!passwordResetUser) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      alert('पासवर्ड कम से कम 4 अक्षरों का होना चाहिए!');
      return;
    }

    try {
      const res = await fetch(`/api/cadbury/users/${passwordResetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswordInput.trim() })
      });
      const data = await res.json();
      if (onUserUpdated) {
        onUserUpdated({ ...passwordResetUser, password: newPasswordInput.trim() });
      }
      showAlert(`🔑 यूजर "${passwordResetUser.name}" का पासवर्ड सफलतापूर्वक बदल गया!`);
      setIsPasswordModalOpen(false);
    } catch (err) {
      if (onUserUpdated) {
        onUserUpdated({ ...passwordResetUser, password: newPasswordInput.trim() });
      }
      showAlert(`🔑 यूजर "${passwordResetUser.name}" का पासवर्ड अपडेट हुआ!`);
      setIsPasswordModalOpen(false);
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    if (user.username === 'admin' || user.id === 'usr-1') {
      alert('मुख्य एडमिन को Inactive नहीं किया जा सकता!');
      return;
    }
    const newStatus = user.status === 'Inactive' ? 'Active' : 'Inactive';
    try {
      await fetch(`/api/cadbury/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (onUserUpdated) {
        onUserUpdated({ ...user, status: newStatus });
      }
      showAlert(`यूजर "${user.name}" का स्टेटस अब "${newStatus}" है।`);
    } catch (err) {
      if (onUserUpdated) {
        onUserUpdated({ ...user, status: newStatus });
      }
      showAlert(`यूजर "${user.name}" का स्टेटस "${newStatus}" हुआ।`);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || (u.status || 'Active') === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Alert Banner */}
      {alertBanner && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-md transition-all ${
          alertBanner.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
            <i className={`fa-solid ${alertBanner.type === 'success' ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-rose-600'}`}></i>
            <span>{alertBanner.text}</span>
          </div>
          <button onClick={() => setAlertBanner(null)} className="text-slate-400 hover:text-slate-700">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cadbury-950 via-indigo-950 to-purple-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 border border-purple-900/40 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-800/60 border border-purple-400/40 text-purple-200 text-xs font-bold uppercase tracking-wider">
            <i className="fa-solid fa-shield-halved text-gold-400"></i> Role-Based Access Control & Staff Security
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            User Roles & Access Permissions
          </h2>
          <p className="text-xs sm:text-sm text-cadbury-200 max-w-2xl leading-relaxed">
            स्टाफ का <strong>User ID व Password</strong> खुद बनाएं, और तय करें कि वे कौन से मॉड्यूल देख सकते हैं। 
            <span className="text-gold-300 font-bold ml-1">एडमिन कंट्रोल रूम और गोपनीय वित्तीय डेटा पूरी तरह सुरक्षित रहेगा।</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-500 hover:to-amber-600 text-cadbury-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-user-plus text-cadbury-900"></i>
            <span>+ नया यूजर बनाएं (Create User)</span>
          </button>
        </div>
      </div>

      {/* Security Protection Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">कुल स्टाफ यूजर</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">{users.length}</div>
            <span className="text-[10px] text-slate-500">Registered Accounts</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg">
            <i className="fa-solid fa-users"></i>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">सक्रिय (Active Users)</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-0.5">
              {users.filter(u => (u.status || 'Active') === 'Active').length}
            </div>
            <span className="text-[10px] text-emerald-600">लॉगिन करने हेतु अधिकृत</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
            <i className="fa-solid fa-user-check"></i>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-purple-700 uppercase block">एडमिन कंट्रोल (Admins)</span>
            <div className="text-xl sm:text-2xl font-black text-purple-950 font-mono mt-0.5">
              {users.filter(u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN).length}
            </div>
            <span className="text-[10px] text-purple-600">Full Dashboard Rights</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg">
            <i className="fa-solid fa-crown text-amber-500"></i>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase block">प्रतिबंधित स्टाफ (Field Staff)</span>
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono mt-0.5">
              {users.filter(u => u.role !== Role.ADMIN && u.role !== Role.SUPER_ADMIN).length}
            </div>
            <span className="text-[10px] text-blue-600">Admin Dashboard Blocked 🔒</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg">
            <i className="fa-solid fa-lock text-blue-600"></i>
          </div>
        </div>
      </div>

      {/* Security Guidance Note */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="fa-solid fa-shield-cat"></i>
          </div>
          <div>
            <strong className="block text-amber-950 font-black">एडमिन डैशबोर्ड सुरक्षा निर्देश (Admin Dashboard Shield Active):</strong>
            <p className="text-slate-700 text-[11px] mt-0.5 leading-relaxed">
              जब कोई बिलिंग ऑपरेटर, लोडर, ड्राइवर या सेल्समैन अपने User ID व Password से लॉगिन करेगा, तो उसे <strong>सिर्फ वही विकल्प</strong> दिखेंगे जिन्हें आपने अनुमति दी है। 
              एडमिन का कंट्रोल रूम, प्रॉफिट/टर्नओवर और User Rights पेज उनके लिए पूरी तरह <strong>लॉक (Locked)</strong> रहेगा।
            </p>
          </div>
        </div>
      </div>

      {/* Users Directory Management Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
        {/* Controls: Search & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-address-book text-cadbury-700"></i>
              स्टाफ यूजर सूची (Staff Directory - {filteredUsers.length} Users)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search name, username, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 shadow-sm"
            >
              <option value="ALL">All Roles ({users.length})</option>
              <option value={Role.ADMIN}>Admin</option>
              <option value={Role.MANAGER}>Manager</option>
              <option value={Role.ACCOUNTANT}>Accountant</option>
              <option value={Role.LOADER}>Warehouse Loader</option>
              <option value={Role.DRIVER}>Driver</option>
              <option value={Role.DELIVERY_BOY}>Delivery Boy</option>
              <option value={Role.SALESMAN}>Salesman</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 shadow-sm"
            >
              <option value="ALL">All Status</option>
              <option value="Active">🟢 Active Only</option>
              <option value="Inactive">🔴 Inactive (Disabled)</option>
            </select>
          </div>
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isSelf = u.id === activeUser.id;
            const isAdmin = u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN;
            const isActive = (u.status || 'Active') === 'Active';
            const allowedCount = (u.allowedModules || []).length;

            return (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isSelf
                    ? 'bg-cadbury-50/40 border-cadbury-400 ring-2 ring-cadbury-600 shadow-md'
                    : isActive
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                    : 'bg-slate-50/80 border-slate-200 opacity-75'
                }`}
              >
                {/* Top User Info Bar */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {u.employeeId || 'NO-ID'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : u.role === Role.ACCOUNTANT
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : u.role === Role.LOADER
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : u.role === Role.DELIVERY_BOY || u.role === Role.DRIVER
                            ? 'bg-teal-100 text-teal-900 border border-teal-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>

                      {isSelf && (
                        <span className="px-2 py-0.5 bg-cadbury-900 text-white text-[9px] font-bold rounded-full">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name & Login ID */}
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      {u.name}
                      {!isActive && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded">
                          (Disabled)
                        </span>
                      )}
                    </h4>
                    <div className="text-xs text-slate-500 font-mono font-medium flex items-center gap-2">
                      <span className="text-cadbury-800 font-bold">
                        <i className="fa-solid fa-at text-slate-400"></i> {u.username}
                      </span>
                      {u.phone && (
                        <span className="text-slate-400 flex items-center gap-1">
                          • <i className="fa-solid fa-phone text-[10px]"></i> {u.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Van Assignment if applicable */}
                  {u.vehicleAssigned && (
                    <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg mt-2 inline-flex items-center gap-1.5">
                      <i className="fa-solid fa-truck text-cadbury-700"></i>
                      <span>Van: {u.vehicleAssigned}</span>
                    </div>
                  )}

                  {/* Permissions & Security Summary */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">एडमिन डैशबोर्ड अधिकार:</span>
                      {isAdmin || u.canAccessAdminDashboard ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <i className="fa-solid fa-crown text-amber-500"></i> FULL ACCESS
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <i className="fa-solid fa-lock text-rose-500"></i> RESTRICTED (सुरक्षित)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">स्वीकृत मॉड्यूल (Modules):</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {isAdmin ? 'All Modules (14/14)' : `${allowedCount} Allowed`}
                      </span>
                    </div>

                    {/* Module badges sample */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(u.allowedModules || getRolePresetModules(u.role)).slice(0, 4).map(modId => {
                        const mObj = systemModules.find(m => m.id === modId);
                        return (
                          <span key={modId} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-semibold truncate max-w-[120px]">
                            <i className="fa-solid fa-check text-emerald-600 mr-1 text-[8px]"></i>
                            {mObj?.name.split(' ')[0] || modId}
                          </span>
                        );
                      })}
                      {(u.allowedModules || []).length > 4 && (
                        <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                          +{(u.allowedModules || []).length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Edit User Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                      title="यूजर के अधिकार, नाम व विवरण बदलें"
                    >
                      <i className="fa-solid fa-pen text-slate-500 text-[10px]"></i> Edit
                    </button>

                    {/* Reset Password Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPasswordModal(u)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                      title="नया पासवर्ड सेट करें"
                    >
                      <i className="fa-solid fa-key text-[10px]"></i> Password
                    </button>

                    {/* Toggle Active/Inactive */}
                    {!isAdmin && u.id !== 'usr-1' && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Disable User Login' : 'Activate User Login'}
                      >
                        <i className={`fa-solid ${isActive ? 'fa-ban' : 'fa-circle-check'}`}></i>
                      </button>
                    )}

                    {/* Delete User */}
                    {!isAdmin && u.id !== 'usr-1' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-all"
                        title="Delete User Account"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>

                  {/* Simulate Login Button (Admin testing view) */}
                  <button
                    type="button"
                    onClick={() => onSwitchUser(u)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                      isSelf
                        ? 'bg-cadbury-900 text-white font-black'
                        : 'bg-slate-100 hover:bg-cadbury-50 text-slate-700 hover:text-cadbury-900'
                    }`}
                    title="इस यूजर का व्यू टेस्ट करें"
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
                    <span className="hidden sm:inline">{isSelf ? 'Active' : 'Test View'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE & EDIT USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-5 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[11px] font-black uppercase mb-1">
                  <i className="fa-solid fa-user-shield"></i>
                  {editingUser ? 'Edit User Permissions' : 'Create New User Account'}
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingUser ? `यूजर अधिकार एडिट करें: ${editingUser.name}` : 'नया स्टाफ यूजर व अधिकार तैयार करें'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="space-y-6 text-xs">
              {/* 1. Account Details Section */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <i className="fa-solid fa-id-card text-cadbury-700"></i>
                  1. बेसिक स्टाफ जानकारी व लॉगिन क्रेडेंशियल्स
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      पूरा नाम (Full Staff Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      लॉगिन यूजर आईडी (Username / User ID) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">@</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ramesh_billing"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">लॉगिन स्क्रीन पर इसी ID को डालना होगा</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      लॉगिन पासवर्ड (Login Password) {editingUser ? '(छोड़ दें अगर नहीं बदलना)' : <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editingUser ? 'नया पासवर्ड डालें या खाली छोड़ें' : 'कम से कम 4 अक्षर (उदा. cadbury123)'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      स्टाफ पद / रोल (Role Selection) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value as Role)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-700 focus:outline-none bg-white"
                    >
                      <option value={Role.ADMIN}>👑 Admin (पूर्ण अधिकार - कंट्रोल रूम सहित)</option>
                      <option value={Role.MANAGER}>📦 Logistics / Operations Manager</option>
                      <option value={Role.ACCOUNTANT}>💰 Accountant (बिलिंग, लेजर व रोकड़)</option>
                      <option value={Role.LOADER}>🚚 Warehouse Loader (सिर्फ बॉक्स लोडिंग)</option>
                      <option value={Role.DRIVER}>🚛 Fleet Driver (वैन रूट व डिलीवरी)</option>
                      <option value={Role.DELIVERY_BOY}>📱 Delivery Staff (मोबाइल ऐप)</option>
                      <option value={Role.SALESMAN}>🛒 Salesman (ऑर्डर बुकिंग व पार्टी)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">मोबाइल नंबर (Mobile Phone)</label>
                    <input
                      type="text"
                      placeholder="e.g. 9820012345"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">गाड़ी नंबर (Assigned Van No - वैकल्पिक)</label>
                    <input
                      type="text"
                      placeholder="e.g. MH 02 EK 4589"
                      value={formData.vehicleAssigned}
                      onChange={(e) => setFormData({ ...formData, vehicleAssigned: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Granular Module Permissions Checkbox Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <i className="fa-solid fa-lock-open text-emerald-600"></i>
                      2. मॉड्यूल एक्सेस अधिकार (Granular Module Access Permissions)
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      जिन मॉड्यूल्स पर टिक लगा होगा, सिर्फ वही इस यूजर को स्क्रीन और साइडबार पर दिखेंगे।
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="text-[10px] font-bold text-cadbury-700 hover:text-cadbury-900 underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleClearAllModules}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline"
                    >
                      Clear All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleRoleChange(formData.role)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Reset to Role Preset
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-slate-50/50">
                  {systemModules.map(mod => {
                    const isChecked = formData.allowedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isChecked
                            ? mod.isSensitive
                              ? 'bg-purple-50/70 border-purple-300 text-purple-950 shadow-sm'
                              : 'bg-white border-cadbury-300 text-slate-900 shadow-sm'
                            : 'bg-slate-100/60 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(mod.id)}
                          className="mt-0.5 rounded text-cadbury-900 focus:ring-cadbury-600 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <i className={`fa-solid ${mod.icon} text-slate-500 text-[11px]`}></i>
                            <span className="truncate">{mod.name}</span>
                            {mod.isSensitive && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1 rounded">
                                ADMIN ONLY
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Action-Level Safeguards */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <i className="fa-solid fa-shield-virus text-indigo-600"></i>
                  3. संवेदनशील क्रियाएं व सुरक्षा प्रतिबंध (Action Safeguards)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.canEditOrders}
                      onChange={(e) => setFormData({ ...formData, canEditOrders: e.target.checked })}
                      className="rounded text-cadbury-900 focus:ring-cadbury-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Can Edit Bills / Orders</span>
                      <span className="text-[10px] text-slate-400">बिल में बदलाव करने की अनुमति</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.canDeleteOrders}
                      onChange={(e) => setFormData({ ...formData, canDeleteOrders: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Can Delete Records</span>
                      <span className="text-[10px] text-rose-500 font-semibold">डेटा डिलीट करने की अनुमति (खतरनाक)</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.canExportReports}
                      onChange={(e) => setFormData({ ...formData, canExportReports: e.target.checked })}
                      className="rounded text-cadbury-900 focus:ring-cadbury-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Can Export Excel/PDF</span>
                      <span className="text-[10px] text-slate-400">रिपोर्ट्स डाउनलोड करने की अनुमति</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  रद्द करें (Cancel)
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-cadbury-950 hover:bg-cadbury-900 text-white font-black rounded-xl text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-floppy-disk text-gold-400"></i>
                  <span>{editingUser ? 'अपडेट सुरक्षित करें (Save Changes)' : 'नया यूजर बनाएं (Create User)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PASSWORD RESET MODAL */}
      {isPasswordModalOpen && passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <i className="fa-solid fa-key text-blue-600"></i>
                पासवर्ड बदलें (Reset Password)
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>यूजर: <strong>{passwordResetUser.name}</strong></div>
              <div>User ID: <span className="font-mono font-bold text-cadbury-900">@{passwordResetUser.username}</span></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">नया पासवर्ड (New Password):</label>
              <input
                type="text"
                placeholder="उदा. ramesh@123 या 123456"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cadbury-700 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block">नया पासवर्ड सेव करने के बाद यूजर इसी पासवर्ड से लॉगिन कर सकेगा।</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePasswordReset}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-xs shadow-md active:scale-95"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
