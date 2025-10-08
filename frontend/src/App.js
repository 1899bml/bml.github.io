import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [socios, setSocios] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSocio, setEditingSocio] = useState(null);
  const [filters, setFilters] = useState({
    nome: '',
    categoria: '',
    ordenar_por: 'nome'
  });

  // Fetch functions
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/socios/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchSocios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.nome) params.append('nome', filters.nome);
      if (filters.categoria) params.append('categoria', filters.categoria);
      params.append('ordenar_por', filters.ordenar_por);
      params.append('limit', '1000');

      const response = await fetch(`${API_BASE}/api/socios?${params}`);
      const data = await response.json();
      setSocios(data);
    } catch (error) {
      console.error('Erro ao buscar sócios:', error);
    }
    setLoading(false);
  };

  const deleteSocio = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este sócio?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/socios/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchSocios();
        await fetchStats();
      }
    } catch (error) {
      console.error('Erro ao deletar sócio:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'socios') {
      fetchSocios();
    }
  }, [activeTab, filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema de Gestão de Sócios
              </h1>
              <p className="text-gray-600 mt-1">Associação de Membros</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span>Sistema Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'socios', label: 'Sócios', icon: '👥' },
              { id: 'import', label: 'Importar', icon: '📤' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
              
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                  <StatCard
                    title="Total Sócios"
                    value={stats.total_socios}
                    icon="👥"
                    color="blue"
                  />
                  <StatCard
                    title="Ativos"
                    value={stats.ativos}
                    icon="✅"
                    color="green"
                  />
                  <StatCard
                    title="Inativos"
                    value={stats.inativos}
                    icon="❌"
                    color="red"
                  />
                  <StatCard
                    title="Normal"
                    value={stats.normais}
                    icon="⭐"
                    color="yellow"
                  />
                  <StatCard
                    title="Novos (Mês)"
                    value={stats.novos_este_mes}
                    icon="🆕"
                    color="purple"
                  />
                </div>
              )}
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setActiveTab('socios');
                      setShowAddModal(true);
                    }}
                    className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="mr-2">➕</span>
                    Adicionar Sócio
                  </button>
                  <button
                    onClick={() => setActiveTab('socios')}
                    className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <span className="mr-2">👥</span>
                    Ver Todos os Sócios
                  </button>
                  <button
                    onClick={() => setActiveTab('import')}
                    className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <span className="mr-2">📤</span>
                    Importar Dados
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Socios Tab */}
        {activeTab === 'socios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestão de Sócios</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <span className="mr-2">➕</span>
                Adicionar Sócio
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filters.nome}
                  onChange={(e) => setFilters({...filters, nome: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filters.categoria}
                  onChange={(e) => setFilters({...filters, categoria: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as categorias</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="normal">Normal</option>
                </select>
                <select
                  value={filters.ordenar_por}
                  onChange={(e) => setFilters({...filters, ordenar_por: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="nome">Ordenar por Nome</option>
                  <option value="email">Ordenar por Email</option>
                  <option value="data_ingresso">Ordenar por Data</option>
                  <option value="categoria">Ordenar por Categoria</option>
                </select>
                <div className="flex items-center text-sm text-gray-500">
                  Total: {socios.length} sócios
                </div>
              </div>
            </div>

            {/* Socios List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Carregando sócios...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Ingresso</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {socios.map((socio) => (
                        <SocioRow
                          key={socio.id}
                          socio={socio}
                          onEdit={(socio) => setEditingSocio(socio)}
                          onDelete={deleteSocio}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <ImportTab onImportSuccess={() => {
            fetchStats();
            fetchSocios();
          }} />
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <SocioModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchStats();
            fetchSocios();
          }}
        />
      )}

      {editingSocio && (
        <SocioModal
          socio={editingSocio}
          onClose={() => setEditingSocio(null)}
          onSuccess={() => {
            setEditingSocio(null);
            fetchStats();
            fetchSocios();
          }}
        />
      )}
    </div>
  );
}

// Components
function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className={`${colorClasses[color]} p-6 rounded-lg`}>
      <div className="flex items-center">
        <div className="text-2xl mr-3">{icon}</div>
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SocioRow({ socio, onEdit, onDelete }) {
  const getStatusBadge = (categoria) => {
    const badges = {
      ativo: 'bg-green-100 text-green-800',
      inativo: 'bg-red-100 text-red-800',
      normal: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badges[categoria]}`}>
        {categoria}
      </span>
    );
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{socio.nome}</div>
        {socio.endereco && <div className="text-sm text-gray-500">{socio.endereco}</div>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{socio.email}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{socio.telefone || '-'}</td>
      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(socio.categoria)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(socio.data_ingresso).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onEdit(socio)}
          className="text-blue-600 hover:text-blue-900 mr-3"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(socio.id)}
          className="text-red-600 hover:text-red-900"
        >
          🗑️
        </button>
      </td>
    </tr>
  );
}

function SocioModal({ socio, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nome: socio?.nome || '',
    email: socio?.email || '',
    telefone: socio?.telefone || '',
    categoria: socio?.categoria || 'ativo',
    data_ingresso: socio?.data_ingresso || new Date().toISOString().split('T')[0],
    endereco: socio?.endereco || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = socio 
        ? `${API_BASE}/api/socios/${socio.id}`
        : `${API_BASE}/api/socios`;
      
      const method = socio ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Erro: ${error.detail}`);
      }
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md bg-white rounded-md shadow-lg">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {socio ? 'Editar Sócio' : 'Adicionar Sócio'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Ingresso *</label>
              <input
                type="date"
                required
                value={formData.data_ingresso}
                onChange={(e) => setFormData({...formData, data_ingresso: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Endereço</label>
              <textarea
                value={formData.endereco}
                onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                rows="3"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : (socio ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ImportTab({ onImportSuccess }) {
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!importData.trim()) {
      alert('Por favor, cole os dados para importar');
      return;
    }

    setLoading(true);
    try {
      // Parse CSV-like data
      const lines = importData.trim().split('\n');
      const socios = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('\t'); // Tab separated
        if (parts.length >= 3) {
          const socio = {
            nome: parts[0] || '',
            email: parts[1] || '',
            telefone: parts[2] || '',
            categoria: parts[3] || 'ativo',
            data_ingresso: parts[4] || new Date().toISOString().split('T')[0],
            endereco: parts[5] || ''
          };

          if (socio.nome && socio.email) {
            socios.push(socio);
          }
        }
      }

      if (socios.length === 0) {
        alert('Nenhum dado válido encontrado');
        return;
      }

      const response = await fetch(`${API_BASE}/api/socios/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(socios),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`${result.created_count} sócios importados com sucesso!`);
        setImportData('');
        onImportSuccess();
      } else {
        alert(`Erro: ${result.detail}`);
      }
    } catch (error) {
      alert(`Erro na importação: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Importar Sócios</h2>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Formato dos Dados</h3>
        <p className="text-gray-600 mb-4">
          Cole os dados no formato: Nome [TAB] Email [TAB] Telefone [TAB] Status [TAB] Data [TAB] Endereço
        </p>
        
        <div className="bg-gray-50 p-3 rounded text-sm font-mono mb-4">
          João Silva&nbsp;&nbsp;&nbsp;&nbsp;joao@email.com&nbsp;&nbsp;&nbsp;&nbsp;123456789&nbsp;&nbsp;&nbsp;&nbsp;ativo&nbsp;&nbsp;&nbsp;&nbsp;2023-01-15&nbsp;&nbsp;&nbsp;&nbsp;Rua A, 123<br/>
          Maria Santos&nbsp;&nbsp;&nbsp;&nbsp;maria@email.com&nbsp;&nbsp;&nbsp;&nbsp;987654321&nbsp;&nbsp;&nbsp;&nbsp;ativo&nbsp;&nbsp;&nbsp;&nbsp;2023-02-20&nbsp;&nbsp;&nbsp;&nbsp;Rua B, 456
        </div>

        <textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder="Cole aqui os dados dos sócios para importar..."
          rows="10"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleImport}
            disabled={loading || !importData.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Importar Sócios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;