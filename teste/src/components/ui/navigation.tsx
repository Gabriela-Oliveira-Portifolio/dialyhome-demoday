import { Heart, Home, FileText, Pill, Calendar, Settings, Bell, LogOut, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationProps {
  userType: "paciente" | "medico" | "admin";
  activeRoute: string;
  onNavigate: (route: string) => void;
  className?: string;
}

const Navigation = ({ userType, activeRoute, onNavigate, className }: NavigationProps) => {
  const getMenuItems = () => {
    switch (userType) {
      case "paciente":
        return [
          { id: "dashboard", label: "Dashboard", icon: Home },
          { id: "dialise", label: "Registrar Diálise", icon: Activity },
          { id: "medicamentos", label: "Medicamentos", icon: Pill },
          { id: "documentos", label: "Documentos", icon: FileText },
          { id: "lembretes", label: "Lembretes", icon: Calendar },
        ];
      case "medico":
        return [
          { id: "dashboard", label: "Dashboard", icon: Home },
          { id: "pacientes", label: "Meus Pacientes", icon: Heart },
          { id: "relatorios", label: "Relatórios", icon: FileText },
          { id: "alertas", label: "Alertas", icon: Bell },
        ];
      case "admin":
        return [
          { id: "dashboard", label: "Dashboard", icon: Home },
          { id: "usuarios", label: "Usuários", icon: Heart },
          { id: "vinculos", label: "Vínculos", icon: Activity },
          { id: "relatorios", label: "Relatórios", icon: FileText },
          { id: "auditoria", label: "Auditoria", icon: Bell },
          { id: "configuracoes", label: "Configurações", icon: Settings },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <nav className={cn("space-y-2", className)}>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeRoute === item.id;
        
        return (
          <Button
            key={item.id}
            variant={isActive ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-12 px-4 text-left font-medium smooth-transition",
              isActive && "medical-gradient medical-shadow text-white"
            )}
            onClick={() => onNavigate(item.id)}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Button>
        );
      })}
      
      <div className="pt-4 mt-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 px-4 text-left font-medium smooth-transition hover:text-destructive"
          onClick={() => onNavigate("logout")}
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;