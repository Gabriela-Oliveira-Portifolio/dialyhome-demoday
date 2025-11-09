import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PatientProfile from '../pages/PatientProfile'
import { getPatientInfo } from '../services/patient'
import { updatePatientProfile, changePassword } from '../services/Userservice'

// ====== MOCKS ======
vi.mock('../services/patient', () => ({
  getPatientInfo: vi.fn()
}))
vi.mock('../services/Userservice', () => ({
  updatePatientProfile: vi.fn(),
  changePassword: vi.fn()
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

// ====== TESTES ======
describe('🧪 PatientProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe "Carregando perfil..." enquanto busca dados', async () => {
    getPatientInfo.mockImplementation(() => new Promise(() => {})) // nunca resolve

    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    expect(screen.getByText(/Carregando perfil/i)).toBeInTheDocument()
  })

  it('carrega e exibe dados do paciente corretamente', async () => {
    getPatientInfo.mockResolvedValue({
      patient: {
        cpf: '123.456.789-00',
        telefone: '(47) 99999-8888',
        endereco: 'Rua Teste, 123',
        peso_inicial: '70',
        altura: '1.70'
      }
    })

    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('123.456.789-00')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('(47) 99999-8888')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Rua Teste, 123')).toBeInTheDocument()
  })

  it('mostra erro se falhar ao carregar perfil', async () => {
    getPatientInfo.mockRejectedValue({ error: 'Erro ao carregar dados' })

    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar dados do perfil/i)).toBeInTheDocument()
    })
  })

  it('alterna entre as abas Dados Pessoais e Segurança', async () => {
    getPatientInfo.mockResolvedValue({ patient: {} })
    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument()
    })

    const botaoSeguranca = screen.getByRole('button', { name: /Segurança/i })
    fireEvent.click(botaoSeguranca)


    expect(screen.getByText(/Senha Atual/i)).toBeInTheDocument()
  })

  it('valida CPF e telefone incorretos ao salvar', async () => {
    getPatientInfo.mockResolvedValue({ patient: {} })
    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '123' } })
    fireEvent.submit(screen.getByText(/Salvar Alterações/i))

    await waitFor(() => {
      expect(screen.getByText(/CPF inválido/i)).toBeInTheDocument()
    })
  })

  it('chama updatePatientProfile com dados alterados', async () => {
    getPatientInfo.mockResolvedValue({
      patient: {
        cpf: '123.456.789-00',
        telefone: '(47) 99999-8888',
        endereco: 'Rua Teste',
        peso_inicial: '70',
        altura: '1.70'
      }
    })
    updatePatientProfile.mockResolvedValue({})

    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Rua Teste')).toBeInTheDocument()
    })

    const enderecoInput = screen.getByPlaceholderText(/Rua, número/i)
    fireEvent.change(enderecoInput, { target: { value: 'Rua Alterada' } })
    fireEvent.submit(screen.getByText(/Salvar Alterações/i))

    await waitFor(() => {
      expect(updatePatientProfile).toHaveBeenCalledWith({ endereco: 'Rua Alterada' })
      expect(screen.getByText(/Perfil atualizado com sucesso!/i)).toBeInTheDocument()
    })
  })

  it('exibe erro se updatePatientProfile falhar', async () => {
    getPatientInfo.mockResolvedValue({ patient: { endereco: 'Teste' } })
    updatePatientProfile.mockRejectedValue({ error: 'Erro ao atualizar' })

    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Teste')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/Rua, número/i), {
      target: { value: 'Nova Rua' }
    })
    fireEvent.submit(screen.getByText(/Salvar Alterações/i))

    await waitFor(() => {
      expect(screen.getByText(/Erro ao atualizar/i)).toBeInTheDocument()
    })
  })

  it('valida troca de senha com campos vazios', async () => {
    getPatientInfo.mockResolvedValue({ patient: {} })
    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument()
    })

    fireEvent.click(
    screen.getByRole('button', { name: /Segurança/i })
    )
    fireEvent.submit(screen.getByText(/Alterar Senha/i))

    await waitFor(() => {
      expect(screen.getByText(/Preencha todos os campos/i)).toBeInTheDocument()
    })
  })

  it('valida senhas diferentes na troca de senha', async () => {
    getPatientInfo.mockResolvedValue({ patient: {} })
    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument()
    })

    fireEvent.click(
    screen.getByRole('button', { name: /Segurança/i })
    )


    fireEvent.change(screen.getByPlaceholderText(/senha atual/i), { target: { value: '123456' } })
    fireEvent.change(screen.getByPlaceholderText(/digite sua nova senha/i), { target: { value: 'abcdef' } })
    fireEvent.change(screen.getByPlaceholderText(/confirme sua nova senha/i), { target: { value: '123abc' } })

    fireEvent.submit(screen.getByText(/Alterar Senha/i))

    await waitFor(() => {
      expect(screen.getByText(/As senhas não coincidem/i)).toBeInTheDocument()
    })
  })

  it('chama changePassword corretamente ao alterar senha', async () => {
    getPatientInfo.mockResolvedValue({ patient: {} })
    changePassword.mockResolvedValue({})

    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument()
    })

    fireEvent.click(
    screen.getByRole('button', { name: /Segurança/i })
    )


    fireEvent.change(screen.getByPlaceholderText(/senha atual/i), { target: { value: '123456' } })
    fireEvent.change(screen.getByPlaceholderText(/digite sua nova senha/i), { target: { value: 'abcdef' } })

    fireEvent.change(screen.getByPlaceholderText(/confirme sua nova senha/i), { target: { value: 'abcdef' } })

    fireEvent.submit(screen.getByText(/Alterar Senha/i))

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: '123456',
        newPassword: 'abcdef'
      })
      expect(screen.getByText(/Senha alterada com sucesso!/i)).toBeInTheDocument()
    })
  })
})
;