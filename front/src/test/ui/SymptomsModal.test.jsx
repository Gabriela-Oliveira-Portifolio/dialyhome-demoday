// front/src/test/ui/SymptomsModal.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SymptomsModal from '../../components/ui/SymptomsModal';
import { getPredefinedSymptoms, registerIsolatedSymptom } from '../../services/symptoms';
import { vi } from 'vitest';

// Mock dos serviços de backend
vi.mock('../../services/symptoms', () => ({
  getPredefinedSymptoms: vi.fn(),
  registerIsolatedSymptom: vi.fn(),
}));

// Dados de exemplo usados nos testes
const mockSymptomsData = {
  symptoms: [
    { id: 1, nome: 'Tosse', severidade_padrao: 'leve' },
    { id: 2, nome: 'Febre', severidade_padrao: 'moderado' },
  ],
  grouped: {
    Respiratório: [{ id: 1, nome: 'Tosse', severidade_padrao: 'leve' }],
    Geral: [{ id: 2, nome: 'Febre', severidade_padrao: 'moderado' }],
  },
};

describe('SymptomsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSymptomRegistered = vi.fn();

  beforeEach(() => {
    // Garante que as mocks e as chamadas estejam limpas a cada teste
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen é false', () => {
    render(
      <SymptomsModal
        isOpen={false}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );
    expect(screen.queryByText(/Registrar Sintomas/i)).toBeNull();
  });

  it('renderiza corretamente e carrega sintomas', async () => {
    getPredefinedSymptoms.mockResolvedValueOnce(mockSymptomsData);

    render(
      <SymptomsModal
        isOpen={true}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );

    expect(getPredefinedSymptoms).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Registrar Sintomas')).toBeInTheDocument();
      expect(screen.getByText('Tosse')).toBeInTheDocument();
      expect(screen.getByText('Febre')).toBeInTheDocument();
    });
  });

  it('permite selecionar e desmarcar sintomas', async () => {
    getPredefinedSymptoms.mockResolvedValueOnce(mockSymptomsData);

    render(
      <SymptomsModal
        isOpen={true}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );

    await waitFor(() => screen.getByText('Tosse'));

    const tosseBtn = screen.getAllByText('Tosse')[0];
    fireEvent.click(tosseBtn);

    expect(await screen.findByText(/Sintomas Selecionados/i)).toBeInTheDocument();

    const removerBtn = screen.getByRole('button', { name: /Remover/i }); 
    fireEvent.click(removerBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Sintomas Selecionados/i)).not.toBeInTheDocument();
    });
  });

  it('atualiza severidade e observação de um sintoma selecionado', async () => {
    getPredefinedSymptoms.mockResolvedValueOnce(mockSymptomsData);

    render(
      <SymptomsModal
        isOpen={true}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );

    await waitFor(() => screen.getByText('Tosse'));
    fireEvent.click(screen.getAllByText('Tosse')[0]);

    const graveBtn = await screen.findByRole('button', { name: /grave/i });
    fireEvent.click(graveBtn);
    expect(graveBtn).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Descreva mais detalhes/i);
    fireEvent.change(textarea, { target: { value: 'Tosse seca persistente' } });
    expect(textarea.value).toBe('Tosse seca persistente');
  });

  // test desabilitado temporariamente
  it.skip('exibe erro se tentar registrar sem selecionar sintomas', async () => {
    getPredefinedSymptoms.mockResolvedValueOnce(mockSymptomsData);

    render(
      <SymptomsModal
        isOpen={true}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );

    await waitFor(() => screen.getByText('Registrar Sintomas'));

    // 1. Garanta que o botão está DESABILITADO (boa prática de acessibilidade)
    const submitBtn = screen.getByRole('button', { name: /Registrar 0 Sintoma/i });
    expect(submitBtn).toBeDisabled();
    
    // 2. Encontre o formulário. O `fireEvent.submit` em um formulário **não** é bloqueado
    // pelo botão desabilitado, simulando a lógica de validação do componente.
    const form = screen.getByRole('form');

    await act(async () => {
      // Força a submissão do formulário, o que deve disparar a validação
      fireEvent.submit(form); 
    });

    // 3. Espera a mensagem de erro.
    // Se o componente exibe a mensagem de erro ao tentar submeter sem dados, este findByText vai funcionar.
    expect(await screen.findByText(/Selecione ao menos um sintoma/i)).toBeInTheDocument();
  });


  // test desabilitado temporariamente
  it.skip('envia sintomas e exibe mensagem de sucesso', async () => {
    getPredefinedSymptoms.mockResolvedValueOnce(mockSymptomsData);
    // Mockando a chamada de sucesso
    registerIsolatedSymptom.mockResolvedValueOnce({ message: 'ok' });

    render(
      <SymptomsModal
        isOpen={true}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );

    await waitFor(() => screen.getByText('Tosse'));
    
    // 1. Clica no sintoma (Tosse)
    fireEvent.click(screen.getAllByText('Tosse')[0]);
    
    // Aguarda o sintoma aparecer na lista (para garantir que o botão está habilitado)
    const submitBtn = await screen.findByRole('button', { name: /Registrar 1 Sintoma/i });
    expect(submitBtn).not.toBeDisabled(); // Garante que o botão está ativo.

    // 2. O act deve envolver o evento que inicia o processo assíncrono (o clique no botão).
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    
    // 3. Espera a resolução da Promise da mock (registerIsolatedSymptom) e a atualização do UI
    await waitFor(() => {
        expect(registerIsolatedSymptom).toHaveBeenCalledTimes(1); 
    });

    // 4. Espera a mensagem de sucesso aparecer (A mensagem de sucesso aparece APÓS a chamada de API).
    await waitFor(() => {
        expect(screen.getByText(/Sintomas registrados com sucesso!/i)).toBeInTheDocument();
    });

    // 5. Espera os callbacks de sucesso serem chamados
    await waitFor(() => {
        expect(mockOnSymptomRegistered).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('exibe erro ao falhar o registro de sintomas', async () => {
    getPredefinedSymptoms.mockResolvedValueOnce(mockSymptomsData);
    registerIsolatedSymptom.mockRejectedValueOnce(new Error('Erro ao registrar sintomas'));

    render(
      <SymptomsModal
        isOpen={true}
        onClose={mockOnClose}
        onSymptomRegistered={mockOnSymptomRegistered}
      />
    );

    await waitFor(() => screen.getByText('Tosse'));
    fireEvent.click(screen.getAllByText('Tosse')[0]);

    const submitBtn = screen.getByRole('button', { name: /Registrar 1 Sintoma/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 💡 Espera a mensagem de erro aparecer (usando findByText para robustez)
    await waitFor(() => {
        expect(screen.getByText(/Erro ao registrar sintomas/i)).toBeInTheDocument();
    });
    
    // Verifica que os callbacks não foram chamados
    expect(mockOnSymptomRegistered).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});