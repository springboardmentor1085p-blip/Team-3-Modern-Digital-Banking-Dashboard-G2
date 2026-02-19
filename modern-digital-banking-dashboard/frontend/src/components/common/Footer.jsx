import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500">
            © {currentYear} Modern Digital Banking. All rights reserved.
          </div>
          
          <div className="mt-4 md:mt-0">
            <nav className="flex space-x-6">
              <a
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Terms of Service
              </a>
              <a
                href="/support"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Support
              </a>
              <a
                href="/contact"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Contact Us
              </a>
            </nav>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>
            This is a demonstration application. Do not use real banking information.
          </p>
          <p className="mt-1">
            For security reasons, please use test data only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;