'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getTodayString } from '@/lib/utils'
import type { FinanceiroNota, FinanceiroSaida, Categoria, CentroCusto } from '@/lib/types'
import {
  DollarSign,
  FileText,
  TrendingDown,
  Tag,
  Plus,
  X,
  Save,
  Trash2,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

type Tab = 'notas' | 'saidas' | 'categorias'

export default function FinanceiroPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('notas')

  // Notas Fiscais state
  const [notas, setNotas] = useState<FinanceiroNota[]>([])
  const [notasLoading, setNotasLoading] = useState(true)
  const [showNotaForm, setShowNotaForm] = useState(false)
  const [notaForm, setNotaForm] = useState({
    nota_fiscal: '',
    data_emissao: getTodayString(),
    fornecedor: '',
    tipo: 'Compra' as 'Compra' | 'Consignado',
    valor_total: '',
    status: 'Ativa' as 'Ativa' | 'Cancelada' | 'Devolvida',
  })

  // Saídas state
  const [saidas, setSaidas] = useState<FinanceiroSaida[]>([])
  const [saidasLoading, setSaidasLoading] = useState(true)
  const [showSaidaForm, setShowSaidaForm] = useState(false)
  const [saidaForm, setSaidaForm] = useState({
    data: getTodayString(),
    descricao: '',
    valor: '',
    categoria: '',
    centro_custo: '',
  })
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([])

  // Config tab state
  const [newCategoria, setNewCategoria] = useState('')
  const [newCentroCusto, setNewCentroCusto] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchNotas = useCallback(async () => {
    setNotasLoading(true)
    const { data } = await supabase
      .from('financeiro_notas')
      .select('*')
      .order('data_emissao', { ascending: false })
    setNotas(data || [])
    setNotasLoading(false)
  }, [])

  const fetchSaidas = useCallback(async () => {
    setSaidasLoading(true)
    const { data } = await supabase
      .from('financeiro_saidas')
      .select('*')
      .order('data', { ascending: false })
    setSaidas(data || [])
    setSaidasLoading(false)
  }, [])

  const fetchCategorias = useCallback(async () => {
    const [cats, centros] = await Promise.all([
      supabase.from('categorias').select('*').order('nome'),
      supabase.from('centros_custo').select('*').order('nome'),
    ])
    setCategorias(cats.data || [])
    setCentrosCusto(centros.data || [])
  }, [])

  useEffect(() => {
    fetchNotas()
    fetchSaidas()
    fetchCategorias()
  }, [fetchNotas, fetchSaidas, fetchCategorias])

  const handleSaveNota = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('financeiro_notas').insert({
        nota_fiscal: notaForm.nota_fiscal,
        data_emissao: notaForm.data_emissao,
        fornecedor: notaForm.fornecedor,
        tipo: notaForm.tipo,
        valor_total: parseFloat(notaForm.valor_total.replace(',', '.')) || 0,
        status: notaForm.status,
      })
      if (error) throw error
      toast.success('Nota fiscal registrada!')
      setShowNotaForm(false)
      setNotaForm({
        nota_fiscal: '', data_emissao: getTodayString(),
        fornecedor: '', tipo: 'Compra', valor_total: '', status: 'Ativa',
      })
      fetchNotas()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar nota')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSaida = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('financeiro_saidas').insert({
        data: saidaForm.data,
        descricao: saidaForm.descricao,
        valor: parseFloat(saidaForm.valor.replace(',', '.')) || 0,
        categoria: saidaForm.categoria || null,
        centro_custo: saidaForm.centro_custo || null,
      })
      if (error) throw error
      toast.success('Despesa registrada!')
      setShowSaidaForm(false)
      setSaidaForm({ data: getTodayString(), descricao: '', valor: '', categoria: '', centro_custo: '' })
      fetchSaidas()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar despesa')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSaida = async (id: string) => {
    const { error } = await supabase.from('financeiro_saidas').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Despesa excluída')
      fetchSaidas()
    }
  }

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoria.trim()) return
    const { error } = await supabase.from('categorias').insert({ nome: newCategoria.trim() })
    if (error) toast.error('Categoria já existe ou erro ao salvar')
    else {
      toast.success('Categoria adicionada!')
      setNewCategoria('')
      fetchCategorias()
    }
  }

  const handleAddCentroCusto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCentroCusto.trim()) return
    const { error } = await supabase.from('centros_custo').insert({ nome: newCentroCusto.trim() })
    if (error) toast.error('Centro de custo já existe ou erro ao salvar')
    else {
      toast.success('Centro de custo adicionado!')
      setNewCentroCusto('')
      fetchCategorias()
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Categoria excluída')
      fetchCategorias()
    }
  }

  const handleDeleteCentroCusto = async (id: string) => {
    const { error } = await supabase.from('centros_custo').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Centro de custo excluído')
      fetchCategorias()
    }
  }

  const totalNotas = notas.filter((n) => n.status === 'Ativa').reduce((s, n) => s + n.valor_total, 0)
  const totalSaidas = saidas.reduce((s, n) => s + n.valor, 0)

  const tabs = [
    { id: 'notas' as Tab, label: 'Notas Fiscais', icon: FileText },
    { id: 'saidas' as Tab, label: 'Saídas/Despesas', icon: TrendingDown },
    { id: 'categorias' as Tab, label: 'Categorias', icon: Settings },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Controle de notas fiscais e despesas</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-forest-700" />
            <p className="text-xs text-gray-500 font-medium">Total em Notas (Ativas)</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalNotas)}</p>
          <p className="text-xs text-gray-400">{notas.filter((n) => n.status === 'Ativa').length} notas</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Total de Despesas</p>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalSaidas)}</p>
          <p className="text-xs text-gray-400">{saidas.length} lançamentos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-forest-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ===== NOTAS FISCAIS TAB ===== */}
      {activeTab === 'notas' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNotaForm(true)}
              className="flex items-center gap-2 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Nova Nota
            </button>
          </div>

          {showNotaForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="font-semibold text-gray-900">Registrar Nota Fiscal</h2>
                  <button onClick={() => setShowNotaForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveNota} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nº da Nota *</label>
                      <input
                        type="text"
                        required
                        value={notaForm.nota_fiscal}
                        onChange={(e) => setNotaForm({ ...notaForm, nota_fiscal: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Data Emissão *</label>
                      <input
                        type="date"
                        required
                        value={notaForm.data_emissao}
                        onChange={(e) => setNotaForm({ ...notaForm, data_emissao: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor *</label>
                    <input
                      type="text"
                      required
                      value={notaForm.fornecedor}
                      onChange={(e) => setNotaForm({ ...notaForm, fornecedor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={notaForm.tipo}
                        onChange={(e) => setNotaForm({ ...notaForm, tipo: e.target.value as 'Compra' | 'Consignado' })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      >
                        <option value="Compra">Compra</option>
                        <option value="Consignado">Consignado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor Total *</label>
                      <input
                        type="text"
                        required
                        value={notaForm.valor_total}
                        onChange={(e) => setNotaForm({ ...notaForm, valor_total: e.target.value })}
                        placeholder="0,00"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={notaForm.status}
                        onChange={(e) => setNotaForm({ ...notaForm, status: e.target.value as 'Ativa' | 'Cancelada' | 'Devolvida' })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      >
                        <option value="Ativa">Ativa</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="Devolvida">Devolvida</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowNotaForm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-70">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container">
            {notasLoading ? (
              <div className="py-16 text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-forest-700 border-t-transparent rounded-full mx-auto mb-3" />
              </div>
            ) : notas.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma nota fiscal registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nº Nota</th>
                      <th>Data Emissão</th>
                      <th>Fornecedor</th>
                      <th>Tipo</th>
                      <th className="text-right">Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notas.map((nota) => (
                      <tr key={nota.id}>
                        <td className="font-mono text-sm font-medium text-gray-900">{nota.nota_fiscal}</td>
                        <td className="text-sm">{formatDate(nota.data_emissao)}</td>
                        <td className="text-sm">{nota.fornecedor}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            nota.tipo === 'Compra' ? 'bg-forest-100 text-forest-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {nota.tipo}
                          </span>
                        </td>
                        <td className="text-right font-semibold text-forest-700">{formatCurrency(nota.valor_total)}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            nota.status === 'Ativa' ? 'bg-green-100 text-green-700'
                            : nota.status === 'Cancelada' ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {nota.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SAIDAS TAB ===== */}
      {activeTab === 'saidas' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowSaidaForm(true)}
              className="flex items-center gap-2 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Nova Despesa
            </button>
          </div>

          {showSaidaForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h2 className="font-semibold text-gray-900">Registrar Despesa</h2>
                  <button onClick={() => setShowSaidaForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveSaida} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
                      <input
                        type="date"
                        required
                        value={saidaForm.data}
                        onChange={(e) => setSaidaForm({ ...saidaForm, data: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor *</label>
                      <input
                        type="text"
                        required
                        value={saidaForm.valor}
                        onChange={(e) => setSaidaForm({ ...saidaForm, valor: e.target.value })}
                        placeholder="0,00"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descrição *</label>
                    <input
                      type="text"
                      required
                      value={saidaForm.descricao}
                      onChange={(e) => setSaidaForm({ ...saidaForm, descricao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                      <select
                        value={saidaForm.categoria}
                        onChange={(e) => setSaidaForm({ ...saidaForm, categoria: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      >
                        <option value="">Selecionar...</option>
                        {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Centro de Custo</label>
                      <select
                        value={saidaForm.centro_custo}
                        onChange={(e) => setSaidaForm({ ...saidaForm, centro_custo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                      >
                        <option value="">Selecionar...</option>
                        {centrosCusto.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowSaidaForm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-70">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container">
            {saidasLoading ? (
              <div className="py-16 text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-forest-700 border-t-transparent rounded-full mx-auto mb-3" />
              </div>
            ) : saidas.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma despesa registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Centro de Custo</th>
                      <th className="text-right">Valor</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saidas.map((saida) => (
                      <tr key={saida.id}>
                        <td className="text-sm text-gray-500">{formatDate(saida.data)}</td>
                        <td className="text-sm font-medium text-gray-900">{saida.descricao}</td>
                        <td>
                          {saida.categoria ? (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{saida.categoria}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-sm text-gray-500">{saida.centro_custo || <span className="text-gray-300">—</span>}</td>
                        <td className="text-right font-semibold text-red-600">{formatCurrency(saida.valor)}</td>
                        <td>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDeleteSaida(saida.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CATEGORIAS TAB ===== */}
      {activeTab === 'categorias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categorias */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-forest-700" />
              Categorias
            </h3>
            <form onSubmit={handleAddCategoria} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
                placeholder="Nova categoria..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
              />
              <button
                type="submit"
                className="p-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <div className="space-y-1">
              {categorias.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{cat.nome}</span>
                  <button
                    onClick={() => handleDeleteCategoria(cat.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Centros de Custo */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-lemon-500" />
              Centros de Custo
            </h3>
            <form onSubmit={handleAddCentroCusto} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCentroCusto}
                onChange={(e) => setNewCentroCusto(e.target.value)}
                placeholder="Novo centro de custo..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
              />
              <button
                type="submit"
                className="p-2 bg-lemon-500 hover:bg-lemon-600 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <div className="space-y-1">
              {centrosCusto.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{cc.nome}</span>
                  <button
                    onClick={() => handleDeleteCentroCusto(cc.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
