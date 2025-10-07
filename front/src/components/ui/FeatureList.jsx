import React from 'react';

const FeatureList = ({ features }) => {
  return (
    <div style={{ marginTop: '30px' }}>
      {features.map((feature, index) => (
        <p key={index}>
          {feature.icon} <b>{feature.title}</b> - {feature.description}
        </p>
      ))}
    </div>
  );
};

export default FeatureList;
