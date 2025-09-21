import { useState } from "react";
import { Heart, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginProps {
  onLogin: (userType: "paciente" | "medico" | "admin") => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulação de login - em produção conectaria com Supabase
    setTimeout(() => {
      if (email.includes("admin")) {
        onLogin("admin");
      } else if (email.includes("medico") || email.includes("dr")) {
        onLogin("medico");
      } else {
        onLogin("paciente");
      }
      setIsLoading(false);
    }, 1500);
  };

  const demoUsers = [
    { email: "paciente@dialyhome.com", type: "paciente", name: "João (Paciente)" },
    { email: "dr.medico@dialyhome.com", type: "medico", name: "Dr. Maria (Médico)" },
    { email: "admin@dialyhome.com", type: "admin", name: "Admin" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl medical-shadow mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">DialyHome</h1>
          <p className="text-muted-foreground">Sistema de Controle de Diálise Peritoneal</p>
        </div>

        {/* Formulário de Login */}
        <Card className="medical-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10 medical-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="sua senha"
                  className="pl-10 pr-10 medical-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full medical-button-primary h-12"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Demo - Clique em um usuário para testar:
            </p>
            <div className="space-y-2">
              {demoUsers.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  size="sm"
                  className="w-full text-left justify-start h-auto py-2"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword("123456");
                  }}
                >
                  <div>
                    <div className="font-medium text-xs">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Esqueceu sua senha?{" "}
            <button className="text-primary hover:underline font-medium">
              Recuperar acesso
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;