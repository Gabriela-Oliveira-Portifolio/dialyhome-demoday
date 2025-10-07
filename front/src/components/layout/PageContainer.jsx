import React from 'react';

const PageContainer = ({ children }) => {
  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#f8f9fa' 
    }}>
      {children}
    </div>
  );
};

export default PageContainer;