// tests/integration/patientController.integration.test.js

jest.mock('../../src/config/database', () => ({
    query: jest.fn(),
    pool: { end: jest.fn() }
}));

jest.mock('../../src/middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { 
            id: 1, 
            nome: 'Usuário Teste', 
            tipo_usuario: 'paciente',
            tipo: 'paciente'
        };
        next();
    },
    authorizeRole: (roles) => (req, res, next) => {
        if (roles.includes(req.user.tipo_usuario)) {
            next();
        } else {
            res.status(403).json({ error: 'Acesso negado' });
        }
    },
    checkAdmin: jest.fn((user) => user?.tipo === 'admin'),
    checkDoctor: jest.fn((user) => user?.tipo === 'medico')
}));

const db = require('../../src/config/database');
const request = require('supertest');
const app = require('../../server');
const { checkAdmin, checkDoctor } = require('../../src/middleware/auth');

describe('Patient Routes - Testes de Integração Completos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mocks
        checkAdmin.mockImplementation((user) => user?.tipo === 'admin');
        checkDoctor.mockImplementation((user) => user?.tipo === 'medico');
    });

    // ============= GET /api/patients/profile =============
    describe('GET /api/patients/profile', () => {
        it('deve retornar perfil completo do paciente', async () => {
            const dataInicio = new Date();
            dataInicio.setDate(dataInicio.getDate() - 15);

            db.query.mockResolvedValueOnce({
                rows: [{
                    usuario_id: 1,
                    nome: 'João Silva',
                    email: 'joao@test.com',
                    tipo_usuario: 'paciente',
                    paciente_id: 100,
                    cpf: '12345678900',
                    data_nascimento: '1990-01-01',
                    telefone: '11999999999',
                    data_inicio_tratamento: dataInicio.toISOString().split('T')[0],
                    idade: 35,
                    nome_medico: 'Dr. Silva',
                    email_medico: 'drsilva@test.com'
                }]
            });

            const res = await request(app).get('/api/patients/profile');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('patient');
            expect(res.body.patient.nome).toBe('João Silva');
            expect(res.body.patient.dias_tratamento).toBeGreaterThanOrEqual(14);
        });

        it('deve retornar 404 se paciente não for encontrado', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/patients/profile');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Paciente não encontrado');
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            db.query.mockRejectedValueOnce(new Error('DB Error'));

            const res = await request(app).get('/api/patients/profile');

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Erro ao buscar perfil do paciente');
        });
    });

    // ============= GET /api/patients/stats =============
    describe('GET /api/patients/stats', () => {
        it('deve retornar estatísticas detalhadas do paciente', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 100 }] })
                .mockResolvedValueOnce({
                    rows: [{
                        total_registros: '25',
                        media_sistolica: 125.5,
                        media_diastolica: 82.3,
                        min_sistolica: 110,
                        max_sistolica: 140,
                        min_diastolica: 75,
                        max_diastolica: 90,
                        media_uf: 1600,
                        media_glicose: 105,
                        media_tempo: 240,
                        primeira_sessao: '2025-01-01',
                        ultima_sessao: '2025-01-30'
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [{
                        pressao_arterial_sistolica: 128,
                        pressao_arterial_diastolica: 84,
                        uf_total: 1700,
                        concentracao_glicose: 108,
                        tempo_permanencia: 240,
                        data_registro: '2025-01-30'
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [
                        { period: 'recent', avg_sistolica: 130, avg_diastolica: 83, avg_uf: 1650, avg_glicose: 107 },
                        { period: 'previous', avg_sistolica: 120, avg_diastolica: 80, avg_uf: 1550, avg_glicose: 103 }
                    ]
                });

            const res = await request(app).get('/api/patients/stats?days=30');

            expect(res.status).toBe(200);
            expect(res.body.summary.total_registros).toBe(25);
            expect(res.body.summary.dias_periodo).toBe(30);
            expect(res.body.current.pressao_arterial.sistolica).toBe(128);
            expect(res.body.averages.pressao_sistolica.value).toBe(126);
            expect(res.body.averages.pressao_sistolica.trend).toBe('up');
        });

        it('deve usar dias padrão quando não especificado', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 100 }] })
                .mockResolvedValueOnce({ rows: [{ total_registros: '10' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/patients/stats');

            expect(res.status).toBe(200);
        });

        it('deve retornar 404 se paciente não for encontrado', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/patients/stats');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Paciente não encontrado');
        });
    });

    // ============= GET /api/patients (Admin routes) =============
    describe('GET /api/patients', () => {
        beforeEach(() => {
            // Mock para admin
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 1, tipo: 'admin', tipo_usuario: 'admin' };
                next();
            };
        });

        afterEach(() => {
            // Restaurar mock padrão
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 1, tipo: 'paciente', tipo_usuario: 'paciente' };
                next();
            };
        });

        it('deve retornar lista de pacientes para admin', async () => {
            checkAdmin.mockReturnValueOnce(true);
            
            db.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, nome: 'Paciente 1', ativo: true },
                    { id: 2, nome: 'Paciente 2', ativo: true }
                ]
            });

            const res = await request(app).get('/api/patients');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('deve aplicar paginação corretamente', async () => {
            checkAdmin.mockReturnValueOnce(true);
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/patients?page=2&limit=10');

            expect(res.status).toBe(200);
        });
    });

    // ============= POST /api/patients =============
    describe('POST /api/patients', () => {
        it('deve criar paciente com sucesso', async () => {
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 1, tipo: 'admin', tipo_usuario: 'admin' };
                next();
            };

            checkAdmin.mockReturnValueOnce(true);

            const bcrypt = require('bcrypt');
            bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

            db.query
                .mockResolvedValueOnce({ rows: [{ id: 10 }] })
                .mockResolvedValueOnce({});

            const res = await request(app)
                .post('/api/patients')
                .send({
                    nome: 'Novo Paciente',
                    email: 'novo@test.com',
                    senha: 'senha123',
                    convenio: 'Plano Saúde',
                    medico_id: 5
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Paciente criado com sucesso');
        });

        it('deve retornar 400 se dados obrigatórios ausentes', async () => {
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 1, tipo: 'admin', tipo_usuario: 'admin' };
                next();
            };

            checkAdmin.mockReturnValueOnce(true);

            const res = await request(app)
                .post('/api/patients')
                .send({ nome: 'Paciente Incompleto' });

            expect(res.status).toBe(400);
        });
    });

    // ============= GET /api/patients/:id =============
    describe('GET /api/patients/:id', () => {
        it('deve retornar paciente com detalhes completos', async () => {
            db.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 100,
                        nome: 'Paciente Detalhado',
                        usuario_id: 1,
                        ativo: true
                    }]
                })
                .mockResolvedValueOnce({ rows: [{ data: '2025-01-01', evento: 'Consulta' }] })
                .mockResolvedValueOnce({ rows: [{ nome: 'Remédio A', dose: '10mg' }] })
                .mockResolvedValueOnce({ rows: [{ tipo: 'Exame', data: '2025-02-01' }] });

            const res = await request(app).get('/api/patients/100');

            expect(res.status).toBe(200);
            expect(res.body.nome).toBe('Paciente Detalhado');
        });

        it('deve retornar 404 se paciente não existir', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/patients/999');

            expect(res.status).toBe(404);
        });

        it('deve retornar 403 se não tiver permissão', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ id: 100, usuario_id: 999 }]
            });

            const res = await request(app).get('/api/patients/100');

            expect(res.status).toBe(403);
        });
    });

    // ============= PUT /api/patients/:id =============
    describe('PUT /api/patients/:id', () => {
        // it.skip('deve atualizar paciente com sucesso', async () => {
        //     require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
        //         req.user = { id: 5, tipo: 'medico', tipo_usuario: 'medico' };
        //         next();
        //     };

        //     db.query
        //         .mockResolvedValueOnce({
        //             rows: [{
        //                 id: 100,
        //                 usuario_id: 10,
        //                 medico_id: 5,
        //                 ativo: true
        //             }]
        //         })
        //         .mockResolvedValueOnce({})
        //         .mockResolvedValueOnce({});

        //     const res = await request(app)
        //         .put('/api/patients/100')
        //         .send({
        //             nome: 'Paciente Atualizado',
        //             email: 'atualizado@test.com',
        //             convenio: 'Novo Plano'
        //         });

        //     expect(res.status).toBe(200);
        // });

        it('deve retornar 404 se paciente não existir', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).put('/api/patients/999').send({});

            expect(res.status).toBe(404);
        });
    });

    // ============= GET /api/patients/:id/medical-data =============
    describe('GET /api/patients/:id/medical-data', () => {
        it('deve retornar dados médicos completos', async () => {
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 5, tipo: 'medico', tipo_usuario: 'medico' };
                next();
            };

            checkDoctor.mockReturnValueOnce(true);

            db.query
                .mockResolvedValueOnce({ rows: [{ observacoes: 'Paciente com boa evolução' }] })
                .mockResolvedValueOnce({ rows: [{ data: '2025-01-01', peso: 70 }] })
                .mockResolvedValueOnce({ rows: [{ data: '2025-01-01', pressao: '120/80' }] });

            const res = await request(app).get('/api/patients/100/medical-data');

            expect(res.status).toBe(200);
            expect(res.body.medicalData.observacoes).toBe('Paciente com boa evolução');
        });
    });

    // ============= PUT /api/patients/:id/medical-data =============
    describe('PUT /api/patients/:id/medical-data', () => {
        it('deve atualizar dados médicos e medicações', async () => {
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 5, tipo: 'medico', tipo_usuario: 'medico' };
                next();
            };

            checkDoctor.mockReturnValueOnce(true);

            db.query
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});

            const res = await request(app)
                .put('/api/patients/100/medical-data')
                .send({
                    observacoes: 'Nova observação',
                    medicacoes: [
                        { nome: 'Remédio A', dose: '10mg' },
                        { nome: 'Remédio B', dose: '20mg' }
                    ]
                });

            expect(res.status).toBe(200);
        });
    });

    // ============= GET /api/patients/:id/dialysis-history =============
    describe('GET /api/patients/:id/dialysis-history', () => {
        it('deve retornar histórico de diálise', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 100, usuario_id: 1, ativo: true }] })
                .mockResolvedValueOnce({
                    rows: [
                        { data: '2025-01-01', tipo: 'Sessão Normal', duracao: 240 },
                        { data: '2025-01-03', tipo: 'Sessão Normal', duracao: 240 }
                    ]
                });

            const res = await request(app).get('/api/patients/100/dialysis-history');

            expect(res.status).toBe(200);
            expect(res.body.dialysisHistory).toHaveLength(2);
        });

        it('deve retornar 404 se paciente não existir', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/patients/999/dialysis-history');

            expect(res.status).toBe(404);
        });

        it('deve retornar 403 se não tiver permissão', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 100, usuario_id: 999 }] });

            const res = await request(app).get('/api/patients/100/dialysis-history');

            expect(res.status).toBe(403);
        });
    });

    // ============= PUT /api/patients/:id/assign-doctor =============
    describe('PUT /api/patients/:id/assign-doctor', () => {
        it('deve atribuir médico ao paciente', async () => {
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 1, tipo: 'admin', tipo_usuario: 'admin' };
                next();
            };

            checkAdmin.mockReturnValueOnce(true);
            db.query.mockResolvedValueOnce({});

            const res = await request(app)
                .put('/api/patients/100/assign-doctor')
                .send({ medico_id: 5 });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Médico responsável atualizado com sucesso');
        });

        it('deve retornar 500 em caso de erro', async () => {
            require('../../src/middleware/auth').authenticateToken = (req, res, next) => {
                req.user = { id: 1, tipo: 'admin', tipo_usuario: 'admin' };
                next();
            };

            checkAdmin.mockReturnValueOnce(true);
            db.query.mockRejectedValueOnce(new Error('DB Error'));

            const res = await request(app)
                .put('/api/patients/100/assign-doctor')
                .send({ medico_id: 5 });

            expect(res.status).toBe(500);
        });
    });
});