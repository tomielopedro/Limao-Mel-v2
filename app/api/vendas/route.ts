import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('vendas')
    .select('*')
    .order('data', { ascending: false })

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const cliente = searchParams.get('cliente')
  const limit = searchParams.get('limit')

  if (from) query = query.gte('data', `${from}T00:00:00`)
  if (to) query = query.lte('data', `${to}T23:59:59`)
  if (cliente) query = query.ilike('cliente_nome', `%${cliente}%`)
  if (limit) query = query.limit(parseInt(limit))

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

interface CartItemPayload {
  estoque_id: string
  codigo: string | null
  item_nome: string
  tipo_estoque: 'Próprio' | 'Consignado'
  qtd: number
  preco_venda: number
  desconto: number
  total_liquido: number
  lucro_item: number
  preco_custo: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { id_comanda, cliente_nome, pagamento, items, desconto_global } = body

    if (!id_comanda || !pagamento || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando: id_comanda, pagamento, items' },
        { status: 400 }
      )
    }

    // Validate payment method
    const validPayments = ['Pix', 'Crédito', 'Débito', 'Dinheiro']
    if (!validPayments.includes(pagamento)) {
      return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Process each item
    for (const item of items as CartItemPayload[]) {
      // Fetch current stock
      const { data: estoqueItem, error: fetchError } = await supabase
        .from('estoque')
        .select('id, quantidade, qtd_consignado')
        .eq('id', item.estoque_id)
        .single()

      if (fetchError || !estoqueItem) {
        return NextResponse.json(
          { error: `Produto não encontrado: ${item.item_nome}` },
          { status: 400 }
        )
      }

      // Check stock availability
      if (item.tipo_estoque === 'Próprio') {
        if ((estoqueItem.quantidade || 0) < item.qtd) {
          return NextResponse.json(
            { error: `Estoque insuficiente para: ${item.item_nome}` },
            { status: 400 }
          )
        }
      } else {
        if ((estoqueItem.qtd_consignado || 0) < item.qtd) {
          return NextResponse.json(
            { error: `Estoque consignado insuficiente para: ${item.item_nome}` },
            { status: 400 }
          )
        }
      }
    }

    // All stock checks passed — insert vendas
    const vendasToInsert = (items as CartItemPayload[]).map((item) => ({
      id_comanda,
      data: now,
      cliente_nome: cliente_nome || null,
      codigo: item.codigo || null,
      item_nome: item.item_nome,
      tipo_estoque: item.tipo_estoque,
      qtd: item.qtd,
      preco_venda: item.preco_venda,
      desconto: item.desconto,
      total_liquido: item.total_liquido,
      lucro_item: item.lucro_item || null,
      pagamento,
    }))

    const { error: insertError } = await supabase.from('vendas').insert(vendasToInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update stock quantities
    for (const item of items as CartItemPayload[]) {
      const { data: estoqueItem } = await supabase
        .from('estoque')
        .select('quantidade, qtd_consignado')
        .eq('id', item.estoque_id)
        .single()

      if (!estoqueItem) continue

      if (item.tipo_estoque === 'Próprio') {
        await supabase
          .from('estoque')
          .update({ quantidade: Math.max(0, (estoqueItem.quantidade || 0) - item.qtd) })
          .eq('id', item.estoque_id)
      } else {
        await supabase
          .from('estoque')
          .update({ qtd_consignado: Math.max(0, (estoqueItem.qtd_consignado || 0) - item.qtd) })
          .eq('id', item.estoque_id)
      }
    }

    return NextResponse.json({
      success: true,
      id_comanda,
      items_count: items.length,
      message: `Venda ${id_comanda} finalizada com sucesso`,
    })
  } catch (err: unknown) {
    console.error('POST /api/vendas error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
