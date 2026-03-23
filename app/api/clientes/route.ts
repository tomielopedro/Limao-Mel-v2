import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase.from('clientes').select('*').order('nome')

  const search = searchParams.get('search')
  if (search) {
    query = query.or(
      `nome.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

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
    const { nome, cpf, email, telefone } = body

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: nome.trim(),
        cpf: cpf?.trim() || null,
        email: email?.trim() || null,
        telefone: telefone?.trim() || null,
        data_cadastro: new Date().toISOString(),
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

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { id, nome, cpf, email, telefone } = body

    if (!id || !nome) {
      return NextResponse.json({ error: 'ID e nome são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('clientes')
      .update({
        nome: nome.trim(),
        cpf: cpf?.trim() || null,
        email: email?.trim() || null,
        telefone: telefone?.trim() || null,
      })
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

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const { error } = await supabase.from('clientes').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
