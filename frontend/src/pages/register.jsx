export default function Register() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Cadastro</h2>
        <form className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nome"
            className="p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            className="p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Senha"
            className="p-2 border rounded"
          />
          <button className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
            Cadastrar
          </button>
        </form>
      </div>
    </div>
  );
}
