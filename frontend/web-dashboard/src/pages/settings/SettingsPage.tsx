import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Shield, Building2, Bell, Key, Save } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { authService } from '@/services/authService';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'security'>('profile');

  // Fetch current user
  const { data: userRes } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
  });

  const user = userRes;

  return (
    <DashboardLayout 
      active="Account" 
      title="Settings" 
      pageTitle="Account Settings" 
      pageSub="Manage your profile, preferences, and system settings"
    >
      <div className="px-6 pb-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
        
        {/* Settings Top Nav */}
        <div className="w-full">
          <div className="bg-white border border-black/[0.08] rounded-lg shadow-sm flex flex-row divide-x divide-black/[0.08]">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex justify-center items-center gap-3 px-4 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-[#E8450F]/10 text-[#E8450F] border-b-2 border-[#E8450F]' 
                  : 'text-[#6E6E80] hover:bg-black/[0.02] hover:text-[#111] border-b-2 border-transparent'
              }`}
            >
              <User size={16} /> My Profile
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`flex-1 flex justify-center items-center gap-3 px-4 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'company' 
                  ? 'bg-[#E8450F]/10 text-[#E8450F] border-b-2 border-[#E8450F]' 
                  : 'text-[#6E6E80] hover:bg-black/[0.02] hover:text-[#111] border-b-2 border-transparent'
              }`}
            >
              <Building2 size={16} /> Company Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 flex justify-center items-center gap-3 px-4 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'security' 
                  ? 'bg-[#E8450F]/10 text-[#E8450F] border-b-2 border-[#E8450F]' 
                  : 'text-[#6E6E80] hover:bg-black/[0.02] hover:text-[#111] border-b-2 border-transparent'
              }`}
            >
              <Shield size={16} /> Security & Passwords
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <FormSection title="Profile Information" description="Update your personal details.">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#E8450F]/10 border border-[#E8450F]/20 flex items-center justify-center text-[#E8450F] text-2xl font-bold">
                    {user?.name?.[0] || 'O'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111] mb-1">Profile Photo</h3>
                    <p className="text-xs text-[#6E6E80] mb-3">JPG, GIF or PNG. Max size of 800K</p>
                    <Btn label="Upload New" variant="outline" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Full Name" name="name" value={user?.name || ''} readOnly />
                  <FormInput label="Email Address" name="email" value={user?.email || ''} readOnly />
                  <FormInput label="Phone Number" name="phone" value={user?.phone || ''} readOnly />
                  <FormInput label="Role" name="role" value={user?.role || ''} readOnly />
                </div>
              </FormSection>

              <div className="flex justify-end pt-4 border-t border-black/[0.06]">
                <Btn label="Save Profile Details" icon={<Save size={14} />} disabled />
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-6">
              <FormSection title="Company Settings" description="Update MERCON legal and billing details.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Company Name" name="c_name" value="MERCON Operations Ltd." readOnly />
                  <FormInput label="Registration Number" name="c_reg" value="CR-9381283" readOnly />
                  <FormInput label="Tax ID / VAT" name="c_tax" value="VAT-991203" readOnly />
                  <FormInput label="Primary Support Email" name="c_email" value="support@mercon.sa" readOnly />
                </div>
              </FormSection>

              <div className="flex justify-end pt-4 border-t border-black/[0.06]">
                <Btn label="Save Company Details" icon={<Save size={14} />} disabled />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <FormSection title="Change Password" description="Ensure your account is using a long, random password to stay secure.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Current Password" name="old_pwd" type="password" />
                  <FormInput label="New Password" name="new_pwd" type="password" />
                  <FormInput label="Confirm New Password" name="confirm_pwd" type="password" />
                </div>
              </FormSection>

              <div className="flex justify-end pt-4 border-t border-black/[0.06]">
                <Btn label="Update Password" icon={<Key size={14} />} disabled />
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
