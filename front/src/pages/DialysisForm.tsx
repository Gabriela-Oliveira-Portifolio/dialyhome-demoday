import { useState } from "react";
import { Activity, Heart, Droplets, Clock, AlertCircle } from "lucide-react";
import MedicalForm from "@/components/medical/MedicalForm";
import DashboardCard from "@/components/medical/DashboardCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const DialysisForm = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const symptoms = [
    { id: "nausea", label: "Náusea", category: "gastrointestinal" },
    { id: "vomito", label: "Vômito", category: "gastrointestinal" },
    { id: "dor_abdominal", label: "Dor abdominal", category: "gastrointestinal" },
    { id: "falta_ar", label: "Falta de ar", category: "respiratorio" },
    { id: "tontura", label: "Tontura", category: "neurologico" },
    { id: "inchaco", label: "Inchaço", category: "circulatorio" },
    { id: "cansaco", label: "Cansaço excessivo", category: "geral" },
    { id: "febre", label: "Febre", category: "geral" },
    { id: "dor_cabeca", label: "Dor de cabeça", category: "neurologico" },
    { id: "alteracao_liquido", label: "Alteração do líquido drenado", category: "dialise" },
  ];

  const formFields = [
    {
      id: "data_registro",
      label: "Data do Registro",
      type: "date" as const,
      required: true,
      value: new Date().toISOString().split('T')[0]
    },
    {
      id: "horario_inicio",
      label: "Horário de Início",
      type: "time" as const,
      required: true
    },
    {
      id: "horario_fim",
      label: "Horário de Fim",
      type: "time" as const,
      required: true
    },
    {
      id: "pressao_sistolica",
      label: "Pressão Sistólica (mmHg)",
      type: "number" as const,
      required: true,
      min: 70,
      max: 200
    },
    {
      id: "pressao_diastolica",
      label: "Pressão Diastólica (mmHg)",
      type: "number" as const,
      required: true,
      min: 40,
      max: 120
    },
    {
      id: "peso_pre",
      label: "Peso Pré-Diálise (kg)",
      type: "number" as const,
      required: true,
      min: 30,
      max: 200,
      step: 0.1
    },
    {
      id: "peso_pos",
      label: "Peso Pós-Diálise (kg)",
      type: "number" as const,
      required: true,
      min: 30,
      max: 200,
      step: 0.1
    },
    {
      id: "drenagem_inicial",
      label: "Drenagem Inicial (ml)",
      type: "number" as const,
      required: true,
      min: 0,
      max: 5000
    },
    {
      id: "uf_total",
      label: "UF Total (ml)",
      type: "number" as const,
      required: true,
      min: 0,
      max: 5000
    },
    {
      id: "tempo_permanencia",
      label: "Tempo de Permanência (minutos)",
      type: "number" as const,
      required: true,
      min: 60,
      max: 720
    },
    {
      id: "concentracao_glicose",
      label: "Concentração de Glicose (%)",
      type: "number" as const,
      step: 0.1,
      min: 0,
      max: 10
    },
    {
      id: "concentracao_dextrose",
      label: "Concentração de Dextrose (%)",
      type: "number" as const,
      step: 0.1,
      min: 0,
      max: 10
    },
    {
      id: "observacoes",
      label: "Observações Gerais",
      type: "textarea" as const,
      placeholder: "Descreva qualquer observação importante sobre a sessão..."
    }
  ];

  const handleSubmit = (data: Record<string, any>) => {
    const formData = {
      ...data,
      sintomas: selectedSymptoms,
      data_criacao: new Date().toISOString()
    };
    
    console.log("Dados da diálise:", formData);
    // Aqui integraria com Supabase para salvar os dados
    alert("Registro de diálise salvo com sucesso!");
  };

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    if (checked) {
      setSelectedSymptoms([...selectedSymptoms, symptomId]);
    } else {
      setSelectedSymptoms(selectedSymptoms.filter(id => id !== symptomId));
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Registrar Sessão de Diálise</h1>
          <p className="text-muted-foreground">Registre os dados da sua sessão de diálise peritoneal</p>
        </div>

        {/* Cards de Status Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Última Sessão"
            value="Ontem"
            subtitle="14:30 - 18:30"
            icon={<Clock className="h-5 w-5" />}
            status="normal"
          />
          <DashboardCard
            title="PA Anterior"
            value="125/82"
            subtitle="mmHg"
            icon={<Heart className="h-5 w-5" />}
            status="normal"
          />
          <DashboardCard
            title="UF Média"
            value="2.180ml"
            subtitle="Últimas 7 sessões"
            icon={<Droplets className="h-5 w-5" />}
            status="normal"
          />
          <DashboardCard
            title="Sessões Mês"
            value="28/30"
            subtitle="93% de adesão"
            icon={<Activity className="h-5 w-5" />}
            status="normal"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário Principal */}
          <div className="lg:col-span-2">
            <MedicalForm
              title="Dados da Sessão"
              subtitle="Preencha todos os campos obrigatórios da sua sessão de diálise"
              fields={formFields}
              onSubmit={handleSubmit}
              submitLabel="Salvar Registro"
            >
              {/* Seção de Sintomas */}
              <Card className="medical-card">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Sintomas Apresentados</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Marque os sintomas que você apresentou durante ou após a sessão:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {symptoms.map((symptom) => (
                    <div key={symptom.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={symptom.id}
                        checked={selectedSymptoms.includes(symptom.id)}
                        onCheckedChange={(checked) => 
                          handleSymptomChange(symptom.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={symptom.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {symptom.label}
                      </label>
                    </div>
                  ))}
                </div>

                {selectedSymptoms.length > 0 && (
                  <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning font-medium">
                      ⚠️ Sintomas selecionados: {selectedSymptoms.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seu médico será notificado automaticamente sobre os sintomas relatados.
                    </p>
                  </div>
                )}
              </Card>
            </MedicalForm>
          </div>

          {/* Painel Lateral - Dicas e Lembretes */}
          <div className="space-y-6">
            <Card className="medical-card">
              <h3 className="text-lg font-semibold mb-4">💡 Dicas Importantes</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="font-medium text-primary">Medição da Pressão</p>
                  <p className="text-muted-foreground">Meça sempre antes e depois da sessão, em posição sentada.</p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <p className="font-medium text-secondary">Peso Corporal</p>
                  <p className="text-muted-foreground">Use sempre a mesma balança e roupas similares.</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="font-medium text-warning">Líquido Drenado</p>
                  <p className="text-muted-foreground">Observe cor, transparência e presença de fibrina.</p>
                </div>
              </div>
            </Card>

            <Card className="medical-card">
              <h3 className="text-lg font-semibold mb-4">📊 Metas da Semana</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">UF Total Média</span>
                  <span className="text-sm font-medium text-success">2.000-2.500ml</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pressão Arterial</span>
                  <span className="text-sm font-medium text-success">{'<'}140/90 mmHg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sessões/Semana</span>
                  <span className="text-sm font-medium text-success">7/7</span>
                </div>
              </div>
            </Card>

            <Card className="medical-card">
              <h3 className="text-lg font-semibold mb-4">⏰ Próximos Lembretes</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <p className="font-medium">Próxima sessão</p>
                    <p className="text-muted-foreground">Amanhã, 14:00</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <div>
                    <p className="font-medium">Medicamento</p>
                    <p className="text-muted-foreground">Hoje, 20:00</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <div>
                    <p className="font-medium">Consulta médica</p>
                    <p className="text-muted-foreground">Segunda, 09:00</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialysisForm;