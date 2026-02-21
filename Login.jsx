import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Link, useLocation } from 'react-router-dom';

const Login = () => {
  const location = useLocation();
  const message = location.state?.message;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">$</span>
          </div>
        </Link>
        <h1 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Modern Banking
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 rounded-lg sm:px-10">
          {message && (
            <div className="mb-6 bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}
          <LoginForm />
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;