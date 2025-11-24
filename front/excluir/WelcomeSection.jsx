import React from 'react';
import PropTypes from 'prop-types';
import FeatureList from '../src/components/UI/FeatureList';

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

WelcomeSection.propTypes = {
  logo: PropTypes.string,
  title: PropTypes.string.isRequired,
  features: PropTypes.array.isRequired,
};

export default WelcomeSection;
