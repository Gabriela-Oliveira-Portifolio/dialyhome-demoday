import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginCard from '../../../src/components/ui/LoginCard';


vi.mock('react-bootstrap', () => ({
  Card: ({ children, style }) => (
    <div data-testid="mock-card" style={style}>
      {children}
    </div>
  ),
}));

describe('LoginCard', () => {
  const defaultProps = {
    title: 'Acesso ao Sistema',
    subtitle: 'Insira suas credenciais abaixo',
  };

  it('deve renderizar o título, o subtítulo e aplicar estilos corretos', () => {
    render(<LoginCard {...defaultProps} />);

    // Verifica o Título (h5)
    expect(screen.getByRole('heading', { level: 5, name: defaultProps.title })).toBeInTheDocument();

    // Verifica o Subtítulo (p)
    expect(screen.getByText(defaultProps.subtitle)).toBeInTheDocument();

    // Verifica se o Card foi renderizado com os estilos esperados
    const cardElement = screen.getByTestId('mock-card');
    expect(cardElement).toBeInTheDocument();
    expect(cardElement).toHaveStyle('width: 350px');
    expect(cardElement).toHaveStyle('padding: 20px');
  });

  it('deve renderizar o conteúdo filho (children)', () => {
    const childrenContent = <div data-testid="children-content">Formulário de Login Aqui</div>;

    render(
      <LoginCard {...defaultProps}>
        {childrenContent}
      </LoginCard>
    );

    // Verifica se o conteúdo filho foi renderizado dentro do Card
    expect(screen.getByTestId('children-content')).toBeInTheDocument();
    expect(screen.getByText('Formulário de Login Aqui')).toBeInTheDocument();
  });

  it('deve renderizar sem subtítulo se não for fornecido', () => {
    render(<LoginCard title={defaultProps.title} />);

    // Verifica o Título
    expect(screen.getByRole('heading', { level: 5, name: defaultProps.title })).toBeInTheDocument();

    // Verifica que o subtítulo não está presente
    expect(screen.queryByText('Insira suas credenciais abaixo')).not.toBeInTheDocument();
  });
});