import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert, Table, Spinner } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const ReportGenerator = ({ userType, patientId = null }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], // 30 dias atrás
    endDate: new Date().toISOString().split('T')[0]
  });

  const generateReport = async () => {
    setLoading(true);
    setError('');
    
    try {
      const endpoint = userType === 'medico' ? '/reports/doctor' : '/reports/patient';
      const url = patientId ? `${endpoint}/${patientId}` : endpoint;
      
      const response = await api.get(url, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      
      setReportData(response.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    // Implementar exportação para PDF
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório DialyHome</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #28a745; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; padding: 10px; border: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DialyHome - Relatório ${userType === 'medico' ? 'Médico' : 'do Paciente'}</h1>
            <p>Período: ${new Date(dateRange.startDate).toLocaleDateString('pt-BR')} a ${new Date(dateRange.endDate).toLocaleDateString('pt-BR')}</p>
          </div>
          ${generatePrintContent()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintContent = () => {
    if (!reportData) return '';

    if (userType === 'medico') {
      return `
        <div class="stats">
          <div class="stat">
            <h3>${reportData.statistics.totalPatients}</h3>
            <p>Pacientes Ativos</p>
          </div>
          <div class="stat">
            <h3>${reportData.statistics.activeSessions}</h3>
            <p>Sessões Realizadas</p>
          </div>
          <div class="stat">
            <h3>${reportData.statistics.totalAlerts}</h3>
            <p>Alertas Gerados</p>
          </div>
        </div>
        
        <h2>Detalhes por Paciente</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Sessões</th>
              <th>UF Média</th>
              <th>Alertas</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.patientReports.map(p => `
              <tr>
                <td>${p.patient.nome}</td>
                <td>${p.sessionsInPeriod}</td>
                <td>${p.averageUF} mL</td>
                <td>${p.alertsInPeriod}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      return `
        <div class="stats">
          <div class="stat">
            <h3>${reportData.statistics.totalSessions}</h3>
            <p>Sessões Realizadas</p>
          </div>
          <div class="stat">
            <h3>${reportData.statistics.averageUF}</h3>
            <p>UF Média (mL)</p>
          </div>
          <div class="stat">
            <h3>${reportData.statistics.averageSystolic}/${reportData.statistics.averageDiastolic}</h3>
            <p>PA Média (mmHg)</p>
          </div>
        </div>
        
        <h2>Registros Detalhados</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Duração</th>
              <th>UF (mL)</th>
              <th>PA (mmHg)</th>
              <th>Sintomas</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.dialysisRecords.slice(0, 20).map(record => `
              <tr>
                <td>${new Date(record.data_registro).toLocaleDateString('pt-BR')}</td>
                <td>${record.tempo_permanencia || '-'} min</td>
                <td>${record.uf_total || '-'}</td>
                <td>${record.pressao_arterial_sistolica || '-'}/${record.pressao_arterial_diastolica || '-'}</td>
                <td>${record.sintomas ? 'Sim' : 'Não'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  };

  const prepareChartData = () => {
    if (!reportData || userType === 'medico') return [];
    
    return reportData.dialysisRecords.slice(0, 10).map(record => ({
      date: new Date(record.data_registro).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      uf: record.uf_total || 0,
      sistolica: record.pressao_arterial_sistolica || 0
    }));
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Gerador de Relatórios</Card.Title>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Data Início</Form.Label>
              <Form.Control
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Data Fim</Form.Label>
              <Form.Control
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
              />
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Button 
              variant="primary" 
              onClick={generateReport} 
              disabled={loading}
              className="me-2"
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Gerar Relatório'}
            </Button>
            {reportData && (
              <Button variant="outline-secondary" onClick={exportToPDF}>
                Exportar PDF
              </Button>
            )}
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        {reportData && (
          <div>
            <hr />
            <h4>Estatísticas do Período</h4>
            <Row className="text-center mb-4">
              {userType === 'medico' ? (
                <>
                  <Col md={3}>
                    <Card bg="primary" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.totalPatients}</Card.Title>
                        <Card.Text>Pacientes Ativos</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card bg="success" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.activeSessions}</Card.Title>
                        <Card.Text>Sessões Realizadas</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card bg="warning" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.totalAlerts}</Card.Title>
                        <Card.Text>Alertas Gerados</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card bg="info" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.averageSessionsPerPatient}</Card.Title>
                        <Card.Text>Sessões/Paciente</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </>
              ) : (
                <>
                  <Col md={3}>
                    <Card bg="primary" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.totalSessions}</Card.Title>
                        <Card.Text>Sessões</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card bg="success" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.averageUF}</Card.Title>
                        <Card.Text>UF Média (mL)</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card bg="info" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.averageSystolic}/{reportData.statistics.averageDiastolic}</Card.Title>
                        <Card.Text>PA Média</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card bg="warning" text="white">
                      <Card.Body>
                        <Card.Title>{reportData.statistics.sessionsWithSymptoms}</Card.Title>
                        <Card.Text>Com Sintomas</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </>
              )}
            </Row>

            {userType === 'paciente' && reportData.dialysisRecords.length > 0 && (
              <div>
                <h5>Evolução dos Parâmetros (Últimas 10 sessões)</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uf" fill="#8884d8" name="UF (mL)" />
                    <Bar dataKey="sistolica" fill="#82ca9d" name="PA Sistólica" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {userType === 'medico' && (
              <div>
                <h5>Resumo por Paciente</h5>
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Sessões no Período</th>
                      <th>UF Média (mL)</th>
                      <th>Alertas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.patientReports.map(patient => (
                      <tr key={patient.patient.id}>
                        <td>{patient.patient.nome}</td>
                        <td>{patient.sessionsInPeriod}</td>
                        <td>{patient.averageUF}</td>
                        <td>
                          <span className={`badge ${patient.alertsInPeriod > 0 ? 'bg-warning' : 'bg-success'}`}>
                            {patient.alertsInPeriod}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ReportGenerator;