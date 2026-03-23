'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Cliente } from '@/lib/types'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

interface ClienteForm {
  nome: string
  cpf: string
  email: string
  telefone: string
}

const emptyForm: ClienteForm = { nome: '', cpf: '', email: '', telefone: '' }

export default function ClientesPage() {
  const supabase = createClient()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClienteForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('clientes').select('*').order('nome')
    if (search) {
      query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`)
    }
    const { data, error } = await query
    if (error) toast.error('Erro ao carregar clientes')
    else setClientes(data || [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(fetchClientes, 300)
    return () => clearTimeout(timer)
  }, [fetchClientes])

  const openNew = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (cliente: Cliente) => {
    setForm({
      nome: cliente.nome,
      cpf: cliente.cpf || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
    })
    setEditingId(cliente.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome: form.nome.trim(),
            cpf: form.cpf.trim() || null,
            email: form.email.trim() || null,
            telefone: form.telefone.trim() || null,
          })
          .eq('id', editingId)

        if (error) throw error
        toast.success('Cliente atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('clientes').insert({
          nome: form.nome.trim(),
          cpf: form.cpf.trim() || null,
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          data_cadastro: new Date().toISOString(),
        })
        if (error) throw error
        toast.success('Cliente cadastrado com sucesso!')
      }

      closeForm()
      fetchClientes()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error
      toast.success('Cliente removido')
      setDeleteConfirm(null)
      fetchClientes()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover cliente')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-forest-700 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Carregando...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
            <button
              onClick={openNew}
              className="mt-3 text-sm text-forest-600 hover:underline"
            >
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Cadastro</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="font-medium text-gray-900">{cliente.nome}</td>
                    <td className="text-gray-600">{cliente.cpf || <span className="text-gray-300">—</span>}</td>
                    <td className="text-gray-600">{cliente.email || <span className="text-gray-300">—</span>}</td>
                    <td className="text-gray-600">{cliente.telefone || <span className="text-gray-300">—</span>}</td>
                    <td className="text-gray-500 text-xs">{formatDate(cliente.data_cadastro)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cliente)}
                          className="p-1.5 text-gray-400 hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cliente.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
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
  )
}
