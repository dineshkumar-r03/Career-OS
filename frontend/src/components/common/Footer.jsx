import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-primary-600 mb-4">Connect</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Learn from seniors. Build your future.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/home" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Explore</Link></li>
              <li><Link to="/create" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Write</Link></li>
              <li><Link to="/bookmarks" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Bookmarks</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Connect
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Contact: contact@connect.com
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {currentYear} Connect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;