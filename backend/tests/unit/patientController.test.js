// tests/unit/patientController.unit.test.js

process.env.NODE_ENV = 'test';

// Mock do database
const mockDbQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
    query: mockDbQuery,
    pool: { end: jest.fn() }
}));

// Mock do bcrypt
jest.mock('bcrypt');
const bcrypt = require('bcrypt');

// Mock das funções de auth
jest.mock('../../src/middleware/auth', () => ({
    checkAdmin: jest.fn(),
    checkDoctor: jest.fn()
}));

const { checkAdmin, checkDoctor } = require('../../src/middleware/auth');
const patientController = require('../../src/controllers/patientController');

describe('PatientController - Testes Unitários Completos', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            query: {},
            params: {},
            body: {},
            user: {
                id: 1,
                tipo_usuario: 'paciente',
                tipo: 'paciente',
                email: 'paciente@test.com',
                nome: 'Paciente Teste'
            }
        };

        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };

        // Reset dos mocks de autenticação
        checkAdmin.mockReturnValue(false);
        checkDoctor.mockReturnValue(false);
    });

    // ============= getProfile =============
    describe('getProfile', () => {
        it('deve retornar perfil completo do paciente com dias de tratamento', async () => {
            const dataInicio = new Date();
            dataInicio.setDate(dataInicio.getDate() - 10);

            mockDbQuery.mockResolvedValueOnce({
                rows: [{
                    usuario_id: 1,
                    nome: 'Paciente Teste',
                    email: 'paciente@test.com',
                    paciente_id: 100,
                    data_inicio_tratamento: dataInicio.toISOString().split('T')[0],
                    idade: 30
                }]
            });

            await patientController.getProfile(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [1]);
            expect(mockRes.json).toHaveBeenCalled();
            const response = mockRes.json.mock.calls[0][0].patient;
            expect(response.dias_tratamento).toBeGreaterThanOrEqual(9);
        });

        it('deve retornar 404 se paciente não for encontrado', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

            await patientController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Erro ao buscar perfil do paciente' 
            });
        });
    });

    // ============= getStats =============
    describe('getStats', () => {
        it('deve retornar estatísticas completas do paciente', async () => {
            mockReq.query.days = '30';

            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 100 }] })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        total_registros: '10', 
                        media_sistolica: 120.5,
                        media_diastolica: 80.3,
                        media_uf: 1500,
                        media_glicose: 100,
                        media_tempo: 240
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        pressao_arterial_sistolica: 125,
                        pressao_arterial_diastolica: 82,
                        uf_total: 1600,
                        concentracao_glicose: 105,
                        tempo_permanencia: 240
                    }] 
                })
                .mockResolvedValueOnce({ 
                    rows: [
                        { period: 'recent', avg_sistolica: 122, avg_diastolica: 81 },
                        { period: 'previous', avg_sistolica: 110, avg_diastolica: 78 }
                    ] 
                });

            await patientController.getStats(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(4);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.summary.total_registros).toBe(10);
            expect(response.summary.dias_periodo).toBe(30);
        });

        it('deve usar dias padrão se não especificado', async () => {
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 100 }] })
                .mockResolvedValueOnce({ rows: [{ total_registros: '5' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await patientController.getStats(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(
                expect.any(String),
                [100, 30]
            );
        });

        it('deve retornar 404 se paciente não for encontrado', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

            await patientController.getStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ============= getAllPatients =============
    describe('getAllPatients', () => {
        it('deve retornar todos os pacientes para admin', async () => {
            mockReq.user.tipo = 'admin';
            checkAdmin.mockReturnValueOnce(true);
            
            mockDbQuery.mockResolvedValueOnce({ 
                rows: [
                    { id: 1, nome: 'Paciente 1' },
                    { id: 2, nome: 'Paciente 2' }
                ] 
            });

            await patientController.getAllPatients(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ nome: 'Paciente 1' })
                ])
            );
        });

        it('deve filtrar pacientes do médico responsável', async () => {
            mockReq.user = { id: 5, tipo: 'medico' };
            checkDoctor.mockReturnValueOnce(true);
            
            mockDbQuery.mockResolvedValueOnce({ 
                rows: [{ id: 1, nome: 'Paciente do Médico', medico_id: 5 }] 
            });

            await patientController.getAllPatients(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(
                expect.stringContaining('medico_id'),
                expect.arrayContaining([5])
            );
        });

        it('deve retornar 403 se usuário não for médico ou admin', async () => {
            mockReq.user.tipo = 'paciente';
            checkDoctor.mockReturnValueOnce(false);
            checkAdmin.mockReturnValueOnce(false);

            await patientController.getAllPatients(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('deve aplicar paginação corretamente', async () => {
            mockReq.user.tipo = 'admin';
            mockReq.query = { page: '2', limit: '10' };
            checkAdmin.mockReturnValueOnce(true);
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getAllPatients(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([10, 10])
            );
        });
    });

    // ============= getPatientById =============
    describe('getPatientById', () => {
        beforeEach(() => {
            mockReq.params.id = '100';
        });

        it('deve retornar paciente com histórico, medicações e lembretes', async () => {
            mockReq.user = { id: 1, tipo: 'admin' };
            
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 100, nome: 'Paciente' }] })
                .mockResolvedValueOnce({ rows: [{ data: '2025-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ nome: 'Medicação X' }] })
                .mockResolvedValueOnce({ rows: [{ tipo: 'Consulta' }] });

            await patientController.getPatientById(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(4);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    history: expect.any(Array),
                    medications: expect.any(Array),
                    reminders: expect.any(Array)
                })
            );
        });

        it('deve permitir acesso ao próprio paciente', async () => {
            mockReq.user = { id: 1, tipo: 'paciente', tipo_usuario: 'paciente' };
            
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 100, usuario_id: 1 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await patientController.getPatientById(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalled();
        });

        it('deve permitir acesso ao médico responsável', async () => {
            mockReq.user = { id: 5, tipo: 'medico' };
            
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 100, medico_id: 5 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await patientController.getPatientById(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalled();
        });

        it('deve retornar 404 se paciente não existir', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getPatientById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar 403 se não tiver permissão', async () => {
            mockReq.user = { id: 999, tipo: 'paciente' };
            mockDbQuery.mockResolvedValueOnce({ 
                rows: [{ id: 100, usuario_id: 1 }]
            });

            await patientController.getPatientById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    // ============= createPatient =============
    describe('createPatient', () => {
        beforeEach(() => {
            mockReq.user = { tipo: 'admin' };
            mockReq.body = {
                nome: 'Novo Paciente',
                email: 'novo@test.com',
                senha: 'senha123',
                convenio: 'Plano X',
                medico_id: 5
            };
        });

        it('deve criar paciente com sucesso', async () => {
            checkAdmin.mockReturnValueOnce(true);
            bcrypt.hash.mockResolvedValueOnce('hashedPassword');
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 10 }] })
                .mockResolvedValueOnce({});

            await patientController.createPatient(mockReq, mockRes);

            expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
            expect(mockDbQuery).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });

        it('deve retornar 400 se dados obrigatórios ausentes', async () => {
            checkAdmin.mockReturnValueOnce(true);
            mockReq.body = { nome: 'Teste' };

            await patientController.createPatient(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('deve retornar 403 se não for médico ou admin', async () => {
            mockReq.user.tipo = 'paciente';
            checkDoctor.mockReturnValueOnce(false);
            checkAdmin.mockReturnValueOnce(false);

            await patientController.createPatient(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('deve retornar 500 em caso de erro', async () => {
            checkAdmin.mockReturnValueOnce(true);
            bcrypt.hash.mockResolvedValueOnce('hashedPassword');
            mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

            await patientController.createPatient(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ============= updatePatient =============
    describe('updatePatient', () => {
        beforeEach(() => {
            mockReq.params.id = '100';
            mockReq.user = { id: 5, tipo: 'medico' };
            mockReq.body = {
                nome: 'Paciente Atualizado',
                email: 'atualizado@test.com',
                convenio: 'Novo Plano'
            };
        });

        it('deve atualizar paciente com sucesso', async () => {
            mockDbQuery
                .mockResolvedValueOnce({ 
                    rows: [{ id: 100, usuario_id: 10, medico_id: 5 }] 
                })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});

            await patientController.updatePatient(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(3);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                message: 'Paciente atualizado com sucesso' 
            });
        });

        it('deve retornar 404 se paciente não existir', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.updatePatient(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar 403 se não tiver permissão', async () => {
            mockReq.user = { id: 999, tipo: 'medico' };
            mockDbQuery.mockResolvedValueOnce({ 
                rows: [{ id: 100, medico_id: 5 }]
            });

            await patientController.updatePatient(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    // ============= getMedicalData =============
    describe('getMedicalData', () => {
        beforeEach(() => {
            mockReq.params.id = '100';
            mockReq.user = { tipo: 'medico' };
        });

        it('deve retornar dados médicos completos', async () => {
            checkDoctor.mockReturnValueOnce(true);
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ observacoes: 'Obs médica' }] })
                .mockResolvedValueOnce({ rows: [{ data: '2025-01-01', peso: 70 }] })
                .mockResolvedValueOnce({ rows: [{ data: '2025-01-01', pressao: '120/80' }] });

            await patientController.getMedicalData(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(3);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    medicalData: expect.any(Object),
                    weightHistory: expect.any(Array),
                    pressureHistory: expect.any(Array)
                })
            );
        });

        it('deve retornar 403 se não for médico ou admin', async () => {
            mockReq.user.tipo = 'paciente';
            checkDoctor.mockReturnValueOnce(false);
            checkAdmin.mockReturnValueOnce(false);

            await patientController.getMedicalData(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    // ============= updateMedicalData =============
    describe('updateMedicalData', () => {
        beforeEach(() => {
            mockReq.params.id = '100';
            mockReq.user = { tipo: 'medico' };
            mockReq.body = {
                observacoes: 'Novas observações',
                medicacoes: [
                    { nome: 'Remédio A', dose: '10mg' },
                    { nome: 'Remédio B', dose: '20mg' }
                ]
            };
        });

        it('deve atualizar dados médicos e medicações', async () => {
            checkDoctor.mockReturnValueOnce(true);
            mockDbQuery
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});

            await patientController.updateMedicalData(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(4);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                message: 'Dados médicos atualizados com sucesso' 
            });
        });

        it('deve retornar 403 se não for médico ou admin', async () => {
            mockReq.user.tipo = 'paciente';
            checkDoctor.mockReturnValueOnce(false);
            checkAdmin.mockReturnValueOnce(false);

            await patientController.updateMedicalData(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    // ============= getDialysisHistory =============
    describe('getDialysisHistory', () => {
        beforeEach(() => {
            mockReq.params.id = '100';
        });

        it('deve retornar histórico de diálise', async () => {
            mockReq.user = { tipo: 'admin' };
            mockDbQuery
                .mockResolvedValueOnce({ rows: [{ id: 100 }] })
                .mockResolvedValueOnce({ 
                    rows: [
                        { data: '2025-01-01', tipo: 'Sessão 1' },
                        { data: '2025-01-02', tipo: 'Sessão 2' }
                    ] 
                });

            await patientController.getDialysisHistory(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    dialysisHistory: expect.arrayContaining([
                        expect.objectContaining({ tipo: 'Sessão 1' })
                    ])
                })
            );
        });

        it('deve retornar 404 se paciente não existir', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getDialysisHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar 403 se não tiver permissão', async () => {
            mockReq.user = { id: 999, tipo: 'paciente' };
            mockDbQuery.mockResolvedValueOnce({ 
                rows: [{ id: 100, usuario_id: 1 }] 
            });

            await patientController.getDialysisHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    // ============= assignDoctor =============
    describe('assignDoctor', () => {
        beforeEach(() => {
            mockReq.params.id = '100';
            mockReq.body = { medico_id: 5 };
        });

        it('deve atribuir médico ao paciente', async () => {
            mockReq.user = { tipo: 'admin' };
            checkAdmin.mockReturnValueOnce(true);
            mockDbQuery.mockResolvedValueOnce({});

            await patientController.assignDoctor(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE pacientes SET medico_id'),
                [5, '100']
            );
            expect(mockRes.json).toHaveBeenCalledWith({ 
                message: 'Médico responsável atualizado com sucesso' 
            });
        });

        it('deve retornar 403 se não for admin', async () => {
            mockReq.user.tipo = 'medico';
            checkAdmin.mockReturnValueOnce(false);

            await patientController.assignDoctor(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockReq.user.tipo = 'admin';
            checkAdmin.mockReturnValueOnce(true);
            mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

            await patientController.assignDoctor(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});