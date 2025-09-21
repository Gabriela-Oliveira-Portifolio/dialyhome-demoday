import { useState } from "react";
import { Heart, Activity, Pill, FileText, TrendingUp, AlertTriangle, CheckCircle, Users } from "lucide-react";
import DashboardCard from "@/components/medical/DashboardCard";
import Navigation from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DashboardProps {
  userType: "paciente" | "medico" | "admin";
}

const Dashboard = ({ userType }: DashboardProps) => {
  const [activeRoute, setActiveRoute] = useState("dashboard");

  const handleNavigate = (route: string) => {
    setActiveRoute(route);
    // Aqui implementaria a navegação real
    console.log(`Navegando para: ${route}`);
  };

  const renderPatientDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Olá, João!</h1>
          <p className="text-muted-foreground">Acompanhe seu tratamento de diálise peritoneal</p>
        </div>
        <Button className="medical-button-primary">
          <Activity className="h-4 w-4 mr-2" />
          Registrar Diálise
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Último Registro"
          value="Hoje, 14:30"
          subtitle="Sessão de 4h completa"
          icon={<Activity className="h-6 w-6" />}
          status="normal"
        />
        
        <DashboardCard
          title="Pressão Arterial"
          value="120/80 mmHg"
          subtitle="Dentro do normal"
          icon={<Heart className="h-6 w-6" />}
          status="normal"
          trend="stable"
          trendValue="Estável"
        />
        
        <DashboardCard
          title="Próximo Medicamento"
          value="15:00"
          subtitle="Captopril 25mg"
          icon={<Pill className="h-6 w-6" />}
          status="warning"
        />
        
        <DashboardCard
          title="UF Total Média"
          value="2.150 ml"
          subtitle="Últimos 7 dias"
          icon={<TrendingUp className="h-6 w-6" />}
          status="normal"
          trend="up"
          trendValue="+5%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="medical-card lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Registros Recentes</h3>
          <div className="space-y-3">
            {[
              { date: "Hoje", time: "14:30", status: "Concluída", uf: "2.200ml" },
              { date: "Ontem", time: "14:00", status: "Concluída", uf: "2.100ml" },
              { date: "19/12", time: "15:15", status: "Concluída", uf: "2.150ml" },
            ].map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">{record.date} - {record.time}</p>
                    <p className="text-sm text-muted-foreground">UF: {record.uf}</p>
                  </div>
                </div>
                <span className="text-sm text-success font-medium">{record.status}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="medical-card">
          <h3 className="text-lg font-semibold mb-4">Lembretes</h3>
          <div className="space-y-3">
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="font-medium text-warning">Consulta Agendada</p>
              <p className="text-sm text-muted-foreground">Amanhã, 09:00</p>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="font-medium text-primary">Exame de Sangue</p>
              <p className="text-sm text-muted-foreground">Segunda-feira</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderDoctorDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dr. Maria Silva</h1>
          <p className="text-muted-foreground">Acompanhe seus pacientes em diálise peritoneal</p>
        </div>
        <Button className="medical-button-primary">
          <FileText className="h-4 w-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Pacientes"
          value="24"
          subtitle="Em acompanhamento"
          icon={<Users className="h-6 w-6" />}
          status="normal"
        />
        
        <DashboardCard
          title="Alertas Pendentes"
          value="3"
          subtitle="Requerem atenção"
          icon={<AlertTriangle className="h-6 w-6" />}
          status="warning"
        />
        
        <DashboardCard
          title="Registros Hoje"
          value="18"
          subtitle="De 24 pacientes"
          icon={<Activity className="h-6 w-6" />}
          status="normal"
          trend="up"
          trendValue="+12%"
        />
        
        <DashboardCard
          title="Consultas Agendadas"
          value="7"
          subtitle="Próximos 7 dias"
          icon={<FileText className="h-6 w-6" />}
          status="normal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="medical-card">
          <h3 className="text-lg font-semibold mb-4">Alertas Recentes</h3>
          <div className="space-y-3">
            {[
              { patient: "João Santos", alert: "PA elevada: 150/95", time: "14:30", severity: "warning" },
              { patient: "Maria Costa", alert: "UF baixa: 1.200ml", time: "12:15", severity: "critical" },
              { patient: "Carlos Lima", alert: "Sintomas: náusea", time: "11:45", severity: "warning" },
            ].map((alert, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                  alert.severity === "critical" ? "text-destructive" : "text-warning"
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{alert.patient}</p>
                  <p className="text-sm text-muted-foreground">{alert.alert}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="medical-card">
          <h3 className="text-lg font-semibold mb-4">Pacientes em Destaque</h3>
          <div className="space-y-3">
            {[
              { name: "Ana Silva", status: "Excelente", lastRecord: "Hoje, 14:00" },
              { name: "Pedro Oliveira", status: "Atenção", lastRecord: "Hoje, 13:30" },
              { name: "Lucia Santos", status: "Normal", lastRecord: "Hoje, 12:45" },
            ].map((patient, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.lastRecord}</p>
                </div>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  patient.status === "Excelente" ? "bg-success/20 text-success" :
                  patient.status === "Atenção" ? "bg-warning/20 text-warning" :
                  "bg-primary/20 text-primary"
                }`}>
                  {patient.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie o sistema DialyHome</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Usuários"
          value="156"
          subtitle="48 médicos, 108 pacientes"
          icon={<Users className="h-6 w-6" />}
          status="normal"
          trend="up"
          trendValue="+8"
        />
        
        <DashboardCard
          title="Registros Hoje"
          value="89"
          subtitle="De 108 pacientes ativos"
          icon={<Activity className="h-6 w-6" />}
          status="normal"
          trend="up"
          trendValue="+5%"
        />
        
        <DashboardCard
          title="Sistema"
          value="99.9%"
          subtitle="Uptime últimos 30 dias"
          icon={<CheckCircle className="h-6 w-6" />}
          status="normal"
        />
        
        <DashboardCard
          title="Alertas Sistema"
          value="2"
          subtitle="Backups pendentes"
          icon={<AlertTriangle className="h-6 w-6" />}
          status="warning"
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (userType) {
      case "paciente":
        return renderPatientDashboard();
      case "medico":
        return renderDoctorDashboard();
      case "admin":
        return renderAdminDashboard();
      default:
        return <div>Tipo de usuário não reconhecido</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">DialyHome</h2>
              <p className="text-xs text-sidebar-foreground/70 capitalize">{userType}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <Navigation
            userType={userType}
            activeRoute={activeRoute}
            onNavigate={handleNavigate}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;