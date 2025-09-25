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
        className="w-10 h-10 p-0 bg-white hover:bg-white border rounded-full shadow-sm"
        style={{ borderColor: '#C7D8D0' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, #B8E060 0%, #3CB371 100%)'
          }}
        >
          <User className="w-4 h-4 text-white" />
        </div>
      </Button>

             {/* Dropdown Menu */}
       {isOpen && (
         <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-[9999]" style={{ borderColor: '#C7D8D0' }}>
          {/* User Info Section */}
          <div className="px-4 py-3 border-b" style={{ borderBottomColor: '#E5EADF' }}>
            <div className="font-semibold text-base" style={{ color: '#164F5B' }}>
              {displayName}
            </div>
            <div className="text-sm" style={{ color: '#527779' }}>
              {userEmail}
            </div>
          </div>

                     {/* Menu Options */}
           <div className="py-2">
             <button
               onClick={handleEditProfile}
               className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors duration-150"
               style={{ color: '#164F5B' }}
               onMouseEnter={(e) => e.target.style.backgroundColor = '#E5EADF'}
               onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
             >
               <User className="w-4 h-4" style={{ color: '#527779' }} />
               <span>{t('nav.profile', 'My Profile')}</span>
             </button>

            <button
              onClick={handleViewHistory}
              className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors duration-150"
              style={{ color: '#164F5B' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E5EADF'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <BarChart3 className="w-4 h-4" style={{ color: '#527779' }} />
              <span>{t('nav.viewHistory', 'View History')}</span>
            </button>

            <button
              onClick={handleActiveTasks}
              className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors duration-150"
              style={{ color: '#164F5B' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E5EADF'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <Monitor className="w-4 h-4" style={{ color: '#527779' }} />
              <span>{t('nav.activeTasks', 'Active Tasks')}</span>
            </button>

            {/* Logout Button */}
            <div className="border-t mt-2 pt-2" style={{ borderTopColor: '#E5EADF' }}>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors duration-150 disabled:opacity-50"
                style={{ color: '#dc2626' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <LogOut className="w-4 h-4" style={{ color: '#dc2626' }} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
