-- ============================================================
-- Livraria Limão e Mel - Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CENTROS DE CUSTO
-- ============================================================
CREATE TABLE IF NOT EXISTS centros_custo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  data_cadastro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);

-- ============================================================
-- ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT,
  livro TEXT NOT NULL,
  ean TEXT,
  categoria TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  qtd_consignado INTEGER NOT NULL DEFAULT 0,
  preco_custo NUMERIC(10, 2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10, 2) NOT NULL DEFAULT 0,
  nota_fiscal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_codigo ON estoque(codigo);
CREATE INDEX IF NOT EXISTS idx_estoque_ean ON estoque(ean);
CREATE INDEX IF NOT EXISTS idx_estoque_livro ON estoque(livro);
CREATE INDEX IF NOT EXISTS idx_estoque_categoria ON estoque(categoria);

-- ============================================================
-- FINANCEIRO - NOTAS FISCAIS
-- ============================================================
CREATE TABLE IF NOT EXISTS financeiro_notas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nota_fiscal TEXT NOT NULL,
  data_emissao DATE NOT NULL,
  fornecedor TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Compra', 'Consignado')),
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Cancelada', 'Devolvida')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_notas_data ON financeiro_notas(data_emissao);
CREATE INDEX IF NOT EXISTS idx_financeiro_notas_nota ON financeiro_notas(nota_fiscal);

-- ============================================================
-- FINANCEIRO - SAIDAS / DESPESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS financeiro_saidas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  categoria TEXT,
  centro_custo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_saidas_data ON financeiro_saidas(data);
CREATE INDEX IF NOT EXISTS idx_financeiro_saidas_categoria ON financeiro_saidas(categoria);

-- ============================================================
-- VENDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_comanda TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_nome TEXT,
  codigo TEXT,
  item_nome TEXT NOT NULL,
  tipo_estoque TEXT NOT NULL CHECK (tipo_estoque IN ('Próprio', 'Consignado')),
  qtd INTEGER NOT NULL DEFAULT 1,
  preco_venda NUMERIC(10, 2) NOT NULL,
  desconto NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_liquido NUMERIC(10, 2) NOT NULL,
  lucro_item NUMERIC(10, 2),
  pagamento TEXT NOT NULL CHECK (pagamento IN ('Pix', 'Crédito', 'Débito', 'Dinheiro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data);
CREATE INDEX IF NOT EXISTS idx_vendas_id_comanda ON vendas(id_comanda);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_nome);
CREATE INDEX IF NOT EXISTS idx_vendas_tipo ON vendas(tipo_estoque);

-- ============================================================
-- FUNCTION: Update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_estoque_updated_at
  BEFORE UPDATE ON estoque
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_saidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-tenant app)
-- In production, add proper user-based policies

CREATE POLICY "Allow all for anon" ON categorias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON centros_custo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON estoque FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON financeiro_notas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON financeiro_saidas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON vendas FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Categorias padrão
INSERT INTO categorias (nome) VALUES
  ('Literatura Brasileira'),
  ('Literatura Estrangeira'),
  ('Infantil'),
  ('Juvenil'),
  ('Autoajuda'),
  ('Negócios'),
  ('Ciências Humanas'),
  ('Ciências Exatas'),
  ('História'),
  ('Filosofia'),
  ('Religião'),
  ('Arte e Cultura'),
  ('Quadrinhos'),
  ('Educação'),
  ('Outros')
ON CONFLICT (nome) DO NOTHING;

-- Centros de custo padrão
INSERT INTO centros_custo (nome) VALUES
  ('Administrativo'),
  ('Comercial'),
  ('Logística'),
  ('Marketing'),
  ('Tecnologia'),
  ('Recursos Humanos'),
  ('Financeiro'),
  ('Operacional')
ON CONFLICT (nome) DO NOTHING;
