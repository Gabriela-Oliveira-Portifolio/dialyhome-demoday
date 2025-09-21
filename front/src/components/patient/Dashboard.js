import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import DialysisForm from './DialysisForm';

const PatientDashboard = () => {
  const [dialysisHistory, setDialysisHistory] = useState([]);
  const [medications, setMedications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dialysisRes, medicationsRes, notificationsRes] = await Promise.all([
        api.get('/dialysis/history?limit=30'),
        api.get('/medications'),
        api.get('/notifications')
      ]);

      setDialysisHistory(dialysisRes.data);
      setMedications(medicationsRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = () => {
    return dialysisHistory.map(record => ({
      date: new Date(record.data_registro).toLocaleDateString('pt-BR'),
      pressao_sistolica: record.pressao_arterial_sistolica,
      pressao_diastolica: record.pressao_arterial_diastolica,
      uf_total: record.uf_total,
      peso_pre: record.peso_pre_dialise
    }));
  };

  if (loading) {
    return <div className="text-center mt-4">Carregando...</div>;
  }

  return (
    <Container fluid>
      <h2 className="mb-4">Painel do Paciente</h2>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title>Registros Recentes</Card.Title>
            </Card.Header>
            <Card.Body>
              {dialysisHistory.length === 0 ? (
                <Alert variant="info">Nenhum registro encontrado</Alert>
              ) : (
                <div>
                  <p>Último registro: {new Date(dialysisHistory[0]?.data_registro).toLocaleDateString('pt-BR')}</p>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowForm(!showForm)}
                  >
                    {showForm ? 'Cancelar' : 'Novo Registro'}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title>Medicamentos Ativos</Card.Title>
            </Card.Header>
            <Card.Body>
              {medications.length === 0 ? (
                <Alert variant="info">Nenhum medicamento cadastrado</Alert>
              ) : (
                <ul className="list-unstyled">
                  {medications.slice(0, 5).map(med => (
                    <li key={med.id} className="mb-2">
                      <strong>{med.nome}</strong> - {med.dosagem}<br/>
                      <small className="text-muted">{med.frequencia} às {med.horario_principal}</small>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {showForm && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <Card.Title>Novo Registro de Diálise</Card.Title>
              </Card.Header>
              <Card.Body>
                <DialysisForm 
                  onSubmitSuccess={() => {
                    setShowForm(false);
                    fetchDashboardData();
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {dialysisHistory.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <Card.Title>Evolução - Pressão Arterial</Card.Title>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="pressao_sistolica" 
                      stroke="#8884d8" 
                      name="Sistólica"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pressao_diastolica" 
                      stroke="#82ca9d" 
                      name="Diastólica"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {notifications.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <Card.Title>Notificações</Card.Title>
              </Card.Header>
              <Card.Body>
                {notifications.slice(0, 5).map(notification => (
                  <Alert 
                    key={notification.id} 
                    variant={notification.tipo === 'alerta_medico' ? 'warning' : 'info'}
                    className="mb-2"
                  >
                    <Alert.Heading>{notification.titulo}</Alert.Heading>
                    <p>{notification.mensagem}</p>
                    <small className="text-muted">
                      {new Date(notification.data_criacao).toLocaleString('pt-BR')}
                    </small>
                  </Alert>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default PatientDashboard;