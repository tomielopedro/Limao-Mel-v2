// ============================================================
// Database Types - Livraria Limão e Mel
// ============================================================

export interface Estoque {
  id: string
  codigo: string | null
  livro: string
  ean: string | null
  categoria: string | null
  quantidade: number
  qtd_consignado: number
  preco_custo: number
  preco_venda: number
  nota_fiscal: string | null
  created_at: string
  updated_at: string
}

export interface Venda {
  id: string
  id_comanda: string
  data: string
  cliente_nome: string | null
  codigo: string | null
  item_nome: string
  tipo_estoque: 'Próprio' | 'Consignado'
  qtd: number
  preco_venda: number
  desconto: number
  total_liquido: number
  lucro_item: number | null
  pagamento: 'Pix' | 'Crédito' | 'Débito' | 'Dinheiro'
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  cpf: string | null
  email: string | null
  telefone: string | null
  data_cadastro: string
  created_at: string
}

export interface FinanceiroSaida {
  id: string
  data: string
  descricao: string
  valor: number
  categoria: string | null
  centro_custo: string | null
  created_at: string
}

export interface FinanceiroNota {
  id: string
  nota_fiscal: string
  data_emissao: string
  fornecedor: string
  tipo: 'Compra' | 'Consignado'
  valor_total: number
  status: 'Ativa' | 'Cancelada' | 'Devolvida'
  created_at: string
}

export interface Categoria {
  id: string
  nome: string
  created_at: string
}

export interface CentroCusto {
  id: string
  nome: string
  created_at: string
}

// ============================================================
// Cart / PDV Types
// ============================================================

export interface CartItem {
  estoque_id: string
  codigo: string | null
  livro: string
  tipo_estoque: 'Próprio' | 'Consignado'
  quantidade: number
  preco_venda: number
  preco_custo: number
  desconto: number
  total: number
  qtd_disponivel: number
}

export interface VendaPayload {
  id_comanda: string
  cliente_nome: string | null
  pagamento: 'Pix' | 'Crédito' | 'Débito' | 'Dinheiro'
  items: CartItemPayload[]
  desconto_global: number
}

export interface CartItemPayload {
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

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardKPIs {
  totalRevenue: number
  todaySales: number
  totalStock: number
  consignedValue: number
  totalItems: number
}

export interface SalesChartData {
  date: string
  total: number
  count: number
}

export interface StockPieData {
  name: string
  value: number
  color: string
}

// ============================================================
// NFe XML Types
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
