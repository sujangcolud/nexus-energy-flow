import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth, UserRole } from "@/context/AuthContext";
import { ROLE_DESCRIPTIONS } from "@/utils/roleBasedAccess";
import { logSecurityEvent } from "@/utils/securityLogger";
import { ArrowRightFromLine, Settings as SettingsIcon, UserCog2 } from "lucide-react";

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
}

const Settings = () => {
  const { user, userRole, hasRole, signOut } = useAuth();
  const [profileValues, setProfileValues] = useState<ProfileFormValues>({
    firstName: user?.user_metadata?.firstName || '',
    lastName: user?.user_metadata?.lastName || '',
    email: user?.email || '',
  });
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('light');

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileValues(prev => ({ ...prev, [name]: value }));
  };

  const saveProfileChanges = async () => {
    try {
      // Placeholder for saving profile changes
      toast.info('Profile update functionality requires database setup');
      setIsProfileEditMode(false);
    } catch (error) {
      console.error('Error saving profile changes:', error);
      toast.error('Failed to save profile changes');
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Placeholder for changing password
      toast.info('Password change functionality requires database setup');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  const toggleTwoFactorAuth = async () => {
    try {
      // Placeholder for toggling two-factor auth
      toast.info('Two-factor authentication functionality requires setup');
      setIsTwoFactorEnabled(prev => !prev);
    } catch (error) {
      console.error('Error toggling two-factor auth:', error);
      toast.error('Failed to toggle two-factor authentication');
    }
  };

  const toggleNotifications = () => {
    setIsNotificationsEnabled(prev => !prev);
  };

  const changeTheme = (theme: string) => {
    setSelectedTheme(theme);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      // This functionality requires proper RPC function - showing placeholder
      toast.info('Role update functionality requires database setup');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  if (!hasRole('super_admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-500">Access denied. Super admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-5 w-5 text-gray-500" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <Button variant="outline" onClick={signOut}>
          Logout
          <ArrowRightFromLine className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.email}`} />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Welcome:</span>
                <span className="font-medium">{user?.email?.split('@')[0] || 'User'}</span>
              </div>
            
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Role:</span>
                <span className="font-medium">{user?.email?.split('@')[0] || 'User'}</span>
              </div>
            </div>
          </div>

          {isProfileEditMode ? (
            <div className="space-y-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileValues.firstName}
                  onChange={handleProfileInputChange}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileValues.lastName}
                  onChange={handleProfileInputChange}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={profileValues.email}
                  onChange={handleProfileInputChange}
                  disabled
                />
              </div>
              <Button onClick={saveProfileChanges}>Save Changes</Button>
              <Button variant="ghost" onClick={() => setIsProfileEditMode(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-500">
                <p>
                  <strong>First Name:</strong> {profileValues.firstName || 'Not set'}
                </p>
                <p>
                  <strong>Last Name:</strong> {profileValues.lastName || 'Not set'}
                </p>
                <p>
                  <strong>Email:</strong> {profileValues.email}
                </p>
              </div>
              <Button onClick={() => setIsProfileEditMode(true)}>Edit Profile</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={changePassword}>Change Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
            <Switch
              id="twoFactorAuth"
              checked={isTwoFactorEnabled}
              onCheckedChange={toggleTwoFactorAuth}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Enable Notifications</Label>
            <Switch
              id="notifications"
              checked={isNotificationsEnabled}
              onCheckedChange={toggleNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Theme</Label>
            <div className="flex space-x-4">
              <Button
                variant={selectedTheme === 'light' ? 'default' : 'outline'}
                onClick={() => changeTheme('light')}
              >
                Light
              </Button>
              <Button
                variant={selectedTheme === 'dark' ? 'default' : 'outline'}
                onClick={() => changeTheme('dark')}
              >
                Dark
              </Button>
              <Button
                variant={selectedTheme === 'system' ? 'default' : 'outline'}
                onClick={() => changeTheme('system')}
              >
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
