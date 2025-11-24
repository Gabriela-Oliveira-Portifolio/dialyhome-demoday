import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WelcomeSection from '../../../excluir/WelcomeSection';
import React from 'react';

// 1. Mock do componente FeatureList, pois é uma dependência externa.
// Isso garante que estamos testando apenas a lógica de WelcomeSection.
vi.mock('../../components/UI/FeatureList', () => ({
  default: ({ features }) => (
    <div data-testid="mock-feature-list">
      Lista de Features Mockada: {features.length} itens
    </div>
  ),
}));

describe('WelcomeSection', () => {
  const defaultProps = {
    title: 'Bem-vindo ao Portal',
    logo: 'logo-url.png',
    features: [{ id: 1, text: 'Feature A' }, { id: 2, text: 'Feature B' }],
  };

  it('deve renderizar o título, o logo e o FeatureList quando todas as props são fornecidas', () => {
    render(<WelcomeSection {...defaultProps} />);

    // Verifica o Título
    const titleElement = screen.getByRole('heading', { level: 4, name: defaultProps.title });
    expect(titleElement).toBeInTheDocument();

    // Verifica o Logo (Imagem)
    const logoElement = screen.getByRole('img', { name: 'Logo' });
    expect(logoElement).toBeInTheDocument();
    expect(logoElement).toHaveAttribute('src', defaultProps.logo);
    expect(logoElement).toHaveStyle({ width: '60px', marginBottom: '20px' });

    // Verifica se o FeatureList mockado foi renderizado
    const featureListElement = screen.getByTestId('mock-feature-list');
    expect(featureListElement).toBeInTheDocument();
    expect(featureListElement).toHaveTextContent(`Lista de Features Mockada: ${defaultProps.features.length} itens`);
  });

  it('deve renderizar o título e o FeatureList, mas OMITIR o logo quando a prop logo não for fornecida', () => {
    // Remove a prop 'logo'
    const { logo, ...propsWithoutLogo } = defaultProps;

    render(<WelcomeSection {...propsWithoutLogo} logo={undefined} />);

    // Verifica o Título (ainda deve estar presente)
    expect(screen.getByRole('heading', { level: 4, name: defaultProps.title })).toBeInTheDocument();

    // Verifica se o Logo NÃO está presente
    const logoElement = screen.queryByRole('img', { name: 'Logo' });
    expect(logoElement).not.toBeInTheDocument();

    // Verifica se o FeatureList ainda está presente
    expect(screen.getByTestId('mock-feature-list')).toBeInTheDocument();
  });

  it('deve renderizar corretamente com uma lista de features vazia', () => {
    const propsWithEmptyFeatures = {
        ...defaultProps,
        features: [],
    };

    render(<WelcomeSection {...propsWithEmptyFeatures} />);

    // Verifica se o FeatureList mockado recebeu 0 itens
    const featureListElement = screen.getByTestId('mock-feature-list');
    expect(featureListElement).toHaveTextContent('Lista de Features Mockada: 0 itens');
  });
});