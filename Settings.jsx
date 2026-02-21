import React, { useState } from 'react';
import { useAuth  } from '../context/AuthContext';
import { BellIcon, GlobeAltIcon, ShieldCheckIcon, CreditCardIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Settings = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
      transactionAlerts: true,
      marketing: false,
    },
    security: {
      twoFactor: false,
      biometric: true,
      autoLogout: true,
      sessionTimeout: 30,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      currency: 'USD',
      timezone: 'UTC',
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analytics: true,
    },
  });

  const handleNotificationToggle = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handleSecurityToggle = (key) => {
    setSettings({
      ...settings,
      security: {
        ...settings.security,
        [key]: !settings.security[key],
      },
    });
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const settingSections = [
    {
      title: 'Account Settings',
      icon: UserCircleIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      settings: [
        { label: 'Email Address', value: user?.email, editable: true },
        { label: 'Phone Number', value: '+1 (555) 123-4567', editable: true },
        { label: 'Date of Birth', value: 'January 1, 1990', editable: true },
      ],
    },
    {
      title: 'Notifications',
      icon: BellIcon,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
      toggles: [
        { label: 'Email Notifications', key: 'email' },
        { label: 'Push Notifications', key: 'push' },
        { label: 'SMS Alerts', key: 'sms' },
        { label: 'Transaction Alerts', key: 'transactionAlerts' },
        { label: 'Marketing Emails', key: 'marketing' },
      ],
    },
    {
      title: 'Security',
      icon: ShieldCheckIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
      toggles: [
        { label: 'Two-Factor Authentication', key: 'twoFactor' },
        { label: 'Biometric Login', key: 'biometric' },
        { label: 'Auto Logout', key: 'autoLogout' },
      ],
      dropdowns: [
        {
          label: 'Session Timeout',
          key: 'sessionTimeout',
          options: [
            { value: 15, label: '15 minutes' },
            { value: 30, label: '30 minutes' },
            { value: 60, label: '1 hour' },
            { value: 120, label: '2 hours' },
          ],
        },
      ],
    },
    {
      title: 'Preferences',
      icon: GlobeAltIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      dropdowns: [
        {
          label: 'Theme',
          key: 'theme',
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ],
        },
        {
          label: 'Language',
          key: 'language',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
          ],
        },
        {
          label: 'Currency',
          key: 'currency',
          options: [
            { value: 'USD', label: 'USD ($)' },
            { value: 'EUR', label: 'EUR (€)' },
            { value: 'GBP', label: 'GBP (£)' },
            { value: 'JPY', label: 'JPY (¥)' },
          ],
        },
        {
          label: 'Timezone',
          key: 'timezone',
          options: [
            { value: 'UTC', label: 'UTC' },
            { value: 'EST', label: 'EST' },
            { value: 'PST', label: 'PST' },
            { value: 'CET', label: 'CET' },
          ],
        },
      ],
    },
    {
      title: 'Privacy',
      icon: ShieldCheckIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      toggles: [
        { label: 'Data Sharing', key: 'dataSharing' },
        { label: 'Analytics', key: 'analytics' },
      ],
      dropdowns: [
        {
          label: 'Profile Visibility',
          key: 'profileVisibility',
          options: [
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
            { value: 'friends', label: 'Friends Only' },
          ],
        },
      ],
    },
    {
      title: 'Billing & Payments',
      icon: CreditCardIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      settings: [
        { label: 'Payment Method', value: 'Visa **** 1234', editable: true },
        { label: 'Billing Address', value: '123 Main St, City, State 12345', editable: true },
        { label: 'Tax Information', value: 'Configured', editable: true },
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Customize your banking experience and manage your preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingSections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className={`p-3 rounded-lg ${section.bgColor}`}>
                <section.icon className={`w-6 h-6 ${section.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                <p className="text-sm text-gray-500">
                  Manage your {section.title.toLowerCase()} preferences
                </p>
              </div>
            </div>

            {/* Settings List */}
            <div className="space-y-4">
              {section.settings?.map((setting) => (
                <div key={setting.label} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{setting.label}</p>
                    <p className="text-sm text-gray-500">{setting.value}</p>
                  </div>
                  {setting.editable && (
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Edit
                    </button>
                  )}
                </div>
              ))}

              {section.toggles?.map((toggle) => (
                <div key={toggle.key} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{toggle.label}</p>
                    <p className="text-sm text-gray-500">
                      {settings[toggle.key.split('.')[0]]?.[toggle.key.split('.')[1] || toggle.key] ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (section.title === 'Notifications') {
                        handleNotificationToggle(toggle.key);
                      } else if (section.title === 'Security') {
                        handleSecurityToggle(toggle.key);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      (section.title === 'Notifications' 
                        ? settings.notifications[toggle.key]
                        : section.title === 'Security'
                        ? settings.security[toggle.key]
                        : false)
                        ? 'bg-primary-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        (section.title === 'Notifications'
                          ? settings.notifications[toggle.key]
                          : section.title === 'Security'
                          ? settings.security[toggle.key]
                          : false)
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}

              {section.dropdowns?.map((dropdown) => (
                <div key={dropdown.key} className="py-3 border-b border-gray-100 last:border-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {dropdown.label}
                  </label>
                  <select
                    value={settings[dropdown.key.split('.')[0]]?.[dropdown.key.split('.')[1] || dropdown.key]}
                    onChange={(e) => {
                      const sectionKey = dropdown.key.split('.')[0];
                      const settingKey = dropdown.key.split('.')[1] || dropdown.key;
                      setSettings({
                        ...settings,
                        [sectionKey]: {
                          ...settings[sectionKey],
                          [settingKey]: e.target.value,
                        },
                      });
                    }}
                    className="input-field"
                  >
                    {dropdown.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danger Zone</h2>
            <p className="text-sm text-gray-500 mt-1">
              These actions are irreversible. Please proceed with caution.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  alert('Account deletion requested. This feature is not implemented in the demo.');
                }
              }}
              className="btn-danger"
            >
              Delete Account
            </button>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50">
            <p className="font-medium text-gray-900">Export Data</p>
            <p className="text-sm text-gray-500 mt-1">Download all your data</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50">
            <p className="font-medium text-gray-900">Clear Cache</p>
            <p className="text-sm text-gray-500 mt-1">Remove temporary files</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50">
            <p className="font-medium text-gray-900">Reset Preferences</p>
            <p className="text-sm text-gray-500 mt-1">Restore default settings</p>
          </button>
        </div>
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // In a real app, this would save to backend
            alert('Settings saved successfully!');
          }}
          className="btn-primary px-8"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;