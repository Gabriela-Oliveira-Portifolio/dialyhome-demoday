import React from 'react';

const TwoColumnLayout = ({ leftContent, rightContent }) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '50px', 
      alignItems: 'center' 
    }}>
      <div>{leftContent}</div>
      <div>{rightContent}</div>
    </div>
  );
};

export default TwoColumnLayout;
