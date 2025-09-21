import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, notificationsRes] = await Promise.all([
        api.get('/doctor/patients'),
        api.get('/doctor/notifications')
      ]);

      setPatients(patientsRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertBadgeVariant = (tipo) => {
    switch (tipo) {
      case 'alerta_medico': return 'danger';
      case 'lembrete_medicacao': return 'warning';
      default: return 'info';
    }
  };

  if (loading) {
    return <div className="text-center mt-4">Carregando...</div>;
  }

  return (
    <Container fluid>
      <h2 className="mb-4">Painel do Médico</h2>
      
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <Card.Title>Meus Pacientes ({patients.length})</Card.Title>
            </Card.Header>
            <Card.Body>
              {patients.length === 0 ? (
                <Alert variant="info">Nenhum paciente cadastrado</Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      <th>Início do Tratamento</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr 
                        key={patient.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                      >
                        <td>{patient.nome}</td>
                        <td>{patient.email}</td>
                        <td>{patient.telefone || '-'}</td>
                        <td>
                          {patient.data_inicio_tratamento 
                            ? new Date(patient.data_inicio_tratamento).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </td>
                        <td>
                          <Badge bg="primary">Ver Detalhes</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <Card.Header>
              <Card.Title>Alertas Recentes</Card.Title>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Alert variant="success">Nenhum alerta no momento</Alert>
              ) : (
                notifications.slice(0, 10).map(notification => (
                  <Alert 
                    key={notification.id}
                    variant={getAlertBadgeVariant(notification.tipo)}
                    className="mb-2 small"
                  >
                    <Alert.Heading className="h6">{notification.titulo}</Alert.Heading>
                    <p className="mb-1">{notification.mensagem}</p>
                    <small className="text-muted">
                      {new Date(notification.data_criacao).toLocaleString('pt-BR')}
                    </small>
                  </Alert>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-primary display-6">{patients.length}</Card.Title>
              <Card.Text>Pacientes Ativos</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-warning display-6">
                {notifications.filter(n => n.tipo === 'alerta_medico' && !n.lida).length}
              </Card.Title>
              <Card.Text>Alertas Não Lidos</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-info display-6">
                {notifications.filter(n => 
                  new Date(n.data_criacao) > new Date(Date.now() - 24*60*60*1000)
                ).length}
              </Card.Title>
              <Card.Text>Alertas Hoje</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DoctorDashboard;