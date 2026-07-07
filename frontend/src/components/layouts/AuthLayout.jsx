import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <main className="auth-layout">
      <div className="auth-layout-inner">
        <div className="auth-brand-row">
          <Link to="/" className="auth-brand">
            Connect
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
};

export default AuthLayout;
