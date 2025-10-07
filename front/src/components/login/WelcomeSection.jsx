import React from 'react';
import FeatureList from '../UI/FeatureList';

const WelcomeSection = ({ logo, title, features }) => {
  return (
    <div>
      {logo && (
        <img src={logo} alt="Logo" style={{ width: '60px', marginBottom: '20px' }} />
      )}
      <h4>{title}</h4>
      <FeatureList features={features} />
    </div>
  );
};

export default WelcomeSection;