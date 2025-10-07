import { useState } from "react";

export default function Togin() {
  const [tab, setTab] = useState("patient");

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(to right, #e3f2fd, #bbdefb)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",maxWidth:"1000px",width:"100%",background:"#fff",borderRadius:"16px",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
        <div style={{padding:"40px",background:"#f8f9fa"}}>
          <h1 style={{fontSize:"32px",fontWeight:"bold",color:"#1565c0"}}>DialyHome</h1>
          <p style={{marginTop:"10px",color:"#555"}}>Sistema Web para controle de diálise peritoneal domiciliar</p>
        </div>
        <div style={{padding:"40px"}}>
          <h2 style={{fontSize:"24px",fontWeight:"bold",color:"#0d47a1"}}>Acesse sua conta</h2>
          <div style={{display:"flex",gap:"5px",marginTop:"20px"}}>
            <button onClick={()=>setTab("patient")} style={{flex:1,padding:"10px",background:tab==="patient"?"#1976d2":"#f5f5f5",color:tab==="patient"?"white":"black",border:"none",borderRadius:"6px",cursor:"pointer"}}>Paciente</button>
            <button onClick={()=>setTab("doctor")} style={{flex:1,padding:"10px",background:tab==="doctor"?"#1976d2":"#f5f5f5",color:tab==="doctor"?"white":"black",border:"none",borderRadius:"6px",cursor:"pointer"}}>Médico</button>
            <button onClick={()=>setTab("admin")} style={{flex:1,padding:"10px",background:tab==="admin"?"#1976d2":"#f5f5f5",color:tab==="admin"?"white":"black",border:"none",borderRadius:"6px",cursor:"pointer"}}>Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}