import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DoctorProfile from '../pages/Doctorprofile';
import * as doctorService from '../services/doctor';

// Mock do módulo de navegação e serviços
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
}));

vi.mock('../services/doctor', () => ({
  getDoctorProfile: vi.fn(),
  updateDoctorProfile: vi.fn(),
  changeDoctorPassword: vi.fn(),
}));

describe('DoctorProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza tela de carregamento inicialmente', async () => {
    doctorService.getDoctorProfile.mockResolvedValueOnce({
      doctor: { crm: '', telefone: '', endereco: '', especialidade: '' },
    });

    render(<DoctorProfile />, { wrapper: MemoryRouter });
    expect(screen.getByText('Carregando perfil...')).toBeInTheDocument();

    await waitFor(() => {
      expect(doctorService.getDoctorProfile).toHaveBeenCalled();
    });
  });

  it('carrega e exibe dados do perfil', async () => {
    doctorService.getDoctorProfile.mockResolvedValueOnce({
      doctor: {
        crm: '12345',
        telefone: '(11) 99999-9999',
        endereco: 'Rua das Flores',
        especialidade: 'Cardiologia, Nefrologia',
      },
    });

    render(<DoctorProfile />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
      expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Rua das Flores')).toBeInTheDocument();
      expect(screen.getByText('Cardiologia')).toBeInTheDocument();
      expect(screen.getByText('Nefrologia')).toBeInTheDocument();
    });
  });

  it('mostra erro se CRM for inválido', async () => {
    doctorService.getDoctorProfile.mockResolvedValueOnce({
      doctor: { crm: '12345', telefone: '(11) 99999-9999', endereco: '', especialidade: 'Cardiologia' },
    });

    render(<DoctorProfile />, { wrapper: MemoryRouter });

    await waitFor(() => screen.getByDisplayValue('12345'));

    const crmInput = screen.getByPlaceholderText('CRM 12345');
    fireEvent.change(crmInput, { target: { value: '12' } });

    const button = screen.getByText('Salvar Alterações');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('CRM inválido')).toBeInTheDocument();
    });
  });

  it('adiciona e remove especialidade', async () => {
    doctorService.getDoctorProfile.mockResolvedValueOnce({
      doctor: { crm: '1234', telefone: '(11) 99999-9999', endereco: '', especialidade: 'Cardiologia' },
    });

    render(<DoctorProfile />, { wrapper: MemoryRouter });
    await waitFor(() => screen.getByText('Cardiologia'));

    const input = screen.getByPlaceholderText('Digite uma especialidade');
    fireEvent.change(input, { target: { value: 'Nefrologia' } });
    fireEvent.click(screen.getByText('Adicionar'));

    expect(screen.getByText('Nefrologia')).toBeInTheDocument();

    // remove a especialidade
    const removeButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    expect(screen.queryByText('Nefrologia')).not.toBeInTheDocument();
  });

  it('muda para aba de segurança e mostra campos de senha', async () => {
    doctorService.getDoctorProfile.mockResolvedValueOnce({
      doctor: { crm: '', telefone: '', endereco: '', especialidade: '' },
    });

    render(<DoctorProfile />, { wrapper: MemoryRouter });
    await waitFor(() => screen.getByText('Dados Profissionais'));

    fireEvent.click(screen.getByText('Segurança'));
    expect(screen.getByPlaceholderText('Digite sua senha atual')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite sua nova senha (mín. 6 caracteres)')).toBeInTheDocument();
  });

  it('valida senhas incorretas antes de alterar', async () => {
    doctorService.getDoctorProfile.mockResolvedValueOnce({
      doctor: { crm: '', telefone: '', endereco: '', especialidade: '' },
    });

    render(<DoctorProfile />, { wrapper: MemoryRouter });
    await waitFor(() => screen.getByText('Segurança'));
    fireEvent.click(screen.getByText('Segurança'));

    const alterar = screen.getByText('Alterar Senha');
    fireEvent.click(alterar);

    expect(screen.getByText('Preencha todos os campos de senha')).toBeInTheDocument();
  });
});
