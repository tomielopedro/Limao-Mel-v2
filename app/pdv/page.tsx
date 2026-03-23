'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, generateComandaId } from '@/lib/utils'
import type { Estoque, Cliente, CartItem } from '@/lib/types'
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  User,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

type PaymentMethod = 'Pix' | 'Crédito' | 'Débito' | 'Dinheiro'

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'Pix', label: 'Pix', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'Crédito', label: 'Crédito', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'Débito', label: 'Débito', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'Dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
]

export default function PDVPage() {
  const supabase = createClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Estoque[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteResults, setClienteResults] = useState<Cliente[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [descontoGlobal, setDescontoGlobal] = useState(0)
  const [pagamento, setPagamento] = useState<PaymentMethod>('Pix')
  const [loading, setLoading] = useState(false)
  const [comandaId] = useState(generateComandaId)

  // Search products
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      const q = searchQuery.trim()
      const { data } = await supabase
        .from('estoque')
        .select('*')
        .or(`livro.ilike.%${q}%,ean.ilike.%${q}%,codigo.ilike.%${q}%`)
        .limit(10)

      setSearchResults(data || [])
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search clients
  useEffect(() => {
    if (!clienteSearch.trim()) {
      setClienteResults([])
      return
    }

    const timer = setTimeout(async () => {
      const q = clienteSearch.trim()
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .or(`nome.ilike.%${q}%,cpf.ilike.%${q}%`)
        .limit(8)

      setClienteResults(data || [])
      setShowClienteDropdown(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [clienteSearch])

  const addToCart = (item: Estoque) => {
    const existingIdx = cart.findIndex((c) => c.estoque_id === item.id)
    const totalDisponivel = (item.quantidade || 0) + (item.qtd_consignado || 0)

    if (existingIdx >= 0) {
      const existing = cart[existingIdx]
      if (existing.quantidade >= totalDisponivel) {
        toast.error('Quantidade máxima atingida')
        return
      }
      const updated = [...cart]
      updated[existingIdx] = {
        ...existing,
        quantidade: existing.quantidade + 1,
        total: (existing.quantidade + 1) * existing.preco_venda * (1 - existing.desconto / 100),
      }
      setCart(updated)
    } else {
      const tipoEstoque = (item.quantidade || 0) > 0 ? 'Próprio' : 'Consignado'
      const newItem: CartItem = {
        estoque_id: item.id,
        codigo: item.codigo,
        livro: item.livro,
        tipo_estoque: tipoEstoque,
        quantidade: 1,
        preco_venda: item.preco_venda,
        preco_custo: item.preco_custo,
        desconto: 0,
        total: item.preco_venda,
        qtd_disponivel: totalDisponivel,
      }
      setCart([...cart, newItem])
    }

    setSearchQuery('')
    setSearchResults([])
  }

  const removeFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx))
  }

  const updateQty = (idx: number, delta: number) => {
    const item = cart[idx]
    const newQty = item.quantidade + delta
    if (newQty <= 0) {
      removeFromCart(idx)
      return
    }
    if (newQty > item.qtd_disponivel) {
      toast.error('Quantidade insuficiente em estoque')
      return
    }
    const updated = [...cart]
    updated[idx] = {
      ...item,
      quantidade: newQty,
      total: newQty * item.preco_venda * (1 - item.desconto / 100),
    }
    setCart(updated)
  }

  const updateItemDesconto = (idx: number, desc: number) => {
    const item = cart[idx]
    const updated = [...cart]
    updated[idx] = {
      ...item,
      desconto: desc,
      total: item.quantidade * item.preco_venda * (1 - desc / 100),
    }
    setCart(updated)
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const totalFinal = subtotal * (1 - descontoGlobal / 100)

  const finalizarVenda = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_comanda: comandaId,
          cliente_nome: selectedCliente?.nome || null,
          pagamento,
          desconto_global: descontoGlobal,
          items: cart.map((item) => ({
            estoque_id: item.estoque_id,
            codigo: item.codigo,
            item_nome: item.livro,
            tipo_estoque: item.tipo_estoque,
            qtd: item.quantidade,
            preco_venda: item.preco_venda,
            desconto: item.desconto + (descontoGlobal > 0 ? descontoGlobal : 0),
            total_liquido: item.total * (1 - descontoGlobal / 100),
            lucro_item:
              (item.preco_venda * (1 - item.desconto / 100) - item.preco_custo) *
              item.quantidade,
            preco_custo: item.preco_custo,
          })),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao finalizar venda')
      }

      toast.success(`Venda ${comandaId} finalizada com sucesso!`)
      setCart([])
      setSelectedCliente(null)
      setClienteSearch('')
      setDescontoGlobal(0)
      setPagamento('Pix')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao finalizar venda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">PDV — Ponto de Venda</h1>
          <p className="text-gray-500 text-sm mt-1">Comanda: <span className="font-mono font-medium text-forest-700">{comandaId}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Search + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Search */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Buscar Produto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Digite o nome, EAN ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400 focus:border-transparent"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                {searchResults.map((item) => {
                  const disponivel = (item.quantidade || 0) + (item.qtd_consignado || 0)
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={disponivel === 0}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.livro}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.codigo && <span className="mr-2">#{item.codigo}</span>}
                            {item.ean && <span className="mr-2">EAN: {item.ean}</span>}
                            <span
                              className={`${
                                item.quantidade > 0 ? 'text-forest-600' : 'text-amber-600'
                              }`}
                            >
                              {item.quantidade > 0
                                ? `${item.quantidade} próprio`
                                : `${item.qtd_consignado} consignado`}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-forest-700">
                            {formatCurrency(item.preco_venda)}
                          </p>
                          {disponivel === 0 && (
                            <p className="text-xs text-red-500">Sem estoque</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <ShoppingCart className="w-4 h-4 text-forest-700" />
              <h2 className="text-sm font-semibold text-gray-700">
                Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
              </h2>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Carrinho vazio</p>
                <p className="text-xs mt-1">Busque e adicione produtos acima</p>
              </div>
            ) : (
              <div>
                {cart.map((item, idx) => (
                  <div
                    key={item.estoque_id}
                    className="px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.livro}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              item.tipo_estoque === 'Próprio'
                                ? 'bg-forest-100 text-forest-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.tipo_estoque}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatCurrency(item.preco_venda)} un
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Desconto item */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Desc %</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.desconto}
                            onChange={(e) => updateItemDesconto(idx, Number(e.target.value))}
                            className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:ring-1 focus:ring-lemon-400"
                          />
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button
                            onClick={() => updateQty(idx, -1)}
                            className="p-1.5 hover:bg-gray-50 rounded-l-lg"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="px-2 text-sm font-medium text-gray-900 min-w-[24px] text-center">
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() => updateQty(idx, 1)}
                            className="p-1.5 hover:bg-gray-50 rounded-r-lg"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>

                        <p className="text-sm font-bold text-forest-700 min-w-[70px] text-right">
                          {formatCurrency(item.total)}
                        </p>

                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Checkout Panel */}
        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-forest-700" />
              <h3 className="text-sm font-semibold text-gray-700">Cliente</h3>
            </div>

            {selectedCliente ? (
              <div className="flex items-center justify-between bg-forest-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-forest-800">{selectedCliente.nome}</p>
                  {selectedCliente.cpf && (
                    <p className="text-xs text-forest-600">{selectedCliente.cpf}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCliente(null)
                    setClienteSearch('')
                  }}
                  className="text-forest-400 hover:text-forest-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  onFocus={() => clienteResults.length > 0 && setShowClienteDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
                />
                {showClienteDropdown && clienteResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {clienteResults.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setSelectedCliente(cliente)
                          setClienteSearch(cliente.nome)
                          setShowClienteDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <p className="font-medium text-gray-900">{cliente.nome}</p>
                        {cliente.cpf && (
                          <p className="text-xs text-gray-400">{cliente.cpf}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">Opcional — venda sem identificação</p>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Forma de Pagamento</h3>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPagamento(method.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    pagamento === method.value
                      ? 'bg-forest-700 text-white border-forest-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-forest-300 hover:text-forest-700'
                  }`}
                >
                  {method.icon}
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Desconto Global</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={descontoGlobal}
                onChange={(e) => setDescontoGlobal(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
              />
              <span className="text-sm text-gray-500 font-medium">%</span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {descontoGlobal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto ({descontoGlobal}%)</span>
                  <span>- {formatCurrency(subtotal * descontoGlobal / 100)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span className="text-forest-700">{formatCurrency(totalFinal)}</span>
              </div>
            </div>
          </div>

          {/* Finalize Button */}
          <button
            onClick={finalizarVenda}
            disabled={cart.length === 0 || loading}
            className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-colors shadow-sm"
          >
            {loading ? (
              <span>Processando...</span>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Finalizar Venda
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
