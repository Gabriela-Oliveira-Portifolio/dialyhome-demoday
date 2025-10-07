import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

const RoleTabs = ({ activeRole, onRoleChange, roles }) => {
  return (
    <Tabs 
      activeKey={activeRole} 
      onSelect={onRoleChange} 
      className="mb-3"
    >
      {roles.map((role) => (
        <Tab key={role} eventKey={role} title={role} />
      ))}
    </Tabs>
  );
};

export default RoleTabs;