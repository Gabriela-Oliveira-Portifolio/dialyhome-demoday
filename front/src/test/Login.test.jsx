import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Limpa tudo após cada teste
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ✅ Mock do serviço de autenticação
vi.mock('../services/auth', () => ({
  login: vi.fn()
}));

// ✅ Mock de useNavigate (React Router)
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('🧪 Testes da página de Login', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renderiza os campos de email e senha corretamente', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('mostra mensagem de erro se os campos estiverem vazios', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Entrar'));
    expect(await screen.findByText('Por favor, preencha todos os campos')).toBeInTheDocument();
  });

  it('realiza login com sucesso e redireciona paciente', async () => {
    const { login } = await import('../services/auth');
    login.mockResolvedValue({
      accessToken: 'token123',
      refreshToken: 'refresh123',
      user: { tipo_usuario: 'paciente', nome: 'João' }
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'joao@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('joao@email.com', '123456');
      expect(localStorage.getItem('accessToken')).toBe('token123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redireciona médico e admin corretamente', async () => {
    const { login } = await import('../services/auth');

    const users = [
      { tipo_usuario: 'medico', expected: '/DoctorDashboard' },
      { tipo_usuario: 'admin', expected: '/admin' }
    ];

    for (const user of users) {
      login.mockResolvedValue({
        accessToken: 'abc',
        refreshToken: 'def',
        user
      });

      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'user@email.com' } });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha' } });
      fireEvent.click(screen.getByText('Entrar'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(user.expected);
      });

      cleanup(); // limpa entre iterações
    }
  });

  it('mostra mensagem de erro se o login falhar', async () => {
    const { login } = await import('../services/auth');
    login.mockRejectedValue({ error: 'Credenciais inválidas' });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'user@email.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senhaerrada' } });
    fireEvent.click(screen.getByText('Entrar'));

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
  });

  it('alterna visibilidade da senha ao clicar no botão de visibilidade', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const senhaInput = screen.getByPlaceholderText('••••••••');
  
  // Seleciona o botão de alternar visibilidade pelo seletor de classe
  const toggleButton = document.querySelector('button.toggle-password');

  expect(senhaInput.type).toBe('password');
  fireEvent.click(toggleButton);
  expect(senhaInput.type).toBe('text');
  fireEvent.click(toggleButton);
  expect(senhaInput.type).toBe('password');
});
});
