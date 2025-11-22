import React from 'react';
import { Form, Button } from 'react-bootstrap';

const LoginForm = ({ 
  email, 
  password, 
  role, 
  onEmailChange, 
  onPasswordChange, 
  onSubmit 
}) => {
  return (
    <Form>
      <Form.Group className="mb-3" controlId="formEmail">
        <Form.Label>Email</Form.Label>
        <Form.Control 
          type="email" 
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formPassword">
        <Form.Label>Senha</Form.Label>
        <Form.Control 
          type="password" 
          placeholder="******"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
      </Form.Group>

      <Button variant="success" className="w-100" onClick={onSubmit}>
        Entrar como {role}
      </Button>
    </Form>
  );
};

export default LoginForm;
