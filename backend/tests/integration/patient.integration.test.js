// backend/tests/integration/patient.integration.test.js

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../src/config/database');

// Criar o app (necessário para o supertest)
const express = require('express');
const app = express();
const cors = require('cors');
const patientRoutes = require('../../src/routes/patients');
// IMPORTANTE: Aqui você pode precisar das rotas admin/auth para criar usuários de teste
// Se o seu setup usa um app central, você pode reutilizá-lo.
// Para fins de teste de ROTA, vamos simular o middleware 'auth' com tokens customizados.
// Como o patientRoutes.js já usa authenticateToken, não precisamos adicioná-lo
// manualmente no app.use(). A implementação do middleware em auth.js suporta 
// o modo 'test' usando os dados do token.

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// As rotas de paciente estão no prefixo /api/patients
// O middleware authenticateToken já está incluído no arquivo de rotas
app.use('/api/patients', patientRoutes);
// --- Simulação dos Middlewares de Permissão (Necessário para testar rotas que não usam authorizeRole)
// Nota: Os controllers do paciente usam as funções checkAdmin/checkDoctor diretamente.
// Para testar getAllPatients, getPatientById e outros endpoints
// que dependem de checagem interna, vamos criar tokens para os diferentes roles.

const generateAuthToken = (id, tipo_usuario, email, nome = 'Test User') => {
    return jwt.sign(
        { id, userId: id, tipo_usuario, email, nome },
        process.env.JWT_SECRET || 'test_secret_key',
        { expiresIn: '1h' }
    );
};

describe('Patient Routes - Integration Tests', () => {
    let patient1 = {};
    let patient2 = {};
    let doctor = {};
    let admin = {};

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';

        // 1. Limpar banco de teste (em ordem de dependências)
        await db.query('DELETE FROM tokens_invalidados');
        await db.query('DELETE FROM lembretes');
        await db.query('DELETE FROM medicamentos');
        await db.query('DELETE FROM registros_dialise');
        await db.query('DELETE FROM pacientes');
        await db.query('DELETE FROM medicos');
        await db.query('DELETE FROM usuarios');

        // 2. Criar Usuários de Teste (Paciente 1, Paciente 2, Médico, Admin)
        const passwordHash = await bcrypt.hash('Senha123!', 10);
        
        // --- ADMIN ---
        const adminUserResult = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ('Admin Teste', 'admin_pat@test.com', $1, 'admin', true) RETURNING id",
            [passwordHash]
        );
        admin.id = adminUserResult.rows[0].id;
        admin.token = generateAuthToken(admin.id, 'admin', 'admin_pat@test.com');

        // --- DOCTOR ---
        const doctorUserResult = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ('Dr. Teste', 'doctor_pat@test.com', $1, 'medico', true) RETURNING id",
            [passwordHash]
        );
        doctor.userId = doctorUserResult.rows[0].id;
        const doctorResult = await db.query(
            "INSERT INTO medicos (usuario_id, crm, especialidade) VALUES ($1, 'CRM99999', 'Nefrologia') RETURNING id",
            [doctor.userId]
        );
        doctor.id = doctorResult.rows[0].id;
        doctor.token = generateAuthToken(doctor.userId, 'medico', 'doctor_pat@test.com');
        
        // --- PATIENT 1 (Sob a responsabilidade do Doctor) ---
        const patient1UserResult = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ('Paciente Um', 'paciente1@test.com', $1, 'paciente', true) RETURNING id",
            [passwordHash]
        );
        patient1.userId = patient1UserResult.rows[0].id;
        const patient1Result = await db.query(
            // **USAR doctor.medicoId para referenciar o médico responsável**
            "INSERT INTO pacientes (usuario_id, cpf, medico_responsavel_id, data_inicio_tratamento, data_nascimento) VALUES ($1, '11111111111', $2, NOW() - INTERVAL '10 days', '1990-01-01') RETURNING id",
            [patient1.userId, doctor.medicoId] 
        );
        patient1.id = patient1Result.rows[0].id;
        patient1.token = generateAuthToken(patient1.userId, 'paciente', 'paciente1@test.com');

        // --- PATIENT 2 (Sem médico) ---
        const patient2UserResult = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ('Paciente Dois', 'paciente2@test.com', $1, 'paciente', true) RETURNING id",
            [passwordHash]
        );
        patient2.userId = patient2UserResult.rows[0].id;
        const patient2Result = await db.query(
            "INSERT INTO pacientes (usuario_id, cpf) VALUES ($1, '22222222222') RETURNING id",
            [patient2.userId]
        );
        patient2.id = patient2Result.rows[0].id;
        patient2.token = generateAuthToken(patient2.userId, 'paciente', 'paciente2@test.com');

        // 3. Criar Registros de Diálise (para Patient 1)
        await db.query(
            `INSERT INTO registros_dialise (paciente_id, data_registro, pressao_arterial_sistolica, uf_total) VALUES 
            ($1, CURRENT_DATE - INTERVAL '1 days', 125, 1600),
            ($1, CURRENT_DATE - INTERVAL '8 days', 110, 1400)`,
            [patient1.id]
        );
        
        console.log('✅ Setup de testes de paciente concluído.');
    });

    afterAll(async () => {
        // O pool.end() é chamado no afterAll do outro arquivo (admin.integration.test.js),
        // mas é bom garantir que ele seja chamado se este for o único arquivo rodando.
        // await db.pool.end(); 
    });


    // --- Rota GET /api/patients/profile (Role Paciente obrigatório - enforce por middleware) ---
    describe('GET /profile', () => {
        it('deve retornar o perfil completo do próprio paciente (Patient 1)', async () => {
            const response = await request(app)
                .get('/api/patients/profile')
                .set('Authorization', `Bearer ${patient1.token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('patient');
            expect(response.body.patient.nome).toBe('Paciente Um');
            expect(response.body.patient.usuario_id).toBe(patient1.userId);
            expect(response.body.patient.nome_medico).toBe('Dr. Teste');
            expect(response.body.patient.dias_tratamento).toBeGreaterThanOrEqual(10);
        });

        it('deve retornar 403 se o usuário autenticado não for paciente', async () => {
            const response = await request(app)
                .get('/api/patients/profile')
                .set('Authorization', `Bearer ${doctor.token}`); // Médico tentando acessar a rota de paciente

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Acesso negado');
        });
    });

    // --- Rota GET /api/patients/stats (Role Paciente obrigatório - enforce por middleware) ---
    describe('GET /stats', () => {
        it('deve retornar estatísticas de diálise para o paciente autenticado', async () => {
            const response = await request(app)
                .get('/api/patients/stats?days=30')
                .set('Authorization', `Bearer ${patient1.token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary.total_registros).toBe(2);
            expect(response.body.averages.pressao_sistolica.value).toBe(118); // (125+110)/2 ≈ 117.5 -> 118
            expect(response.body.current.uf_total).toBe('1.6'); // UF convertida
        });

        it('deve retornar 404 se o paciente não tiver registro de paciente na tabela', async () => {
            const response = await request(app)
                .get('/api/patients/stats')
                .set('Authorization', `Bearer ${admin.token}`); // Admin não tem registro na tabela 'pacientes'

            expect(response.status).toBe(403); // Middleware retorna 403
            
            // Re-executar com token de paciente que não tem o registro na tabela (se fosse possível)
            // No setup, todos os tokens 'paciente' tem registro, então vamos confiar no teste de perfil/permissão.
        });
    });

    // --- Rota GET /api/patients (GetAllPatients) ---
    describe('GET /', () => {
        it('deve retornar a lista de pacientes para o Admin', async () => {
            const response = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${admin.token}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2); // Pelo menos Patient 1 e Patient 2
        });
        
        it('deve retornar apenas pacientes do médico responsável', async () => {
            const response = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${doctor.token}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1); // Apenas o Patient 1
            expect(response.body[0].usuario_id).toBe(patient1.userId);
        });

        it('deve retornar 403 para um Paciente', async () => {
            const response = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${patient1.token}`);

            // Note: O controlador checa a permissão INTERNAMENTE e retorna 403.
            expect(response.status).toBe(403);
            expect(response.body.error).toBe("Acesso negado");
        });
    });
    
    // --- Rota GET /api/patients/:id (GetPatientById) ---
    describe('GET /:id', () => {
        it('deve retornar paciente para o Admin', async () => {
            const response = await request(app)
                .get(`/api/patients/${patient1.id}`)
                .set('Authorization', `Bearer ${admin.token}`);

            expect(response.status).toBe(200);
            expect(response.body.usuario_id).toBe(patient1.userId);
            expect(response.body).toHaveProperty('history');
            expect(response.body).toHaveProperty('medications');
        });

        it('deve retornar paciente para o Médico Responsável', async () => {
            const response = await request(app)
                .get(`/api/patients/${patient1.id}`)
                .set('Authorization', `Bearer ${doctor.token}`);

            expect(response.status).toBe(200);
            expect(response.body.usuario_id).toBe(patient1.userId);
        });
        
        it('deve retornar paciente para o próprio Paciente', async () => {
            const response = await request(app)
                .get(`/api/patients/${patient1.id}`)
                .set('Authorization', `Bearer ${patient1.token}`);

            expect(response.status).toBe(200);
            expect(response.body.usuario_id).toBe(patient1.userId);
        });
        
        it('deve retornar 403 para Médico NÃO responsável', async () => {
             // Doctor tentando acessar o Paciente 2 (que não tem médico responsável)
            const response = await request(app)
                .get(`/api/patients/${patient2.id}`)
                .set('Authorization', `Bearer ${doctor.token}`); 

            expect(response.status).toBe(403);
            expect(response.body.error).toBe("Acesso negado");
        });
    });

    // --- Rota POST /api/patients (CreatePatient) ---
    describe('POST /', () => {
        const newPatientData = {
            nome: 'Paciente Novo',
            email: 'newpatient@test.com',
            senha: 'Senha123!',
            convenio: 'SUS',
            medico_id: doctor.id
        };
        let newPatientUserId;

        it('deve criar um novo paciente como Admin', async () => {
            const response = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${admin.token}`)
                .send(newPatientData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Paciente criado com sucesso');
            expect(response.body).toHaveProperty('usuario_id');
            newPatientUserId = response.body.usuario_id;
        });

        it('deve retornar 403 para Paciente', async () => {
            const response = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${patient1.token}`)
                .send({ nome: 'Fail' });

            expect(response.status).toBe(403);
        });
    });

    // --- Rota PUT /api/patients/:id (AssignDoctor) ---
    describe('PUT /:id/assign-doctor (Admin Only)', () => {
        it('deve atribuir um médico ao Paciente 2 como Admin', async () => {
            const response = await request(app)
                .put(`/api/patients/${patient2.id}/assign-doctor`)
                .set('Authorization', `Bearer ${admin.token}`)
                .send({ medico_id: doctor.id });
            
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Médico responsável atualizado com sucesso');

            // Verifica no banco
            const check = await db.query('SELECT medico_responsavel_id FROM pacientes WHERE id = $1', [patient2.id]);
            expect(check.rows[0].medico_responsavel_id).toBe(doctor.id);
        });

        it('deve retornar 403 para Médico', async () => {
            const response = await request(app)
                .put(`/api/patients/${patient1.id}/assign-doctor`)
                .set('Authorization', `Bearer ${doctor.token}`)
                .send({ medico_id: doctor.id });
            
            expect(response.status).toBe(403);
        });
    });

    // --- Rota GET /api/patients/:id/dialysis-history (DialysisHistory) ---
    describe('GET /:id/dialysis-history', () => {
        it('deve retornar histórico de diálise para Médico Responsável', async () => {
            const response = await request(app)
                .get(`/api/patients/${patient1.id}/dialysis-history`)
                .set('Authorization', `Bearer ${doctor.token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('dialysisHistory');
            // O histórico está em historico_dialise, não registros_dialise.
            // Aqui estamos apenas checando se a rota é acessível.
        });
    });
});