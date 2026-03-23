import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase.from('estoque').select('*').order('livro')

  const search = searchParams.get('search')
  const categoria = searchParams.get('categoria')
  const tipo = searchParams.get('tipo')

  if (search) {
    query = query.or(
      `livro.ilike.%${search}%,codigo.ilike.%${search}%,ean.ilike.%${search}%`
    )
  }
  if (categoria) query = query.eq('categoria', categoria)
  if (tipo === 'proprio') query = query.gt('quantidade', 0)
  if (tipo === 'consignado') query = query.gt('qtd_consignado', 0)

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
    const { livro, codigo, ean, categoria, quantidade, qtd_consignado, preco_custo, preco_venda, nota_fiscal } = body

    if (!livro) {
      return NextResponse.json({ error: 'Nome do livro é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('estoque')
      .insert({
        livro,
        codigo: codigo || null,
        ean: ean || null,
        categoria: categoria || null,
        quantidade: quantidade || 0,
        qtd_consignado: qtd_consignado || 0,
        preco_custo: preco_custo || 0,
        preco_venda: preco_venda || 0,
        nota_fiscal: nota_fiscal || null,
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    // Only allow updating specific fields
    const allowedFields = [
      'livro', 'codigo', 'ean', 'categoria',
      'quantidade', 'qtd_consignado', 'preco_custo', 'preco_venda', 'nota_fiscal',
    ]

    const sanitizedUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in updates) {
        sanitizedUpdates[field] = updates[field]
      }
    }

    const { data, error } = await supabase
      .from('estoque')
      .update(sanitizedUpdates)
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
