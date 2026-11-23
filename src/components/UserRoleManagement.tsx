import React from 'react';
import { AppUser, Role } from '../types/cadbury';

interface UserRoleManagementProps {
  users: AppUser[];
  activeUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  users,
  activeUser,
  onSwitchUser
}) => {
  const rolePermissionsMatrix = [
    {
      role: Role.ADMIN,
      badge: 'bg-purple-100 text-purple-900 border-purple-300',
      description: 'Master Control & Distributor Owner',
      access: ['Distributor Dashboard', 'Goods Tracking', 'Live GPS Map', 'Party Management', 'Orders & Billing', 'Loader Operations', 'Delivery Boy App', 'Hisab-Kitab Ledger', 'User Roles']
    },
    {
      role: Role.MANAGER,
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
      description: 'Logistics, Dispatch & Route Manager',
      access: ['Distributor Dashboard', 'Goods Tracking', 'Live GPS Map', 'Party Management', 'Orders & Billing', 'Loader Operations']
    },
    {
      role: Role.ACCOUNTANT,
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      description: 'Finance, Billing & Party Ledgers',
      access: ['Orders & Billing', 'Hisab-Kitab Ledger', 'Party Management', 'Distributor Dashboard']
    },
    {
      role: Role.LOADER,
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      description: 'Warehouse Carton Loading & Verification',
      access: ['Loader Operations', 'Goods Tracking (Loading Bay)']
    },
    {
      role: Role.DELIVERY_BOY,
      badge: 'bg-teal-100 text-teal-900 border-teal-300',
      description: 'Mobile Delivery, Signature & Collection',
      access: ['Delivery Boy Mobile Portal', 'Live Route & Google Maps']
    },
    {
      role: Role.SALESMAN,
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      description: 'Market Field Visits & Retailer Booking',
      access: ['Party Management', 'Orders & Billing (New Booking)']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cadbury-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-shield-halved text-gold-400"></i> Role Based Access Control (RBAC)
          </div>
          <h2 className="text-2xl font-black">User Roles & Access Permissions</h2>
          <p className="text-xs text-cadbury-200 mt-1">
            Configure access rights for Admin, Logistics Manager, Accountant, Warehouse Loaders, Delivery Boys, and Field Salesmen.
          </p>
        </div>

        <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 text-center">
          <span className="text-xs text-cadbury-200 block">Current Logged In User:</span>
          <span className="text-sm font-extrabold text-gold-400">{activeUser.name}</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full ml-1.5 font-bold">
            {activeUser.role}
          </span>
        </div>
      </div>

      {/* Role Rights Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-800">System Role & Rights Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">Role</th>
                <th className="p-3">Description</th>
                <th className="p-3">Accessible Modules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rolePermissionsMatrix.map((matrix) => (
                <tr key={matrix.role} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${matrix.badge}`}>
                      {matrix.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{matrix.description}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {matrix.access.map((mod) => (
                        <span key={mod} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <i className="fa-solid fa-check text-emerald-600 mr-1"></i> {mod}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Accounts Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Active Staff Accounts ({users.length})</h3>
          <span className="text-xs text-slate-500">Click "Simulate Login" to test specific role views</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {users.map((u) => {
            const isCurrentlyActive = u.id === activeUser.id;

            return (
              <div
                key={u.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrentlyActive
                    ? 'bg-cadbury-50/50 border-cadbury-300 ring-2 ring-cadbury-600'
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{u.employeeId}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === Role.ADMIN
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === Role.LOADER
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === Role.DELIVERY_BOY
                          ? 'bg-teal-100 text-teal-800'
                          : u.role === Role.ACCOUNTANT
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm">{u.name}</h4>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <i className="fa-solid fa-phone text-slate-400"></i> {u.phone}
                  </div>
                  {u.vehicleAssigned && (
                    <div className="text-[11px] font-bold text-cadbury-900 mt-1">
                      <i className="fa-solid fa-truck mr-1"></i> Van: {u.vehicleAssigned}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/60 mt-3">
                  <button
                    onClick={() => onSwitchUser(u)}
                    className={`w-full py-1.5 text-xs font-bold rounded-lg transition-all ${
                      isCurrentlyActive
                        ? 'bg-cadbury-900 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    {isCurrentlyActive ? 'Current Role Active' : 'Simulate Login'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
