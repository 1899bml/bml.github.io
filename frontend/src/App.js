import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [socios, setSocios] = useState([]);
  const [stats, setStats] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingSocio, setEditingSocio] = useState(null);
  const [editingField, setEditingField] = useState(null);
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

  const fetchCustomFields = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/custom-fields`);
      const data = await response.json();
      setCustomFields(data);
    } catch (error) {
      console.error('Erro ao buscar campos customizados:', error);
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

  const deleteCustomField = async (fieldId) => {
    if (!window.confirm('Tem certeza? Isso removerá o campo de todos os sócios.')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/custom-fields/${fieldId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchCustomFields();
        await fetchSocios();
      }
    } catch (error) {
      console.error('Erro ao deletar campo:', error);
    }
  };

  const exportSocios = async (format) => {
    try {
      const response = await fetch(`${API_BASE}/api/socios/export?format=${format}&include_custom_fields=true`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `socios_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const downloadTemplate = async (format) => {
    try {
      const response = await fetch(`${API_BASE}/api/socios/template?format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `template_socios.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao baixar template:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCustomFields();
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
              <p className="text-gray-600 mt-1">Associação de Membros - Com Campos Customizáveis</p>
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
              { id: 'campos', label: 'Campos', icon: '🔧' },
              { id: 'import-export', label: 'Import/Export', icon: '📁' }
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
          <DashboardTab stats={stats} setActiveTab={setActiveTab} setShowAddModal={setShowAddModal} />
        )}

        {/* Socios Tab */}
        {activeTab === 'socios' && (
          <SociosTab
            socios={socios}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            customFields={customFields}
            setShowAddModal={setShowAddModal}
            setEditingSocio={setEditingSocio}
            deleteSocio={deleteSocio}
          />
        )}

        {/* Campos Tab */}
        {activeTab === 'campos' && (
          <CamposTab
            customFields={customFields}
            setShowFieldModal={setShowFieldModal}
            setEditingField={setEditingField}
            deleteCustomField={deleteCustomField}
          />
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <ImportExportTab
            exportSocios={exportSocios}
            downloadTemplate={downloadTemplate}
            onImportSuccess={() => {
              fetchStats();
              fetchSocios();
            }}
          />
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <SocioModal
          customFields={customFields}
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
          customFields={customFields}
          onClose={() => setEditingSocio(null)}
          onSuccess={() => {
            setEditingSocio(null);
            fetchStats();
            fetchSocios();
          }}
        />
      )}

      {showFieldModal && (
        <CustomFieldModal
          onClose={() => setShowFieldModal(false)}
          onSuccess={() => {
            setShowFieldModal(false);
            fetchCustomFields();
          }}
        />
      )}

      {editingField && (
        <CustomFieldModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onSuccess={() => {
            setEditingField(null);
            fetchCustomFields();
          }}
        />
      )}
    </div>
  );
}

// Dashboard Component
function DashboardTab({ stats, setActiveTab, setShowAddModal }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard title="Total Sócios" value={stats.total_socios} icon="👥" color="blue" />
            <StatCard title="Ativos" value={stats.ativos} icon="✅" color="green" />
            <StatCard title="Inativos" value={stats.inativos} icon="❌" color="red" />
            <StatCard title="Normal" value={stats.normais} icon="⭐" color="yellow" />
            <StatCard title="Novos (Mês)" value={stats.novos_este_mes} icon="🆕" color="purple" />
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickActionButton
              onClick={() => {
                setActiveTab('socios');
                setShowAddModal(true);
              }}
              icon="➕"
              text="Adicionar Sócio"
              color="blue"
            />
            <QuickActionButton
              onClick={() => setActiveTab('socios')}
              icon="👥"
              text="Ver Todos os Sócios"
              color="green"
            />
            <QuickActionButton
              onClick={() => setActiveTab('campos')}
              icon="🔧"
              text="Gerenciar Campos"
              color="purple"
            />
            <QuickActionButton
              onClick={() => setActiveTab('import-export')}
              icon="📁"
              text="Import/Export"
              color="orange"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Socios Tab Component
function SociosTab({ socios, loading, filters, setFilters, customFields, setShowAddModal, setEditingSocio, deleteSocio }) {
  return (
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
        <SociosTable socios={socios} customFields={customFields} setEditingSocio={setEditingSocio} deleteSocio={deleteSocio} />
      )}
    </div>
  );
}

// Campos Tab Component
function CamposTab({ customFields, setShowFieldModal, setEditingField, deleteCustomField }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Campos Customizados</h2>
        <button
          onClick={() => setShowFieldModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
        >
          <span className="mr-2">➕</span>
          Adicionar Campo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {customFields.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">🔧</div>
            <p>Nenhum campo customizado criado ainda.</p>
            <p className="text-sm mt-2">Adicione campos personalizados para coletar informações específicas dos seus sócios.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obrigatório</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{field.label}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <FieldTypeBadge type={field.field_type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {field.required ? '✅ Sim' : '❌ Não'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingField(field)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteCustomField(field.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Import/Export Tab Component
function ImportExportTab({ exportSocios, downloadTemplate, onImportSuccess }) {
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!importFile) {
      alert('Por favor, selecione um arquivo');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(`${API_BASE}/api/socios/import`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Importação concluída!\n${result.message}\n\n${result.errors.length > 0 ? 'Erros:\n' + result.errors.join('\n') : ''}`);
        setImportFile(null);
        onImportSuccess();
      } else {
        alert(`Erro: ${result.detail}`);
      }
    } catch (error) {
      alert(`Erro na importação: ${error.message}`);
    }
    
    setImporting(false);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Importar e Exportar Dados</h2>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📤 Exportar Sócios</h3>
        <p className="text-gray-600 mb-6">Baixe todos os dados dos sócios em formato Excel ou CSV</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportButton
            onClick={() => exportSocios('excel')}
            icon="📊"
            title="Exportar para Excel"
            description="Arquivo .xlsx com formatação"
            color="green"
          />
          <ExportButton
            onClick={() => exportSocios('csv')}
            icon="📋"
            title="Exportar para CSV"
            description="Arquivo .csv simples"
            color="blue"
          />
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📥 Importar Sócios</h3>
        <p className="text-gray-600 mb-6">Envie um arquivo Excel ou CSV com dados dos sócios</p>
        
        {/* Template Download */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Baixar Template</h4>
          <p className="text-blue-700 text-sm mb-3">Baixe um modelo com a estrutura correta para importação</p>
          <div className="flex space-x-4">
            <button
              onClick={() => downloadTemplate('excel')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Template Excel
            </button>
            <button
              onClick={() => downloadTemplate('csv')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Template CSV
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar arquivo (.xlsx, .xls, .csv)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setImportFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {importFile && (
          <div className="mb-4 p-3 bg-green-50 rounded-md">
            <p className="text-green-700 text-sm">
              ✅ Arquivo selecionado: {importFile.name}
            </p>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!importFile || importing}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? 'Importando...' : 'Importar Arquivo'}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h4 className="font-medium text-yellow-900 mb-2">📋 Instruções de Importação</h4>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• <strong>Campos obrigatórios:</strong> nome e email</li>
          <li>• <strong>Formatos aceitos:</strong> Excel (.xlsx, .xls) e CSV</li>
          <li>• <strong>Categoria:</strong> deve ser "ativo", "inativo" ou "normal"</li>
          <li>• <strong>Data:</strong> formato AAAA-MM-DD (ex: 2024-01-15)</li>
          <li>• <strong>Emails duplicados:</strong> serão ignorados automaticamente</li>
          <li>• <strong>Campos customizados:</strong> incluídos automaticamente no template</li>
        </ul>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className={`${colorClasses[color]} p-6 rounded-lg stat-card`}>
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

function QuickActionButton({ onClick, icon, text, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center px-4 py-3 ${colorClasses[color]} rounded-lg transition-colors`}
    >
      <span className="mr-2">{icon}</span>
      {text}
    </button>
  );
}

function ExportButton({ onClick, icon, title, description, color }) {
  const colorClasses = {
    green: 'border-green-200 hover:bg-green-50',
    blue: 'border-blue-200 hover:bg-blue-50'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 border-2 ${colorClasses[color]} rounded-lg transition-colors text-left`}
    >
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-3">{icon}</span>
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

function FieldTypeBadge({ type }) {
  const badges = {
    text: { label: 'Texto', color: 'bg-gray-100 text-gray-800' },
    email: { label: 'Email', color: 'bg-blue-100 text-blue-800' },
    phone: { label: 'Telefone', color: 'bg-green-100 text-green-800' },
    date: { label: 'Data', color: 'bg-purple-100 text-purple-800' },
    select: { label: 'Seleção', color: 'bg-orange-100 text-orange-800' },
    textarea: { label: 'Texto Longo', color: 'bg-yellow-100 text-yellow-800' },
    number: { label: 'Número', color: 'bg-red-100 text-red-800' }
  };

  const badge = badges[type] || badges.text;
  
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.color}`}>
      {badge.label}
    </span>
  );
}

function SociosTable({ socios, customFields, setEditingSocio, deleteSocio }) {
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
              {customFields.map(field => (
                <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {field.label}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {socios.map((socio) => (
              <tr key={socio.id} className="hover:bg-gray-50 table-row">
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
                {customFields.map(field => (
                  <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {socio.custom_fields?.[field.id] || '-'}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="action-buttons">
                    <button
                      onClick={() => setEditingSocio(socio)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteSocio(socio.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Modal Components
function SocioModal({ socio, customFields, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nome: socio?.nome || '',
    email: socio?.email || '',
    telefone: socio?.telefone || '',
    categoria: socio?.categoria || 'ativo',
    data_ingresso: socio?.data_ingresso || new Date().toISOString().split('T')[0],
    endereco: socio?.endereco || '',
    custom_fields: socio?.custom_fields || {}
  });
  const [loading, setLoading] = useState(false);

  const handleCustomFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldId]: value
      }
    }));
  };

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
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-md shadow-lg">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {socio ? 'Editar Sócio' : 'Adicionar Sócio'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Standard Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Endereço</label>
              <textarea
                value={formData.endereco}
                onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                rows="2"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Campos Personalizados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map(field => (
                    <CustomFieldInput
                      key={field.id}
                      field={field}
                      value={formData.custom_fields[field.id] || ''}
                      onChange={(value) => handleCustomFieldChange(field.id, value)}
                    />
                  ))}
                </div>
              </div>
            )}

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

function CustomFieldModal({ field, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    id: field?.id || `field_${Date.now()}`,
    name: field?.name || '',
    label: field?.label || '',
    field_type: field?.field_type || 'text',
    required: field?.required || false,
    options: field?.options || [],
    default_value: field?.default_value || '',
    order: field?.order || 0
  });
  const [optionText, setOptionText] = useState('');
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (optionText.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, optionText.trim()]
      }));
      setOptionText('');
    }
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = field 
        ? `${API_BASE}/api/custom-fields/${field.id}`
        : `${API_BASE}/api/custom-fields`;
      
      const method = field ? 'PUT' : 'POST';
      
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
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg bg-white rounded-md shadow-lg">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {field ? 'Editar Campo' : 'Adicionar Campo'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome do Campo *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="ex: profissao"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Nome interno único (sem espaços ou caracteres especiais)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Label de Exibição *</label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => setFormData({...formData, label: e.target.value})}
                placeholder="ex: Profissão"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo do Campo</label>
              <select
                value={formData.field_type}
                onChange={(e) => setFormData({...formData, field_type: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="text">Texto</option>
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
                <option value="number">Número</option>
                <option value="date">Data</option>
                <option value="textarea">Texto Longo</option>
                <option value="select">Lista de Opções</option>
              </select>
            </div>

            {formData.field_type === 'select' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Opções</label>
                <div className="flex mb-2">
                  <input
                    type="text"
                    value={optionText}
                    onChange={(e) => setOptionText(e.target.value)}
                    placeholder="Digite uma opção..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded">
                      <span>{option}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) => setFormData({...formData, required: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="required" className="text-sm text-gray-700">Campo obrigatório</label>
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : (field ? 'Salvar' : 'Criar Campo')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CustomFieldInput({ field, value, onChange }) {
  const renderInput = () => {
    const baseClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
    
    switch (field.field_type) {
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClasses}
          />
        );
      case 'phone':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClasses}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClasses}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClasses}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            rows="3"
            className={baseClasses}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClasses}
          >
            <option value="">Selecione...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {renderInput()}
    </div>
  );
}

export default App;