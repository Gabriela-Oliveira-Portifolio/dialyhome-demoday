// backend/tests/unit/patientController.test.js

// Garante que estamos em modo de teste
process.env.NODE_ENV = 'test';

// =========================================================================
// MOCKS DE DEPENDÊNCIAS
// Foco apenas no mock de DB, pois não usamos mais createPatient ou checkAdmin/checkDoctor
// =========================================================================

const mockDbQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
    query: mockDbQuery,
    pool: { end: jest.fn() }
}));

// Remover os mocks de bcrypt e checkAdmin/checkDoctor

// Importar o controller APÓS os mocks
const patientController = require('../../src/controllers/patientController');

describe('PatientController - Unit Tests (Profile & Stats)', () => {
    let mockReq, mockRes;

    const patientUserId = 100;
    const patientId = 200;

    beforeEach(() => {
        jest.clearAllMocks();

        // Configuração base de Request e Response mocks (Padrão: Paciente)
        mockReq = {
            query: {},
            params: {},
            body: {},
            user: {
                id: patientUserId,
                tipo_usuario: 'paciente',
                email: 'paciente.unit@test.com',
                nome: 'Paciente Teste Unit'
            }
        };

        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
    });

    // --- Testes getProfile ---
    describe('getProfile', () => {
        it('deve retornar o perfil completo do paciente com dias de tratamento calculados', async () => {
            const dataInicioTratamento = new Date();
            dataInicioTratamento.setDate(dataInicioTratamento.getDate() - 5); 

            const mockPatientData = {
                rows: [{
                    usuario_id: patientUserId,
                    nome: 'Paciente Teste',
                    data_inicio_tratamento: dataInicioTratamento.toISOString().split('T')[0],
                    idade: 30,
                    // ...campos mockados
                }]
            };

            mockDbQuery.mockResolvedValueOnce(mockPatientData);

            await patientController.getProfile(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [patientUserId]);
            expect(mockRes.json).toHaveBeenCalled();

            const response = mockRes.json.mock.calls[0][0].patient;
            expect(response.dias_tratamento).toBeGreaterThanOrEqual(4);
        });

        it('deve retornar 404 se o paciente não for encontrado', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar 500 em caso de erro no banco de dados', async () => {
            mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

            await patientController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // --- Testes getStats ---
    describe('getStats', () => {
        const mockPatientResult = { rows: [{ id: patientId }] };
        const mockStatsResult = { rows: [{ total_registros: '10', media_sistolica: 120.5, media_uf: 1500, media_diastolica: 80, media_tempo: 240 }] };
        const mockLastRecord = { rows: [{ pressao_arterial_sistolica: 125, uf_total: 1600, tempo_permanencia: 240, concentracao_glicose: 1.6 }] };
        const mockTrends = { rows: [ { period: 'recent', avg_sistolica: 122 }, { period: 'previous', avg_sistolica: 110 } ] };

        it('deve retornar estatísticas e tendências corretamente', async () => {
            mockDbQuery
                .mockResolvedValueOnce(mockPatientResult)
                .mockResolvedValueOnce(mockStatsResult)
                .mockResolvedValueOnce(mockLastRecord)
                .mockResolvedValueOnce(mockTrends);

            await patientController.getStats(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(4);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.summary.total_registros).toBe(10);
            expect(response.current.uf_total).toBe('1.6');
        });

        it('deve retornar 404 se o paciente não for encontrado', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });
});