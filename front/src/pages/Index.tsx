import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import DialysisForm from "./DialysisForm";

type UserType = "paciente" | "medico" | "admin" | null;
type CurrentPage = "login" | "dashboard" | "dialysis-form";

const Index = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const [currentPage, setCurrentPage] = useState<CurrentPage>("login");

  // Demo: Simular navegação para mostrar diferentes telas
  const handleLogin = (type: UserType) => {
    setUserType(type);
    setCurrentPage("dashboard");
  };

  const handleNavigate = (page: CurrentPage) => {
    setCurrentPage(page);
  };

  // Renderizar página baseada no estado atual
  if (currentPage === "login") {
    return <Login onLogin={handleLogin} />;
  }

  if (currentPage === "dialysis-form") {
    return <DialysisForm />;
  }

  if (currentPage === "dashboard" && userType) {
    return <Dashboard userType={userType} />;
  }

  // Fallback
  return <Login onLogin={handleLogin} />;
};

export default Index;
