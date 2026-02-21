import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  const handleEditToggle = () => {
    if (isEditing) {
      reset();
    }
    setIsEditing(!isEditing);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser(data);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Personal Information
              </h2>
              <button
                onClick={handleEditToggle}
                className="btn-secondary"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="input-field bg-gray-50"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Username cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        {...register('full_name', {
                          required: 'Full name is required',
                        })}
                        className="input-field"
                        placeholder="Enter your full name"
                      />
                      {errors.full_name && (
                        <p className="mt-1 text-sm text-danger-600">
                          {errors.full_name.message}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900 py-2">
                      {user.full_name || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="email"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                          },
                        })}
                        className="input-field"
                        placeholder="Enter your email"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-danger-600">
                          {errors.email.message}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900 py-2">{user.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account ID
                  </label>
                  <p className="text-gray-900 py-2">#{user.id}</p>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security Settings */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Security Settings
            </h2>
            <div className="space-y-4">
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Update your password regularly to keep your account secure
                    </p>
                  </div>
                  <span className="text-primary-600">→</span>
                </div>
              </button>

              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <span className="text-gray-400">Disabled</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Account Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Summary
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                  Active
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full btn-secondary">
                Download Statements
              </button>
              <button className="w-full btn-secondary">
                View Activity Log
              </button>
              <button className="w-full btn-danger">
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;