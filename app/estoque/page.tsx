'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, parseNFeXML } from '@/lib/utils'
import type { Estoque } from '@/lib/types'
import {
  Package,
  Upload,
  Download,
  Search,
  Pencil,
  Save,
  X,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

type TipoFiltro = 'Todos' | 'Próprio' | 'Consignado' | 'Zerado'

interface NFeImportItem {
  codigo: string
  descricao: string
  ean: string
  quantidade: number
  preco_unitario: number
  valor_total: number
  selected: boolean
  categoria: string
  preco_venda: number
}

export default function EstoquePage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [estoque, setEstoque] = useState<Estoque[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('Todos')
  const [categorias, setCategorias] = useState<string[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPreco, setEditPreco] = useState('')

  // NFe Import state
  const [showImport, setShowImport] = useState(false)
  const [nfeData, setNfeData] = useState<{
    numero_nota: string
    data_emissao: string
    fornecedor: string
    valor_total: number
    items: NFeImportItem[]
    tipo: 'Compra' | 'Consignado'
  } | null>(null)
  const [importLoading, setImportLoading] = useState(false)

  const fetchEstoque = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('estoque').select('*').order('livro')

    if (search) {
      query = query.or(`livro.ilike.%${search}%,codigo.ilike.%${search}%,ean.ilike.%${search}%`)
    }
    if (filtroCategoria) {
      query = query.eq('categoria', filtroCategoria)
    }
    if (tipoFiltro === 'Próprio') {
      query = query.gt('quantidade', 0)
    } else if (tipoFiltro === 'Consignado') {
      query = query.gt('qtd_consignado', 0)
    } else if (tipoFiltro === 'Zerado') {
      query = query.eq('quantidade', 0).eq('qtd_consignado', 0)
    }

    const { data, error } = await query
    if (error) toast.error('Erro ao carregar estoque')
    else {
      setEstoque(data || [])
      // Extract unique categories
      const cats = [...new Set((data || []).map((e) => e.categoria).filter(Boolean))] as string[]
      setCategorias(cats.sort())
    }
    setLoading(false)
  }, [search, filtroCategoria, tipoFiltro])

  useEffect(() => {
    const timer = setTimeout(fetchEstoque, 300)
    return () => clearTimeout(timer)
  }, [fetchEstoque])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.xml')) {
      toast.error('Selecione um arquivo XML de NF-e')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const xml = ev.target?.result as string
        const parsed = parseNFeXML(xml)

        setNfeData({
          ...parsed,
          tipo: 'Compra',
          items: parsed.items.map((item) => ({
            ...item,
            selected: true,
            categoria: '',
            preco_venda: Math.ceil(item.preco_unitario * 1.4 * 100) / 100, // 40% markup default
          })),
        })
        setShowImport(true)
        toast.success(`NF-e carregada: ${parsed.items.length} itens`)
      } catch {
        toast.error('Erro ao processar XML. Verifique se é uma NF-e válida.')
      }
    }
    reader.readAsText(file, 'UTF-8')

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImport = async () => {
    if (!nfeData) return
    const selectedItems = nfeData.items.filter((i) => i.selected)
    if (selectedItems.length === 0) {
      toast.error('Selecione ao menos um item')
      return
    }

    setImportLoading(true)
    try {
      // Create nota fiscal (ignore duplicate error)
      const { error: notaError } = await supabase.from('financeiro_notas').insert({
        nota_fiscal: nfeData.numero_nota,
        data_emissao: nfeData.data_emissao || new Date().toISOString().substring(0, 10),
        fornecedor: nfeData.fornecedor,
        tipo: nfeData.tipo,
        valor_total: nfeData.valor_total,
        status: 'Ativa',
      })
      if (notaError && notaError.code !== '23505') {
        throw new Error(`Erro ao salvar nota fiscal: ${notaError.message}`)
      }

      // Insert/upsert stock items
      for (const item of selectedItems) {
        // Use maybeSingle to avoid error when no row is found
        const orFilter = item.ean
          ? `ean.eq.${item.ean},codigo.eq.${item.codigo}`
          : `codigo.eq.${item.codigo}`

        const { data: existing, error: findError } = await supabase
          .from('estoque')
          .select('id, quantidade, qtd_consignado')
          .or(orFilter)
          .maybeSingle()

        if (findError) throw new Error(`Erro ao buscar item "${item.descricao}": ${findError.message}`)

        if (existing) {
          const updateData = nfeData.tipo === 'Compra'
            ? { quantidade: (existing.quantidade || 0) + item.quantidade }
            : { qtd_consignado: (existing.qtd_consignado || 0) + item.quantidade }

          const { error: updateError } = await supabase
            .from('estoque')
            .update(updateData)
            .eq('id', existing.id)

          if (updateError) throw new Error(`Erro ao atualizar "${item.descricao}": ${updateError.message}`)
        } else {
          const { error: insertError } = await supabase.from('estoque').insert({
            codigo: item.codigo,
            livro: item.descricao,
            ean: item.ean || null,
            categoria: item.categoria || null,
            quantidade: nfeData.tipo === 'Compra' ? item.quantidade : 0,
            qtd_consignado: nfeData.tipo === 'Consignado' ? item.quantidade : 0,
            preco_custo: item.preco_unitario,
            preco_venda: item.preco_venda,
            nota_fiscal: nfeData.numero_nota,
          })

          if (insertError) throw new Error(`Erro ao inserir "${item.descricao}": ${insertError.message}`)
        }
      }

      toast.success(`${selectedItems.length} itens importados com sucesso!`)
      setShowImport(false)
      setNfeData(null)
      fetchEstoque()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar NF-e')
    } finally {
      setImportLoading(false)
    }
  }

  const handleSavePreco = async (id: string) => {
    const preco = parseFloat(editPreco.replace(',', '.'))
    if (isNaN(preco) || preco < 0) {
      toast.error('Preço inválido')
      return
    }
    const { error } = await supabase
      .from('estoque')
      .update({ preco_venda: preco })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao atualizar preço')
    } else {
      toast.success('Preço atualizado!')
      setEditingId(null)
      fetchEstoque()
    }
  }

  const totalEstoque = estoque.reduce((sum, e) => sum + (e.quantidade || 0), 0)
  const totalConsignado = estoque.reduce((sum, e) => sum + (e.qtd_consignado || 0), 0)
  const valorEstoque = estoque.reduce((sum, e) => sum + (e.quantidade || 0) * (e.preco_venda || 0), 0)

  const handleExportCSV = () => {
    const headers = ['Título', 'Código', 'EAN', 'Categoria', 'Qtd Próprio', 'Qtd Consignado', 'Preço Custo', 'Preço Venda', 'Nota Fiscal']
    const rows = estoque.map((e) => [
      `"${(e.livro || '').replace(/"/g, '""')}"`,
      e.codigo || '',
      e.ean || '',
      e.categoria || '',
      e.quantidade ?? 0,
      e.qtd_consignado ?? 0,
      (e.preco_custo ?? 0).toFixed(2).replace('.', ','),
      (e.preco_venda ?? 0).toFixed(2).replace('.', ','),
      e.nota_fiscal || '',
    ])
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estoque_${new Date().toISOString().substring(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque & XML</h1>
          <p className="text-gray-500 text-sm mt-1">{estoque.length} títulos</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={handleExportCSV}
            disabled={estoque.length === 0}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-lemon-500 hover:bg-lemon-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar XML NF-e
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="kpi-card">
          <p className="text-xs text-gray-500">Estoque Próprio</p>
          <p className="text-xl font-bold text-forest-700 mt-1">{totalEstoque}</p>
          <p className="text-xs text-gray-400">unidades</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-500">Consignado</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{totalConsignado}</p>
          <p className="text-xs text-gray-400">unidades</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-500">Valor Estoque (venda)</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(valorEstoque)}</p>
          <p className="text-xs text-gray-400">estoque próprio</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, código ou EAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {(['Todos', 'Próprio', 'Consignado', 'Zerado'] as TipoFiltro[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipoFiltro(t)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  tipoFiltro === t
                    ? 'bg-forest-700 text-white'
                    : 'border border-gray-200 text-gray-600 hover:border-forest-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* NFe Import Modal */}
      {showImport && nfeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-forest-700" />
                  Importar NF-e
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Nota: {nfeData.numero_nota} | Fornecedor: {nfeData.fornecedor} | Total: {formatCurrency(nfeData.valor_total)}
                </p>
              </div>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Tipo:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNfeData({ ...nfeData, tipo: 'Compra' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    nfeData.tipo === 'Compra'
                      ? 'bg-forest-700 text-white'
                      : 'border border-gray-200 text-gray-600'
                  }`}
                >
                  Compra (Estoque Próprio)
                </button>
                <button
                  onClick={() => setNfeData({ ...nfeData, tipo: 'Consignado' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    nfeData.tipo === 'Consignado'
                      ? 'bg-amber-500 text-white'
                      : 'border border-gray-200 text-gray-600'
                  }`}
                >
                  Consignado
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={nfeData.items.every((i) => i.selected)}
                        onChange={(e) =>
                          setNfeData({
                            ...nfeData,
                            items: nfeData.items.map((i) => ({ ...i, selected: e.target.checked })),
                          })
                        }
                        className="rounded"
                      />
                    </th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-right">P. Custo</th>
                    <th className="text-right">P. Venda</th>
                  </tr>
                </thead>
                <tbody>
                  {nfeData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const updated = [...nfeData.items]
                            updated[idx] = { ...item, selected: e.target.checked }
                            setNfeData({ ...nfeData, items: updated })
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="font-mono text-xs">{item.codigo}</td>
                      <td className="text-sm max-w-[250px] truncate" title={item.descricao}>
                        {item.descricao}
                      </td>
                      <td className="text-center">{item.quantidade}</td>
                      <td className="text-right text-sm">{formatCurrency(item.preco_unitario)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.preco_venda}
                            onChange={(e) => {
                              const updated = [...nfeData.items]
                              updated[idx] = { ...item, preco_venda: parseFloat(e.target.value) || 0 }
                              setNfeData({ ...nfeData, items: updated })
                            }}
                            className="w-24 text-sm border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-lemon-400"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {nfeData.items.filter((i) => i.selected).length} de {nfeData.items.length} itens selecionados
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImport(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={importLoading}
                  className="flex items-center gap-2 bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-70"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {importLoading ? 'Importando...' : 'Importar'}
                </button>
              </div>
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
        ) : estoque.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum item encontrado</p>
            <p className="text-xs mt-1">Importe uma NF-e XML para adicionar produtos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Código</th>
                  <th>EAN</th>
                  <th>Categoria</th>
                  <th className="text-center">Próprio</th>
                  <th className="text-center">Consig.</th>
                  <th className="text-right">P. Custo</th>
                  <th className="text-right">P. Venda</th>
                  <th>Nota Fiscal</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium text-gray-900 max-w-[200px]">
                      <p className="truncate" title={item.livro}>{item.livro}</p>
                    </td>
                    <td className="font-mono text-xs text-gray-500">{item.codigo || '—'}</td>
                    <td className="font-mono text-xs text-gray-500">{item.ean || '—'}</td>
                    <td className="text-sm">
                      {item.categoria ? (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                          {item.categoria}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span
                        className={`font-semibold ${
                          (item.quantidade || 0) > 0 ? 'text-forest-700' : 'text-gray-300'
                        }`}
                      >
                        {item.quantidade}
                      </span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`font-semibold ${
                          (item.qtd_consignado || 0) > 0 ? 'text-amber-600' : 'text-gray-300'
                        }`}
                      >
                        {item.qtd_consignado}
                      </span>
                    </td>
                    <td className="text-right text-sm text-gray-500">
                      {formatCurrency(item.preco_custo)}
                    </td>
                    <td className="text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={editPreco}
                            onChange={(e) => setEditPreco(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePreco(item.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="w-24 text-sm border border-lemon-400 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-lemon-400"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePreco(item.id)}
                            className="p-1 text-forest-600 hover:bg-forest-50 rounded"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(item.id)
                            setEditPreco(item.preco_venda.toString())
                          }}
                          className="font-semibold text-forest-700 hover:text-forest-900 hover:underline"
                        >
                          {formatCurrency(item.preco_venda)}
                        </button>
                      )}
                    </td>
                    <td className="text-xs text-gray-400">{item.nota_fiscal || '—'}</td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setEditingId(item.id)
                            setEditPreco(item.preco_venda.toString())
                          }}
                          className="p-1.5 text-gray-400 hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
                          title="Editar preço"
                        >
                          <Pencil className="w-4 h-4" />
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
