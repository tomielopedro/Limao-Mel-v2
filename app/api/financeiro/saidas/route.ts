import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('financeiro_saidas')
    .select('*')
    .order('data', { ascending: false })

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const categoria = searchParams.get('categoria')
  const centro_custo = searchParams.get('centro_custo')

  if (from) query = query.gte('data', from)
  if (to) query = query.lte('data', to)
  if (categoria) query = query.eq('categoria', categoria)
  if (centro_custo) query = query.eq('centro_custo', centro_custo)

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
    const { data, descricao, valor, categoria, centro_custo } = body

    if (!data || !descricao || valor === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: data, descricao, valor' },
        { status: 400 }
      )
    }

    const { data: inserted, error } = await supabase
      .from('financeiro_saidas')
      .insert({
        data,
        descricao: descricao.trim(),
        valor: parseFloat(valor),
        categoria: categoria || null,
        centro_custo: centro_custo || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const { error } = await supabase.from('financeiro_saidas').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
