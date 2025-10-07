import React from 'react';
import { Card } from 'react-bootstrap';

const LoginCard = ({ title, subtitle, children }) => {
  return (
    <Card style={{ width: '350px', padding: '20px' }}>
      <h5>{title}</h5>
      <p>{subtitle}</p>
      {children}
    </Card>
  );
};

export default LoginCard;