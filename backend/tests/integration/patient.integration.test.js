// backend/tests/integration/patient.integration.test.js

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../src/config/database');

const express = require('express');
const app = express();
const cors = require('cors');
const patientRoutes = require('../../src/routes/patients');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/patients', patientRoutes);

const generateAuthToken = (id, tipo_usuario, email, nome = 'Test User') => {
    return jwt.sign(
        { id, userId: id, tipo_usuario, email, nome },
        process.env.JWT_SECRET || 'test_secret_key',
        { expiresIn: '1h' }
    );
};

describe('Patient Routes - Profile & Stats Integration Tests', () => {
    let patient1 = {};
    let doctor = {}; // Mantido apenas para testar a negação (403)

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';

        // 1. Limpar banco de teste (MUITO IMPORTANTE A ORDEM)
        await db.query('DELETE FROM tokens_invalidados');
        await db.query('DELETE FROM logs_auditoria');
        await db.query('DELETE FROM tokens_invalidados');
        await db.query('DELETE FROM registros_dialise');
        await db.query('DELETE FROM pacientes');
        await db.query('DELETE FROM medicos');
        await db.query('DELETE FROM usuarios');


        const passwordHash = await bcrypt.hash('Senha123!', 10);
        
        // --- DOCTOR (Para testar 403) ---
        const doctorUserResult = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ('Dr. Block', 'doctor_block@test.com', $1, 'medico', true) RETURNING id",
            [passwordHash]
        );
        doctor.userId = doctorUserResult.rows[0].id;
        // Não precisamos do medicos.id ou paciente associado
        doctor.token = generateAuthToken(doctor.userId, 'medico', 'doctor_block@test.com');
        
        // --- PATIENT 1 (Usuário de teste) ---
        const patient1UserResult = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ('Paciente Pura', 'paciente_pura@test.com', $1, 'paciente', true) RETURNING id",
            [passwordHash]
        );
        patient1.userId = patient1UserResult.rows[0].id;
        const patient1Result = await db.query(
            "INSERT INTO pacientes (usuario_id, cpf, data_inicio_tratamento) VALUES ($1, '11111111111', NOW() - INTERVAL '10 days') RETURNING id",
            [patient1.userId]
        );
        patient1.id = patient1Result.rows[0].id;
        patient1.token = generateAuthToken(patient1.userId, 'paciente', 'paciente_pura@test.com');

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
         // Fechar o pool no final
         await db.pool.end(); 
    });


    // --- Rota GET /api/patients/profile ---
    describe('GET /profile (Acesso Paciente)', () => {
        it('1. deve retornar o perfil completo para o Paciente Autenticado (200)', async () => {
            const response = await request(app)
                .get('/api/patients/profile')
                .set('Authorization', `Bearer ${patient1.token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('patient');
            expect(response.body.patient.nome).toBe('Paciente Pura');
        });

        it('2. deve retornar 403 se o usuário não for um Paciente (Ex: Médico)', async () => {
            const response = await request(app)
                .get('/api/patients/profile')
                .set('Authorization', `Bearer ${doctor.token}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Acesso negado');
        });
    });

    // --- Rota GET /api/patients/stats ---
    describe('GET /stats (Acesso Paciente)', () => {
        it('3. deve retornar estatísticas para o Paciente Autenticado (200)', async () => {
            const response = await request(app)
                .get('/api/patients/stats?days=30')
                .set('Authorization', `Bearer ${patient1.token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary.total_registros).toBe(2);
        });

        it('4. deve retornar 403 se o usuário não for um Paciente (Ex: Médico)', async () => {
            const response = await request(app)
                .get('/api/patients/stats')
                .set('Authorization', `Bearer ${doctor.token}`); 

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Acesso negado');
        });
    });
});