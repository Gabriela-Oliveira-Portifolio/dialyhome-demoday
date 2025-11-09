import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import ChartsModal from '../../../src/components/ui/ChartsModal';
import * as dialysisService from '../../../src/services/dialysis';
import * as patientService from '../../../src/services/patient';


// 🔹 Mock dos serviços
vi.mock('../../../src/services/dialysis');
vi.mock('../../../src/services/patient');

const mockRecords = {
  records: [
    {
      data_registro: '2025-11-01',
      pressao_arterial_sistolica: 120,
      pressao_arterial_diastolica: 80,
      uf_total: 1500,
      concentracao_glicose: 90,
      tempo_permanencia: 180
    },
    {
      data_registro: '2025-11-02',
      pressao_arterial_sistolica: 130,
      pressao_arterial_diastolica: 85,
      uf_total: 1700,
      concentracao_glicose: 95,
      tempo_permanencia: 200
    }
  ]
};

describe('ChartsModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(<ChartsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza estado de carregamento inicialmente', async () => {
    dialysisService.getPatientRecords.mockResolvedValueOnce(mockRecords);
    patientService.getDetailedStats.mockResolvedValueOnce({});

    render(<ChartsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Carregando gráficos/i)).toBeInTheDocument();
  });

  it('carrega e exibe gráficos após obter dados', async () => {
    dialysisService.getPatientRecords.mockResolvedValueOnce(mockRecords);
    patientService.getDetailedStats.mockResolvedValueOnce({});

    render(<ChartsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/Evolução da Pressão Arterial/i)).toBeInTheDocument()
    );
  });

  it('mostra mensagem de "Sem dados suficientes" se records estiver vazio', async () => {
    dialysisService.getPatientRecords.mockResolvedValueOnce({ records: [] });
    patientService.getDetailedStats.mockResolvedValueOnce({});

    render(<ChartsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/Sem dados suficientes/i)).toBeInTheDocument()
    );
  });

  it('permite trocar o período (7, 30, 90 dias)', async () => {
    dialysisService.getPatientRecords.mockResolvedValue(mockRecords);
    patientService.getDetailedStats.mockResolvedValue({});

    render(<ChartsModal isOpen={true} onClose={vi.fn()} />);

    const select = await screen.findByDisplayValue('Últimos 30 dias');
    fireEvent.change(select, { target: { value: '7' } });
    expect(select.value).toBe('7');
  });

  it('permite trocar o gráfico ativo clicando nas abas', async () => {
    dialysisService.getPatientRecords.mockResolvedValueOnce(mockRecords);
    patientService.getDetailedStats.mockResolvedValueOnce({});

    render(<ChartsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/Evolução da Pressão Arterial/i)).toBeInTheDocument()
    );

    const glicoseTab = screen.getByText(/Glicose/i);
    fireEvent.click(glicoseTab);

    await waitFor(() =>
      expect(screen.getByText(/Evolução da Glicose/i)).toBeInTheDocument()
    );
  });

  it("chama onClose ao clicar no botão de fechar", async () => {
  const handleClose = vi.fn();

  render(<ChartsModal isOpen={true} onClose={handleClose} />);

  // aguarda o botão estar disponível
  const closeButton = screen.getAllByRole('button')[0];
    await act(async () => {
    fireEvent.click(closeButton);
    });


  expect(handleClose).toHaveBeenCalled();
});


  it('exibe mensagem de erro no console se fetch falhar', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dialysisService.getPatientRecords.mockRejectedValueOnce(new Error('Erro API'));
    patientService.getDetailedStats.mockRejectedValueOnce(new Error('Erro API'));

    render(<ChartsModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });
});
