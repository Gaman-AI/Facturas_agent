'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, BarChart3, Monitor, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout, loading, user } = useAuth();
  const { profile, getDisplayName } = useUserProfile();
  const { t } = useLanguage();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEditProfile = () => {
    router.push('/profile');
    setIsOpen(false);
  };

  const handleViewHistory = () => {
    // TODO: Implement view history functionality
    console.log('View history clicked');
    setIsOpen(false);
  };

  const handleActiveTasks = () => {
    // TODO: Implement active tasks view
    console.log('Active tasks clicked');
    setIsOpen(false);
  };

  const displayName = profile ? getDisplayName() : user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <Button
        variant="ghost"
        className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm hover:bg-white/80 border border-slate-200/50 px-3 py-2 h-auto"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-theme-400 to-theme-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {displayName}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </Button>

             {/* Dropdown Menu */}
       {isOpen && (
         <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200/50 z-[9999]">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="font-semibold text-slate-900 text-base">
              {displayName}
            </div>
            <div className="text-sm text-slate-500">
              {userEmail}
            </div>
          </div>

                     {/* Menu Options */}
           <div className="py-2">
             <button
               onClick={handleEditProfile}
               className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3 transition-colors duration-150"
             >
               <User className="w-4 h-4 text-slate-500" />
               <span>My Profile</span>
             </button>

            <button
              onClick={handleViewHistory}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3 transition-colors duration-150"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>View History</span>
            </button>

            <button
              onClick={handleActiveTasks}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3 transition-colors duration-150"
            >
              <Monitor className="w-4 h-4 text-slate-500" />
              <span>Active Tasks</span>
            </button>

            {/* Logout Button */}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors duration-150 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
