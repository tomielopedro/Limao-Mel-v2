import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('financeiro_notas')
    .select('*')
    .order('data_emissao', { ascending: false })

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const tipo = searchParams.get('tipo')
  const status = searchParams.get('status')
  const fornecedor = searchParams.get('fornecedor')

  if (from) query = query.gte('data_emissao', from)
  if (to) query = query.lte('data_emissao', to)
  if (tipo) query = query.eq('tipo', tipo)
  if (status) query = query.eq('status', status)
  if (fornecedor) query = query.ilike('fornecedor', `%${fornecedor}%`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { nota_fiscal, data_emissao, fornecedor, tipo, valor_total, status } = body

    if (!nota_fiscal || !data_emissao || !fornecedor || !tipo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nota_fiscal, data_emissao, fornecedor, tipo' },
        { status: 400 }
      )
    }

    const validTipos = ['Compra', 'Consignado']
    if (!validTipos.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido. Use: Compra ou Consignado' }, { status: 400 })
    }

    const validStatus = ['Ativa', 'Cancelada', 'Devolvida']
    const normalizedStatus = status || 'Ativa'
    if (!validStatus.includes(normalizedStatus)) {
      return NextResponse.json(
        { error: 'Status inválido. Use: Ativa, Cancelada ou Devolvida' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('financeiro_notas')
      .insert({
        nota_fiscal: nota_fiscal.trim(),
        data_emissao,
        fornecedor: fornecedor.trim(),
        tipo,
        valor_total: parseFloat(valor_total) || 0,
        status: normalizedStatus,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios' }, { status: 400 })
    }

    const validStatus = ['Ativa', 'Cancelada', 'Devolvida']
    if (!validStatus.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('financeiro_notas')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
