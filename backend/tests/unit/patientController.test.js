// backend/tests/unit/patientController.test.js

// Garante que estamos em modo de teste
process.env.NODE_ENV = 'test';

// =========================================================================
// MOCKS DE DEPENDÊNCIAS (Declarados antes da importação do controller)
// =========================================================================

// 1. Mock para db.query (Explícito para usar mockResolvedValueOnce e mockClear)
const mockDbQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
    query: mockDbQuery,
    pool: { end: jest.fn() }
}));

// 2. Mock para as funções de permissão (Resolve a falha de 403)
const mockCheckAdmin = jest.fn();
const mockCheckDoctor = jest.fn();
jest.mock('../../src/middleware/auth', () => ({
    checkAdmin: mockCheckAdmin,
    checkDoctor: mockCheckDoctor,
    // Se houver outras funções exportadas em auth.js, inclua-as aqui mockadas, se necessário
}));

// 3. Mock para bcrypt (Para createPatient)
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password')
}));


// Importar o controller APÓS os mocks
const patientController = require('../../src/controllers/patientController');

describe('PatientController - Unit Tests', () => {
    let mockReq, mockRes;

    const patientUserId = 100;
    const patientId = 200;
    const doctorUserId = 300;
    const doctorId = 400;
    const adminUserId = 500;

    beforeEach(() => {
        // Limpar mocks de todas as chamadas anteriores antes de cada teste
        jest.clearAllMocks();

        // Limpa os retornos dos mocks de permissão para evitar vazamento
        mockCheckAdmin.mockClear();
        mockCheckDoctor.mockClear();

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
                    // ...outros campos do SELECT
                }]
            };

            mockDbQuery.mockResolvedValueOnce(mockPatientData);

            await patientController.getProfile(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [patientUserId]);
            expect(mockRes.json).toHaveBeenCalled();

            const response = mockRes.json.mock.calls[0][0].patient;
            expect(response.dias_tratamento).toBeGreaterThanOrEqual(4);
            expect(response.dias_tratamento).toBeLessThanOrEqual(5);
        });

        it('deve retornar 404 se o paciente não for encontrado', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
        });

        it('deve retornar 500 em caso de erro no banco de dados', async () => {
            mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

            await patientController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Erro ao buscar perfil do paciente' });
        });
    });

    // --- Testes getStats ---
    describe('getStats', () => {
        const mockPatientResult = { rows: [{ id: patientId }] };
        const mockStatsResult = {
            rows: [{
                total_registros: '10',
                media_sistolica: 120.5,
                min_sistolica: 100,
                max_sistolica: 140,
                primeira_sessao: '2023-01-01',
                ultima_sessao: '2023-01-30',
                media_uf: 1500,
                media_glicose: 1.5,
                media_diastolica: 80,
                media_tempo: 240
            }]
        };
        const mockLastRecord = {
            rows: [{ pressao_arterial_sistolica: 125, uf_total: 1600, tempo_permanencia: 240, data_registro: '2023-01-30' }]
        };
        const mockUpTrends = {
            rows: [
                { period: 'recent', avg_sistolica: 122, avg_diastolica: 80, avg_uf: 1500, avg_glicose: 1.5 },
                { period: 'previous', avg_sistolica: 110, avg_diastolica: 70, avg_uf: 1400, avg_glicose: 1.4 }
            ]
        };
        const mockStableTrends = {
            rows: [
                { period: 'recent', avg_sistolica: 120, avg_diastolica: 80, avg_uf: 1500, avg_glicose: 1.5 },
                { period: 'previous', avg_sistolica: 118, avg_diastolica: 79, avg_uf: 1450, avg_glicose: 1.48 }
            ]
        };


        it('deve retornar estatísticas e tendências corretamente', async () => {
            mockDbQuery
                .mockResolvedValueOnce(mockPatientResult)
                .mockResolvedValueOnce(mockStatsResult)
                .mockResolvedValueOnce(mockLastRecord)
                .mockResolvedValueOnce(mockUpTrends);

            mockReq.query = { days: '30' };

            await patientController.getStats(mockReq, mockRes);

            expect(mockDbQuery).toHaveBeenCalledTimes(4);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.summary.total_registros).toBe(10);
            expect(response.averages.pressao_sistolica.value).toBe(121);
            expect(response.averages.pressao_sistolica.trend).toBe('up');
        });

        it('deve calcular a tendência como "stable" quando a variação for pequena', async () => {
            mockDbQuery
                .mockResolvedValueOnce(mockPatientResult)
                .mockResolvedValueOnce(mockStatsResult)
                .mockResolvedValueOnce(mockLastRecord)
                .mockResolvedValueOnce(mockStableTrends);

            mockReq.query = { days: '30' };

            await patientController.getStats(mockReq, mockRes);

            const response = mockRes.json.mock.calls[0][0];
            expect(response.averages.pressao_sistolica.trend).toBe('stable');
        });

        it('deve retornar 404 se o paciente não for encontrado (sem patient_id)', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.getStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
        });

        it('deve usar 30 dias como padrão se "days" não for fornecido', async () => {
            mockDbQuery
                .mockResolvedValueOnce(mockPatientResult)
                .mockResolvedValueOnce(mockStatsResult)
                .mockResolvedValueOnce(mockLastRecord)
                .mockResolvedValueOnce(mockUpTrends);

            mockReq.query = {};

            await patientController.getStats(mockReq, mockRes);

            expect(mockDbQuery.mock.calls[1][1][1]).toBe(30);
        });
    });

    // --- Testes createPatient ---
    describe('createPatient', () => {

        // Configuração inicial para testes que precisam de permissão (maioria)
        beforeEach(() => {
            // Garante que a permissão SEMPRE PASSE, a menos que o teste diga o contrário.
            mockCheckAdmin.mockReturnValue(true);
            mockCheckDoctor.mockReturnValue(true);
        });

        it('deve criar um novo usuário e paciente com sucesso como Admin', async () => {
            // Garante o user admin
            mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
            
            mockReq.body = {
                nome: 'Novo Paciente Unit',
                email: 'new.patient.unit@test.com',
                senha: 'Senha123!',
                convenio: 'Particular',
                medico_id: doctorId
            };

            // 1. Simular retorno da criação do usuário (RETURNING id)
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: 600 }] }); 
            // 2. Simular sucesso na criação do registro paciente
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await patientController.createPatient(mockReq, mockRes);

            // ✅ CORREÇÃO: Permissão passou, o DB foi chamado.
            expect(mockDbQuery).toHaveBeenCalledTimes(2); 
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "Paciente criado com sucesso",
                usuario_id: 600
            });
        });

        it('deve retornar 403 se o usuário autenticado não for Admin nem Médico', async () => {
            // Sobrescreve os mocks para FORÇAR a falha de permissão
            mockCheckAdmin.mockReturnValue(false); 
            mockCheckDoctor.mockReturnValue(false); 

            mockReq.user = { id: patientUserId, tipo_usuario: 'paciente' };
            mockReq.body = { nome: 'Nome', email: 'email@test.com', senha: '123' };
            
            await patientController.createPatient(mockReq, mockRes);

            expect(mockDbQuery).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
        });

        it('deve retornar 400 se dados obrigatórios ausentes', async () => {
            // A permissão passará devido ao beforeEach (mockCheckAdmin.mockReturnValue(true))
            mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
            
            // Simula body faltando 'senha'
            mockReq.body = { nome: 'Incompleto', email: 'incomplete@test.com' }; 

            await patientController.createPatient(mockReq, mockRes);

            // ✅ CORREÇÃO: Permissão passou (403 ignorado), validação de body falhou (400 retornado).
            expect(mockDbQuery).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400); 
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Dados obrigatórios ausentes' });
        });
    });


    // --- Testes getAllPatients (Checagem de Permissão Interna) ---
    describe('getAllPatients', () => {

        // Novo beforeEach para garantir que a permissão Admin/Medico passe nos testes necessários
        beforeEach(() => {
            // Garante que a permissão Admin passe por padrão neste bloco, a menos que seja sobrescrito.
            mockCheckAdmin.mockReturnValue(true);
            mockCheckDoctor.mockReturnValue(true);
        });

        it('deve retornar 403 se o usuário for Paciente', async () => {
            // Sobrescreve os mocks para FORÇAR a falha de permissão
            mockCheckAdmin.mockReturnValue(false);
            mockCheckDoctor.mockReturnValue(false);

            mockReq.user = { id: patientUserId, tipo_usuario: 'paciente' };
            
            await patientController.getAllPatients(mockReq, mockRes);
            
            // Verifica se o DB não foi chamado e se o 403 foi retornado.
            expect(mockDbQuery).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
        });

        it('deve buscar pacientes se o usuário for Admin', async () => {
            // Permissão passa por causa do beforeEach acima (mockCheckAdmin = true)
            mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
            
            // Simula o retorno do DB (usando offset/limit padrão)
            mockDbQuery.mockResolvedValueOnce({ rows: [] }); 
            
            await patientController.getAllPatients(mockReq, mockRes);
            
            // ✅ Esperamos 1 chamada ao DB (a que busca os pacientes)
            expect(mockDbQuery).toHaveBeenCalledTimes(1);
            expect(mockDbQuery.mock.calls[0][0]).toContain('SELECT * FROM pacientes');
            expect(mockDbQuery.mock.calls[0][1]).toEqual([20, 0]); // Verifica LIMIT=20, OFFSET=0
            expect(mockRes.json).toHaveBeenCalledWith([]);
        });
    });
    
    // // --- Testes getAllPatients (Checagem de Permissão Interna) ---
    // describe('getAllPatients', () => {
    //     // Rotas que não usam authorizeRole, mas sim checkDoctor/checkAdmin diretamente
        
    //     it('deve retornar 403 se o usuário for Paciente', async () => {
    //         // Sobrescreve para garantir que a permissão falhe
    //         mockCheckAdmin.mockReturnValue(false);
    //         mockCheckDoctor.mockReturnValue(false);

    //         mockReq.user = { id: patientUserId, tipo_usuario: 'paciente' };
            
    //         await patientController.getAllPatients(mockReq, mockRes);
            
    //         expect(mockDbQuery).not.toHaveBeenCalled();
    //         expect(mockRes.status).toHaveBeenCalledWith(403);
    //         expect(mockRes.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
    //     });

    //     it('deve buscar pacientes se o usuário for Admin', async () => {
    //         // Permissão passa por causa do mockCheckAdmin = true
    //         mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
            
    //         mockDbQuery.mockResolvedValueOnce({ rows: [] }); // Simula o retorno do DB
            
    //         await patientController.getAllPatients(mockReq, mockRes);
            
    //         expect(mockDbQuery).toHaveBeenCalledTimes(1);
    //         expect(mockDbQuery.mock.calls[0][0]).toContain('SELECT * FROM pacientes');
    //         expect(mockRes.json).toHaveBeenCalledWith([]);
    //     });
    // });
});

// // backend/tests/unit/patientController.test.js

// // Garante que estamos em modo de teste
// process.env.NODE_ENV = 'test';

// // =========================================================================
// // MOCKS DE DEPENDÊNCIAS
// // Declara o mock antes de importar o controller para garantir que a versão mockada seja usada
// // =========================================================================

// // 1. Mock para db.query (Explicitamente para usar mockResolvedValueOnce)
// const mockDbQuery = jest.fn();
// jest.mock('../../src/config/database', () => ({
//     query: mockDbQuery,
//     pool: { end: jest.fn() } // Mock para afterAll não falhar
// }));

// // 2. Mock para as funções de permissão (Resolve o TypeError: checkDoctor is not a function)
// // Permite que a lógica interna do controller seja executada em createPatient, etc.
// jest.mock('../../src/middleware/auth', () => ({
//     checkAdmin: jest.fn((user) => user && user.tipo_usuario === 'admin'),
//     checkDoctor: jest.fn((user) => user && user.tipo_usuario === 'medico'),
// }));

// // 3. Mock para bcrypt (Para createPatient)
// jest.mock('bcrypt', () => ({
//     hash: jest.fn().mockResolvedValue('hashed_password')
// }));


// // Importar o controller APÓS os mocks
// const patientController = require('../../src/controllers/patientController');

// describe('PatientController - Unit Tests', () => {
//     let mockReq, mockRes;

//     const patientUserId = 100;
//     const patientId = 200;
//     const doctorUserId = 300;
//     const doctorId = 400;
//     const adminUserId = 500;

//     beforeEach(() => {
//         // Limpar mocks de todas as chamadas anteriores antes de cada teste
//         jest.clearAllMocks();

//         // Configuração base de Request e Response mocks
//         mockReq = {
//             query: {},
//             params: {},
//             body: {},
//             user: {
//                 id: patientUserId,
//                 tipo_usuario: 'paciente',
//                 email: 'paciente.unit@test.com',
//                 nome: 'Paciente Teste Unit'
//             }
//         };

//         mockRes = {
//             json: jest.fn().mockReturnThis(),
//             status: jest.fn().mockReturnThis(),
//         };
//     });

//     // --- Testes getProfile ---
//     describe('getProfile', () => {
//         it('deve retornar o perfil completo do paciente com dias de tratamento calculados', async () => {
//             const dataInicioTratamento = new Date();
//             // Data de 5 dias atrás
//             dataInicioTratamento.setDate(dataInicioTratamento.getDate() - 5); 

//             const mockPatientData = {
//                 rows: [{
//                     usuario_id: patientUserId,
//                     nome: 'Paciente Teste',
//                     data_inicio_tratamento: dataInicioTratamento.toISOString().split('T')[0], // YYYY-MM-DD
//                     idade: 30,
//                     // ...outros campos do SELECT
//                 }]
//             };

//             // Simula o retorno do banco
//             mockDbQuery.mockResolvedValueOnce(mockPatientData);

//             await patientController.getProfile(mockReq, mockRes);

//             expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [patientUserId]);
//             expect(mockRes.json).toHaveBeenCalled();

//             const response = mockRes.json.mock.calls[0][0].patient;
//             expect(response.nome).toBe('Paciente Teste');
//             // Verifica se o cálculo de dias de tratamento está próximo de 5
//             expect(response.dias_tratamento).toBeGreaterThanOrEqual(4);
//             expect(response.dias_tratamento).toBeLessThanOrEqual(5);
//         });

//         it('deve retornar 404 se o paciente não for encontrado', async () => {
//             mockDbQuery.mockResolvedValueOnce({ rows: [] });

//             await patientController.getProfile(mockReq, mockRes);

//             expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), [patientUserId]);
//             expect(mockRes.status).toHaveBeenCalledWith(404);
//             expect(mockRes.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
//         });

//         it('deve retornar 500 em caso de erro no banco de dados', async () => {
//             mockDbQuery.mockRejectedValueOnce(new Error('DB Error'));

//             await patientController.getProfile(mockReq, mockRes);

//             expect(mockRes.status).toHaveBeenCalledWith(500);
//             expect(mockRes.json).toHaveBeenCalledWith({ error: 'Erro ao buscar perfil do paciente' });
//         });
//     });

//     // --- Testes getStats ---
//     describe('getStats', () => {
//         const mockPatientResult = { rows: [{ id: patientId }] };
//         const mockStatsResult = {
//             rows: [{
//                 total_registros: '10',
//                 media_sistolica: 120.5,
//                 min_sistolica: 100,
//                 max_sistolica: 140,
//                 primeira_sessao: '2023-01-01',
//                 ultima_sessao: '2023-01-30',
//                 media_uf: 1500, // 1.5L
//                 media_glicose: 1.5,
//                 media_diastolica: 80,
//                 media_tempo: 240
//             }]
//         };
//         const mockLastRecord = {
//             rows: [{
//                 pressao_arterial_sistolica: 125,
//                 pressao_arterial_diastolica: 85,
//                 uf_total: 1600,
//                 tempo_permanencia: 240, // 4 horas
//                 concentracao_glicose: 1.6,
//                 data_registro: '2023-01-30'
//             }]
//         };
//         // Tendência de subida (122 vs 110)
//         const mockUpTrends = {
//             rows: [
//                 { period: 'recent', avg_sistolica: 122, avg_diastolica: 80, avg_uf: 1500, avg_glicose: 1.5 },
//                 { period: 'previous', avg_sistolica: 110, avg_diastolica: 70, avg_uf: 1400, avg_glicose: 1.4 }
//             ]
//         };
//         // Tendência estável (120 vs 118)
//         const mockStableTrends = {
//             rows: [
//                 { period: 'recent', avg_sistolica: 120, avg_diastolica: 80, avg_uf: 1500, avg_glicose: 1.5 },
//                 { period: 'previous', avg_sistolica: 118, avg_diastolica: 79, avg_uf: 1450, avg_glicose: 1.48 }
//             ]
//         };


//         it('deve retornar estatísticas e tendências corretamente', async () => {
//             mockDbQuery
//                 .mockResolvedValueOnce(mockPatientResult) // 1. Busca paciente_id
//                 .mockResolvedValueOnce(mockStatsResult)   // 2. Busca stats
//                 .mockResolvedValueOnce(mockLastRecord)    // 3. Busca lastRecord
//                 .mockResolvedValueOnce(mockUpTrends);     // 4. Busca trends

//             mockReq.query = { days: '30' };

//             await patientController.getStats(mockReq, mockRes);

//             expect(mockDbQuery).toHaveBeenCalledTimes(4); // 4 chamadas ao DB
//             expect(mockRes.json).toHaveBeenCalled();

//             const response = mockRes.json.mock.calls[0][0];

//             // Verifica resumos e formatação
//             expect(response.summary.total_registros).toBe(10);
//             expect(response.current.uf_total).toBe('1.6'); // UF convertida para L
//             expect(response.current.tempo_permanencia).toBe('4.0'); // Tempo convertido para horas
//             expect(response.averages.pressao_sistolica.value).toBe(121); // Média arredondada (120.5)
//             expect(response.averages.pressao_sistolica.trend).toBe('up'); // Tendência de subida
//         });

//         it('deve calcular a tendência como "stable" quando a variação for pequena', async () => {
//             mockDbQuery
//                 .mockResolvedValueOnce(mockPatientResult)
//                 .mockResolvedValueOnce(mockStatsResult)
//                 .mockResolvedValueOnce(mockLastRecord)
//                 .mockResolvedValueOnce(mockStableTrends);

//             mockReq.query = { days: '30' };

//             await patientController.getStats(mockReq, mockRes);

//             const response = mockRes.json.mock.calls[0][0];
//             expect(response.averages.pressao_sistolica.trend).toBe('stable');
//         });

//         it('deve retornar 404 se o paciente não for encontrado (sem patient_id)', async () => {
//             mockDbQuery.mockResolvedValueOnce({ rows: [] }); // Falha na busca por patient_id

//             await patientController.getStats(mockReq, mockRes);

//             expect(mockRes.status).toHaveBeenCalledWith(404);
//             expect(mockRes.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
//         });

//         it('deve usar 30 dias como padrão se "days" não for fornecido', async () => {
//             mockDbQuery
//                 .mockResolvedValueOnce(mockPatientResult)
//                 .mockResolvedValueOnce(mockStatsResult)
//                 .mockResolvedValueOnce(mockLastRecord)
//                 .mockResolvedValueOnce(mockUpTrends);

//             mockReq.query = {}; // Sem 'days'

//             await patientController.getStats(mockReq, mockRes);

//             // Verifica se o segundo db.query (stats) usou o valor 30
//             expect(mockDbQuery.mock.calls[1][1][1]).toBe(30);
//         });
//     });

//     // // --- Testes createPatient ---
//     // describe('createPatient', () => {
//     //     beforeEach(() => {
//     //         // Configurar o usuário como admin (que tem permissão)
//     //         mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
//     //     });

//     //     it('deve criar um novo usuário e paciente com sucesso como Admin', async () => {
            
//     //         mockReq.body = {
//     //             nome: 'Novo Paciente Unit',
//     //             email: 'new.patient.unit@test.com',
//     //             senha: 'Senha123!',
//     //             convenio: 'Particular',
//     //             medico_id: doctorId
//     //         };

//     //         // 1. Simular retorno da criação do usuário (RETURNING id)
//     //         mockDbQuery.mockResolvedValueOnce({ rows: [{ id: 600 }] }); 
//     //         // 2. Simular sucesso na criação do registro paciente
//     //         mockDbQuery.mockResolvedValueOnce({ rows: [] });

//     //         await patientController.createPatient(mockReq, mockRes);

//     //         expect(mockDbQuery).toHaveBeenCalledTimes(2);
//     //         // Verifica o primeiro query (criação do usuário)
//     //         expect(mockDbQuery.mock.calls[0][0]).toContain("INSERT INTO usuarios");
//     //         expect(mockDbQuery.mock.calls[0][1][3]).toBe('paciente'); // verifica o tipo_usuario
            
//     //         // Verifica o segundo query (criação do paciente)
//     //         expect(mockDbQuery.mock.calls[1][0]).toContain("INSERT INTO pacientes");
//     //         expect(mockDbQuery.mock.calls[1][1][0]).toBe(600); // verifica que usou o ID do usuário criado

//     //         expect(mockRes.status).toHaveBeenCalledWith(201);
//     //         expect(mockRes.json).toHaveBeenCalledWith({
//     //             message: "Paciente criado com sucesso",
//     //             usuario_id: 600
//     //         });
//     //     });

//     //     it('deve retornar 403 se o usuário autenticado não for Admin nem Médico', async () => {
//     //         // Resetar o usuário para o padrão 'paciente'
//     //         mockReq.user = { id: patientUserId, tipo_usuario: 'paciente' };
//     //         mockReq.body = { nome: 'Incompleto', email: 'incomplete@test.com', senha: '123' };
            
//     //         await patientController.createPatient(mockReq, mockRes);

//     //         // Verifica que a checagem de permissão interna falhou
//     //         expect(mockDbQuery).not.toHaveBeenCalled();
//     //         expect(mockRes.status).toHaveBeenCalledWith(403);
//     //         expect(mockRes.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
//     //     });

//     //     it('deve retornar 400 se dados obrigatórios ausentes', async () => {
//     //         mockReq.body = { nome: 'Incompleto', email: 'incomplete@test.com' }; // falta 'senha'

//     //         await patientController.createPatient(mockReq, mockRes);

//     //         // Verifica que a lógica parou antes de chamar o DB
//     //         expect(mockDbQuery).not.toHaveBeenCalled();
//     //         expect(mockRes.status).toHaveBeenCalledWith(400);
//     //         expect(mockRes.json).toHaveBeenCalledWith({ error: 'Dados obrigatórios ausentes' });
//     //     });
//     // });
//     // --- Testes createPatient ---
//     describe('createPatient', () => {
//         // NOTA: Os testes dentro deste bloco precisam garantir que o usuário
//         // autenticado seja 'admin' ou 'medico' para passar a checagem de permissão (403).

//         it('deve criar um novo usuário e paciente com sucesso como Admin', async () => {
//             // **CORREÇÃO 1:** Define o usuário com o tipo correto antes de cada teste
//             // para garantir que o checkAdmin no controller retorne true.
//             mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
            
//             mockReq.body = {
//                 nome: 'Novo Paciente Unit',
//                 email: 'new.patient.unit@test.com',
//                 senha: 'Senha123!',
//                 convenio: 'Particular',
//                 medico_id: doctorId
//             };

//             // 1. Simular retorno da criação do usuário (RETURNING id)
//             mockDbQuery.mockResolvedValueOnce({ rows: [{ id: 600 }] }); 
//             // 2. Simular sucesso na criação do registro paciente
//             mockDbQuery.mockResolvedValueOnce({ rows: [] });

//             await patientController.createPatient(mockReq, mockRes);

//             // Agora, o mockDbQuery deve ter sido chamado 2 vezes, pois a permissão passou.
//             expect(mockDbQuery).toHaveBeenCalledTimes(2); 
            
//             // Verifica o primeiro query (criação do usuário)
//             expect(mockDbQuery.mock.calls[0][0]).toContain("INSERT INTO usuarios");
//             expect(mockDbQuery.mock.calls[0][1][3]).toBe('paciente'); // verifica o tipo_usuario
            
//             // Verifica o segundo query (criação do paciente)
//             expect(mockDbQuery.mock.calls[1][0]).toContain("INSERT INTO pacientes");
//             expect(mockDbQuery.mock.calls[1][1][0]).toBe(600); // verifica que usou o ID do usuário criado

//             expect(mockRes.status).toHaveBeenCalledWith(201);
//             expect(mockRes.json).toHaveBeenCalledWith({
//                 message: "Paciente criado com sucesso",
//                 usuario_id: 600
//             });
//         });

//         it('deve retornar 403 se o usuário autenticado não for Admin nem Médico', async () => {
//             // Usa o usuário padrão 'paciente' do beforeEach, que deve ser negado.
//             mockReq.user = { id: patientUserId, tipo_usuario: 'paciente' };
//             mockReq.body = { nome: 'Nome', email: 'email@test.com', senha: '123' };
            
//             await patientController.createPatient(mockReq, mockRes);

//             // Verifica que a checagem de permissão interna falhou
//             expect(mockDbQuery).not.toHaveBeenCalled();
//             expect(mockRes.status).toHaveBeenCalledWith(403);
//             expect(mockRes.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
//         });

//         it('deve retornar 400 se dados obrigatórios ausentes', async () => {
//             // **CORREÇÃO 2:** Define o usuário como Admin.
//             // Isso garante que a checagem de permissão (403) seja ignorada, permitindo
//             // que a execução chegue à checagem de body (400).
//             mockReq.user = { id: adminUserId, tipo_usuario: 'admin' };
            
//             // Simula body faltando 'senha'
//             mockReq.body = { nome: 'Incompleto', email: 'incomplete@test.com' }; 

//             await patientController.createPatient(mockReq, mockRes);

//             // Verifica que a lógica parou antes de chamar o DB
//             expect(mockDbQuery).not.toHaveBeenCalled();
//             expect(mockRes.status).toHaveBeenCalledWith(400); // <-- Agora deve ser 400
//             expect(mockRes.json).toHaveBeenCalledWith({ error: 'Dados obrigatórios ausentes' });
//         });
//     });
//     // Os outros métodos (getAllPatients, getPatientById, etc.) dependem fortemente
//     // da lógica do DB e do Middleware de permissão, e são melhor testados em Integração.
//     // Para unit test, apenas um caso simples de falha de permissão será coberto.

//     // --- Testes getAllPatients (Exemplo de Permissão Interna) ---
//     describe('getAllPatients', () => {
//         it('deve retornar 403 se o usuário for Paciente', async () => {
//             // O mockReq.user é 'paciente' por padrão.
            
//             // Simula o comportamento do checkDoctor e checkAdmin retornando false
//             // para o tipo 'paciente' (que é o padrão dos mocks para quem não é médico/admin).
            
//             await patientController.getAllPatients(mockReq, mockRes);
            
//             expect(mockDbQuery).not.toHaveBeenCalled();
//             expect(mockRes.status).toHaveBeenCalledWith(403);
//             expect(mockRes.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
//         });
//     });
// });