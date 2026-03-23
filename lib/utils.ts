import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Number formatters
// ============================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ============================================================
// Date formatters
// ============================================================

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// ============================================================
// String utilities
// ============================================================

export function generateComandaId(): string {
  const now = new Date()
  const timestamp = format(now, 'yyyyMMddHHmmss')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CMD-${timestamp}-${random}`
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

// ============================================================
// NFe XML Parser
// ============================================================

export interface NFeItem {
  codigo: string
  descricao: string
  ean: string
  quantidade: number
  preco_unitario: number
  valor_total: number
}

export interface NFeData {
  numero_nota: string
  data_emissao: string
  fornecedor: string
  valor_total: number
  items: NFeItem[]
}

export function parseNFeXML(xmlText: string): NFeData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('XML inválido: ' + (parseError.textContent || 'erro de parse'))

  // Use getElementsByTagNameNS('*', tag) to handle NFe namespace
  const getTagText = (parent: Element | Document, tag: string): string => {
    const elements = parent.getElementsByTagNameNS('*', tag)
    if (elements.length > 0) return elements[0].textContent || ''
    return ''
  }

  // Get nota number
  const nNF = getTagText(doc, 'nNF')
  const serie = getTagText(doc, 'serie')
  const numero_nota = serie ? `${serie}/${nNF}` : nNF

  // Get emission date (dEmi or dhEmi)
  let data_emissao = getTagText(doc, 'dhEmi') || getTagText(doc, 'dEmi')
  if (data_emissao) {
    // Parse ISO date to yyyy-MM-dd
    data_emissao = data_emissao.substring(0, 10)
  }

  // Get supplier (emitente)
  const emit = doc.getElementsByTagNameNS('*', 'emit')[0]
  const fornecedor = emit ? (getTagText(emit, 'xNome') || getTagText(emit, 'xFant') || '') : ''

  // Get total value
  const vNF = getTagText(doc, 'vNF')
  const valor_total = parseFloat(vNF) || 0

  // Get items (det elements)
  const detElements = doc.getElementsByTagNameNS('*', 'det')
  const items: NFeItem[] = []

  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i]
    const prod = det.getElementsByTagNameNS('*', 'prod')[0]
    if (!prod) continue

    const codigo = getTagText(prod, 'cProd')
    const descricao = getTagText(prod, 'xProd')
    const ean = getTagText(prod, 'cEAN') || getTagText(prod, 'cEANTrib')
    const qCom = parseFloat(getTagText(prod, 'qCom') || getTagText(prod, 'qTrib') || '1')
    const vUnCom = parseFloat(getTagText(prod, 'vUnCom') || getTagText(prod, 'vUnTrib') || '0')
    const vProd = parseFloat(getTagText(prod, 'vProd') || '0')

    items.push({
      codigo,
      descricao,
      ean: ean === 'SEM GTIN' ? '' : ean,
      quantidade: Math.round(qCom),
      preco_unitario: vUnCom,
      valor_total: vProd,
    })
  }

  return {
    numero_nota,
    data_emissao,
    fornecedor,
    valor_total,
    items,
  }
}
