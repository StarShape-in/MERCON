import { useState } from 'react';
import { User, Mail, Phone, Shield, Building2, MapPin, Camera, Save } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { authStore } from '@/store/authStore';

export default function OperatorProfilePage() {
  const user = authStore.getUser();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || 'Mohammed',
    lastName: user?.name?.split(' ')[1] || 'Al-Fayed',
    email: user?.email || 'admin@mercon.sa',
    phone: '+966 50 123 4567',
    role: user?.role || 'System Administrator',
    location: 'Riyadh HQ, Saudi Arabia',
    department: 'Logistics Operations',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Mock save
    setTimeout(() => {
      setIsEditing(false);
    }, 600);
  };

  return (
    <DashboardLayout 
      active="Settings" 
      title="My Profile" 
      breadcrumb="Settings"
      pageTitle="Operator Profile" 
      pageSub="Manage your personal information and account settings."
      actions={
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Btn label="Cancel" variant="ghost" onClick={() => setIsEditing(false)} />
              <Btn label="Save Changes" icon={<Save size={14} />} onClick={handleSave} />
            </>
          ) : (
            <Btn label="Edit Profile" onClick={() => setIsEditing(true)} />
          )}
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-black/[0.08] rounded-2xl p-6 shadow-sm text-center relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-[#E8450F]/20 to-transparent"></div>
            
            <div className="relative mt-8 mb-4">
              <div className="w-24 h-24 mx-auto bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center relative">
                <div className="w-full h-full rounded-full bg-[#F5F5F7] flex items-center justify-center text-4xl font-bold text-[#E8450F]">
                  {formData.firstName[0]}{formData.lastName[0]}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-[#E8450F] text-white p-1.5 rounded-full border-2 border-white hover:scale-105 transition-transform">
                    <Camera size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-[#111] mb-1">{formData.firstName} {formData.lastName}</h2>
            <p className="text-sm font-medium text-[#E8450F] mb-4">{formData.role}</p>
            
            <div className="flex justify-center gap-2 mb-6">
              <span className="bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Active Account
              </span>
            </div>

            <div className="border-t border-black/[0.04] pt-4 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-[#444]">
                <Mail size={14} className="text-[#9898A4]" />
                <span className="truncate">{formData.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#444]">
                <Phone size={14} className="text-[#9898A4]" />
                <span>{formData.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#444]">
                <MapPin size={14} className="text-[#9898A4]" />
                <span>{formData.location}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
              <Shield size={16} className="text-[#E8450F]" /> Security & Access
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-black/[0.04]">
                <span className="text-xs font-semibold text-[#6E6E80]">Last Login</span>
                <span className="text-xs font-medium text-[#111]">Today, 08:45 AM</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-black/[0.04]">
                <span className="text-xs font-semibold text-[#6E6E80]">Password Last Changed</span>
                <span className="text-xs font-medium text-[#111]">45 days ago</span>
              </div>
              <button className="text-xs font-bold text-[#E8450F] hover:underline">
                Update Password
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Form Details */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-black/[0.08] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#111] mb-6 flex items-center gap-2 pb-4 border-b border-black/[0.04]">
              <User size={18} className="text-[#E8450F]" /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <FormInput
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                disabled={!isEditing}
              />
              <FormInput
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                disabled={!isEditing}
              />
              <FormInput
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!isEditing}
              />
              <FormInput
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <h3 className="text-lg font-bold text-[#111] mb-6 flex items-center gap-2 pb-4 border-b border-black/[0.04] mt-8">
              <Building2 size={18} className="text-[#E8450F]" /> Professional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label="System Role"
                value={formData.role}
                disabled={true} // Usually roles are uneditable by the user themselves
              />
              <FormInput
                label="Department"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                disabled={!isEditing}
              />
              <div className="md:col-span-2">
                <FormInput
                  label="Office Location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
