import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserModal from '../../../src/components/ui/UserModal';
import React from 'react';

// Mock dos ícones Lucide
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    X: (props) => <svg data-testid="icon-x" {...props} />,
    Save: (props) => <svg data-testid="icon-save" {...props} />,
    User: (props) => <svg data-testid="icon-user" {...props} />,
    Shield: (props) => <svg data-testid="icon-shield" {...props} />,
    Activity: (props) => <svg data-testid="icon-activity" {...props} />,
  };
});


// ============================================================================
//  TESTES DE RENDERIZAÇÃO
// ============================================================================

describe('UserModal - Renderização', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockDoctors = [
    { id: 'doc1', nome: 'Dr. João', crm: '12345' },
    { id: 'doc2', nome: 'Dra. Maria', crm: '67890' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    editUser: null,
    doctors: mockDoctors,
  };

  beforeEach(() => vi.clearAllMocks());

  it('não deve renderizar quando isOpen é false', () => {
    const { container } = render(<UserModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar o título "Novo Usuário" no modo criação', () => {
    render(<UserModal {...defaultProps} editUser={null} />);

    expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.queryByText(/Deixe em branco para não alterar/i)).not.toBeInTheDocument();
  });

  it('deve renderizar o título "Editar Usuário" e carregar dados', () => {
    const editUser = {
      id: 'u1',
      nome: 'Usuário Existente',
      email: 'existente@test.com',
      tipo_usuario: 'medico',
      crm: 'CRM007',
      ativo: false,
    };

    render(<UserModal {...defaultProps} editUser={editUser} />);

    expect(screen.getByText('Editar Usuário')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Usuário Existente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('existente@test.com')).toBeInTheDocument();
  });

  it('deve exibir campos do paciente (modo padrão: paciente)', () => {
    render(<UserModal {...defaultProps} />);

    expect(screen.getByText('Dados do Paciente')).toBeInTheDocument();
    expect(screen.getByText('Médico Responsável')).toBeInTheDocument();
    expect(screen.getByText('Dr. João - CRM: 12345')).toBeInTheDocument();
  });

  it('deve exibir campos de médico ao selecionar tipo_usuario = medico', () => {
    render(<UserModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Tipo de Usuário/i), {
      target: { value: 'medico' },
    });

    expect(screen.getByText('Dados do Médico')).toBeInTheDocument();
    expect(screen.getByLabelText(/CRM/i)).toBeInTheDocument();
  });
});


// ============================================================================
//  TESTES DE SUBMISSÃO E VALIDAÇÃO
// ============================================================================

describe('UserModal - Submissão e Validação', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const baseProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    doctors: [],
  };

  beforeEach(() => vi.clearAllMocks());

  it('deve chamar onClose ao clicar Cancelar', () => {
    render(<UserModal {...baseProps} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('exibe erro se Nome ou Email estiverem vazios', async () => {
    render(<UserModal {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(screen.getByText('Nome e email são obrigatórios')).toBeInTheDocument();
    });
  });

  it('exibe erro se senha estiver vazia em novo usuário', async () => {
    render(<UserModal {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Novo User' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'novo@user.com' },
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(screen.getByText('Senha é obrigatória para novos usuários')).toBeInTheDocument();
    });
  });

  it('deve salvar um novo paciente', async () => {
    mockOnSave.mockResolvedValue();

    render(<UserModal {...baseProps} doctors={[{ id: '1', nome: 'Dr X', crm: '111' }]} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Novo Paciente' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'p@c.com' },
    });

    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'secure' },
    });

    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '111.111.111-11' },
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);

      const saved = mockOnSave.mock.calls[0][0];
      expect(saved.nome).toBe('Novo Paciente');
      expect(saved.tipo_usuario).toBe('paciente');
      expect(saved.cpf).toBe('111.111.111-11');
      expect(saved).not.toHaveProperty('crm');
    });
  });

  it('deve salvar paciente editado sem senha', async () => {
    mockOnSave.mockResolvedValue();

    const editUser = {
      id: 'u1',
      nome: 'Editado',
      email: 'editado@test.com',
      tipo_usuario: 'paciente',
      cpf: '222.222.222-22',
    };

    render(<UserModal {...baseProps} editUser={editUser} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Nome Alterado' },
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      const saved = mockOnSave.mock.calls[0][0];

      expect(saved.nome).toBe('Nome Alterado');
      expect(saved.email).toBe('editado@test.com');
      expect(saved.senha).toBe('');
      expect(saved.tipo_usuario).toBe('paciente');
    });
  });

  it('deve salvar médico novo', async () => {
    mockOnSave.mockResolvedValue();

    render(<UserModal {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/Tipo de Usuário/i), {
      target: { value: 'medico' },
    });

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Dr. House' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'h@use.com' },
    });

    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'h0use' },
    });

    fireEvent.change(screen.getByLabelText(/CRM/i), {
      target: { value: '99999' },
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);

      const saved = mockOnSave.mock.calls[0][0];
      expect(saved.crm).toBe('99999');
      expect(saved).not.toHaveProperty('cpf');
    });
  });

  it('exibe mensagem de erro quando onSave falha', async () => {
    const msg = 'Falha de comunicação com o servidor';
    mockOnSave.mockRejectedValue(new Error(msg));

    render(<UserModal {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: 'Test' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@fail.com' },
    });

    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(screen.getByText(msg)).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
