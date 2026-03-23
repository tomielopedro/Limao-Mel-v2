-- ============================================================
-- Allow authenticated users to access all tables
-- Needed after adding Supabase Auth login
-- ============================================================

CREATE POLICY "Allow all for authenticated" ON categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON centros_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON estoque FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON financeiro_notas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON financeiro_saidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON vendas FOR ALL TO authenticated USING (true) WITH CHECK (true);
