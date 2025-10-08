// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
import { Activity, Droplet, Heart, Clock, TrendingUp, FileText, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/ladingpageCard';
import { Button } from "../components/ui/ladingpageButton";


const PatientDashboard = () => {
  const stats = [
    { 
      title: "Pressão Arterial", 
      value: "120/80", 
      unit: "mmHg", 
      icon: Heart, 
      trend: "normal",
      color: "text-success"
    },
    { 
      title: "UF Total", 
      value: "2.1", 
      unit: "L", 
      icon: Droplet, 
      trend: "up",
      color: "text-info"
    },
    { 
      title: "Glicose", 
      value: "95", 
      unit: "mg/dL", 
      icon: Activity, 
      trend: "normal",
      color: "text-primary"
    },
    { 
      title: "Tempo Permanência", 
      value: "4.5", 
      unit: "horas", 
      icon: Clock, 
      trend: "normal",
      color: "text-warning"
    },
  ];

  const recentRecords = [
    { date: "06/01/2025", pa: "120/80", uf: "2.1L", glicose: "95 mg/dL", status: "Normal" },
    { date: "05/01/2025", pa: "118/78", uf: "2.0L", glicose: "92 mg/dL", status: "Normal" },
    { date: "04/01/2025", pa: "125/82", uf: "2.2L", glicose: "98 mg/dL", status: "Atenção" },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Olá, Maria!</h1>
            <p className="text-muted-foreground mt-1">
              Aqui está um resumo do seu tratamento
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Novo Registro
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-0 shadow-soft transition-smooth hover:shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription>{stat.title}</CardDescription>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.unit}</p>
                    </div>
                    {stat.trend === "up" && (
                      <TrendingUp className="h-5 w-5 text-success" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Records */}
          <Card className="lg:col-span-2 border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Registros Recentes</CardTitle>
              <CardDescription>Últimos parâmetros registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRecords.map((record, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-4 rounded-lg bg-gradient-card border border-border"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{record.date}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>PA: {record.pa}</span>
                        <span>UF: {record.uf}</span>
                        <span>Glicose: {record.glicose}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === "Normal" 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    }`}>
                      {record.status}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <FileText className="h-4 w-4 mr-2" />
                Ver Histórico Completo
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Acesso rápido às funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Activity className="h-4 w-4" />
                Registrar Sintomas
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Clock className="h-4 w-4" />
                Ver Lembretes
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Upload de Exames
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <TrendingUp className="h-4 w-4" />
                Visualizar Gráficos
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Reminders */}
        <Card className="border-0 shadow-soft bg-gradient-card">
          <CardHeader>
            <CardTitle>Próximos Lembretes</CardTitle>
            <CardDescription>Não esqueça de suas atividades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Sessão de Diálise</p>
                  <p className="text-sm text-muted-foreground">Hoje às 14:00</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
                <div className="p-2 rounded-lg bg-info/10">
                  <Activity className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="font-medium">Tomar Medicamento</p>
                  <p className="text-sm text-muted-foreground">Hoje às 16:00</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Heart className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium">Consulta Médica</p>
                  <p className="text-sm text-muted-foreground">Amanhã às 10:00</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
