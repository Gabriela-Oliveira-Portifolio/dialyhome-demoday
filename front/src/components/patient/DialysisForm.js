import React, { useState } from 'react';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import api from '../../services/api';

const DialysisForm = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    data_registro: new Date().toISOString().split('T')[0],
    horario_inicio: '',
    horario_fim: '',
    pressao_arterial_sistolica: '',
    pressao_arterial_diastolica: '',
    peso_pre_dialise: '',
    peso_pos_dialise: '',
    drenagem_inicial: '',
    uf_total: '',
    tempo_permanencia: '',
    concentracao_glicose: '',
    concentracao_dextrose: '',
    sintomas: '',
    observacoes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/dialysis', formData);
      setSuccess('Registro de diálise salvo com sucesso!');
      
      // Reset form
      setFormData({
        data_registro: new Date().toISOString().split('T')[0],
        horario_inicio: '',
        horario_fim: '',
        pressao_arterial_sistolica: '',
        pressao_arterial_diastolica: '',
        peso_pre_dialise: '',
        peso_pos_dialise: '',
        drenagem_inicial: '',
        uf_total: '',
        tempo_permanencia: '',
        concentracao_glicose: '',
        concentracao_dextrose: '',
        sintomas: '',
        observacoes: ''
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao salvar registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Data do Registro</Form.Label>
            <Form.Control
              type="date"
              name="data_registro"
              value={formData.data_registro}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Horário de Início</Form.Label>
            <Form.Control
              type="time"
              name="horario_inicio"
              value={formData.horario_inicio}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Horário de Fim</Form.Label>
            <Form.Control
              type="time"
              name="horario_fim"
              value={formData.horario_fim}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Pressão Arterial Sistólica</Form.Label>
            <Form.Control
              type="number"
              name="pressao_arterial_sistolica"
              value={formData.pressao_arterial_sistolica}
              onChange={handleChange}
              placeholder="mmHg"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Pressão Arterial Diastólica</Form.Label>
            <Form.Control
              type="number"
              name="pressao_arterial_diastolica"
              value={formData.pressao_arterial_diastolica}
              onChange={handleChange}
              placeholder="mmHg"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Peso Pré-Diálise (kg)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="peso_pre_dialise"
              value={formData.peso_pre_dialise}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Peso Pós-Diálise (kg)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="peso_pos_dialise"
              value={formData.peso_pos_dialise}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Drenagem Inicial (mL)</Form.Label>
            <Form.Control
              type="number"
              name="drenagem_inicial"
              value={formData.drenagem_inicial}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>UF Total (mL)</Form.Label>
            <Form.Control
              type="number"
              name="uf_total"
              value={formData.uf_total}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Tempo Permanência (min)</Form.Label>
            <Form.Control
              type="number"
              name="tempo_permanencia"
              value={formData.tempo_permanencia}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Concentração Glicose</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="concentracao_glicose"
              value={formData.concentracao_glicose}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Concentração Dextrose</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="concentracao_dextrose"
              value={formData.concentracao_dextrose}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>Sintomas</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          name="sintomas"
          value={formData.sintomas}
          onChange={handleChange}
          placeholder="Descreva sintomas observados"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Observações</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          placeholder="Observações adicionais"
        />
      </Form.Group>

      <Button variant="primary" type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Registro'}
      </Button>
    </Form>
  );
};

export default DialysisForm;