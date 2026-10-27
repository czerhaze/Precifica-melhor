/* Rodar: node finance.test.js  (ou npm test). Sem dependências. */
const assert = require('assert'), F = require('./finance.js');
let ok = 0, fail = 0;
const t = (nome, fn) => { try { fn(); ok++; console.log('  ✓', nome); } catch (e) { fail++; console.log('  ✗', nome, '\n   ', e.message); } };
const near = (a, b, e = 1e-6, m) => assert.ok(Math.abs(a - b) <= e, (m || '') + ` esperado ${b}, obtido ${a}`);
const mk = (o = {}) => ({ cfg: F.normCfg({ fixos: 0, malvo: 20, mmin: 10, ...(o.cfg || {}) }), mps: { ML: F.normMp({ com: 14, fixa: 6, pag: 0, ...(o.mp || {}) }), Direta: F.normMp({}) },
  prods: (o.prods || [{ id: 'a', nome: 'A', mp: 'ML', custo: 40, preco: 100, imp: 6, frete: 5, emb: 2, pub: 3, outros: 0, vendas: 100, estoque: 10 }]).map(F.normProd) });

console.log('Cálculo por produto');
t('lucro unitário sem fixos', () => { // 100 - 40 - 14 (com) - 6 (fixa) - 6 (imp) - 5 - 2 - 3 = 24
  const r = F.calc(mk().prods[0], mk()); near(r.luc, 24); near(r.mg, .24); near(r.cm, 24); near(r.tot, 76); near(r.roi, 24 / 76);
});
t('markup sobre custo de aquisição', () => near(F.calc(mk().prods[0], mk()).markup, 1.5));
t('lucro bruto = receita líquida − custo do produto', () => { const r = F.calc(mk().prods[0], mk()); near(r.recLiq, 94); near(r.lb, 54); });
t('rateio de fixos por unidade (R$5.000 / 500 un = R$10)', () => {
  const c = mk({ cfg: { fixos: 5000 }, prods: [{ id: 'a', mp: 'ML', custo: 40, preco: 100, vendas: 300 }, { id: 'b', mp: 'ML', custo: 10, preco: 50, vendas: 200 }] });
  near(F.calc(c.prods[0], c).fx, 10); near(F.calc(c.prods[1], c).fx, 10);
});
t('rateio por faturamento', () => {
  const c = mk({ cfg: { fixos: 5000, rateio: 'fat' }, prods: [{ id: 'a', mp: 'ML', custo: 40, preco: 100, vendas: 300 }, { id: 'b', mp: 'ML', custo: 10, preco: 50, vendas: 200 }] });
  near(F.calc(c.prods[0], c).fx, 5000 * 100 / 40000); near(F.calc(c.prods[1], c).fx, 5000 * 50 / 40000);
});
t('preço mínimo dá lucro zero; preço ideal dá a margem alvo (rateio por unidade)', () => {
  const c = mk({ cfg: { fixos: 2000 } }), p = c.prods[0], r = F.calc(p, c);
  near(F.calc(p, c, { preco: r.min }).luc, 0, 1e-6); near(F.calc(p, c, { preco: r.ideal }).mg, .20, 1e-9);
});
t('preço mínimo/ideal corretos com rateio por faturamento (preço entra no rateio)', () => {
  const c = mk({ cfg: { fixos: 3000, rateio: 'fat' }, prods: [{ id: 'a', mp: 'ML', custo: 40, preco: 100, vendas: 100 }, { id: 'b', mp: 'ML', custo: 20, preco: 60, vendas: 100 }] });
  const p = c.prods[0], r = F.calc(p, c);
  near(F.calc(p, c, { preco: r.min }).luc, 0, 1e-5); near(F.calc(p, c, { preco: r.ideal }).mg, .20, 1e-7);
});
t('custo máximo de aquisição leva à margem alvo no preço atual', () => {
  const c = mk({ cfg: { fixos: 1000 } }), p = c.prods[0], r = F.calc(p, c);
  near(F.calc(p, c, { custo: r.cmax }).mg, .20, 1e-9);
});
t('ponto de equilíbrio do produto isolado', () => { const c = mk({ cfg: { fixos: 2400 } }); assert.strictEqual(F.calc(c.prods[0], c).pe, 100); });

console.log('Resumo da empresa');
t('lucro líquido estimado = soma(lucro unit × vendas) quando todos vendem', () => {
  const c = mk({ cfg: { fixos: 4000 }, prods: [{ id: 'a', mp: 'ML', custo: 40, preco: 100, imp: 6, vendas: 150 }, { id: 'b', mp: 'Direta', custo: 15, preco: 45, imp: 6, vendas: 250 }] });
  const r = F.resumo(c), s = c.prods.reduce((a, p) => a + F.calc(p, c).luc * p.vendas, 0); near(r.luc, s, 1e-6);
});
t('faturamento, lucro bruto, margem de contribuição e lucro líquido são conceitos distintos', () => {
  const c = mk({ cfg: { fixos: 1000 } }), r = F.resumo(c);
  near(r.fat, 10000); near(r.lb, 5400); near(r.cm, 2400); near(r.luc, 1400); assert.ok(r.fat > r.lb && r.lb > r.cm && r.cm > r.luc);
});
t('ponto de equilíbrio do mix: lucro zero no faturamento de equilíbrio', () => {
  const c = mk({ cfg: { fixos: 1200 } }), r = F.resumo(c); near(r.peRec, 5000); near(r.peUn, 50);
  const c2 = mk({ cfg: { fixos: 1200 }, prods: [{ ...c.prods[0], vendas: 50 }] }); near(F.resumo(c2).luc, 0);
});
t('margem de segurança', () => { const r = F.resumo(mk({ cfg: { fixos: 1200 } })); near(r.seg, .5); });

console.log('Casos extremos');
t('preço zero não gera NaN/Infinity', () => { const c = mk(); const r = F.calc(c.prods[0], c, { preco: 0 }); assert.ok(isFinite(r.mg) && isFinite(r.roi) && isFinite(r.luc)); });
t('custo zero: markup indefinido (null), sem erro', () => { const c = mk(); assert.strictEqual(F.calc(c.prods[0], c, { custo: 0 }).markup, null); });
t('taxas ≥ 100% do preço: preço mínimo/ideal inviáveis (NaN) e sinalizado', () => {
  const c = mk({ mp: { com: 90 }, prods: [{ id: 'a', mp: 'ML', custo: 10, preco: 100, imp: 10, vendas: 10 }] }), r = F.calc(c.prods[0], c);
  assert.ok(r.inviavel && isNaN(r.min) && isNaN(r.ideal));
});
t('margem alvo + taxas ≥ 100%: preço ideal NaN mas mínimo existe', () => {
  const c = mk({ cfg: { malvo: 90 }, mp: { com: 20 } }), r = F.calc(c.prods[0], c); assert.ok(isNaN(r.ideal) && isFinite(r.min));
});
t('sem vendas e com fixos: não divide por zero', () => {
  const c = mk({ cfg: { fixos: 500 }, prods: [{ id: 'a', mp: 'ML', custo: 10, preco: 50, vendas: 0 }] }), r = F.resumo(c);
  assert.ok(isFinite(r.luc) && r.luc === -500 && r.peUn === null || isFinite(r.peUn));
});
t('margem de contribuição ≤ 0: ponto de equilíbrio indisponível (null)', () => {
  const c = mk({ cfg: { fixos: 100 }, prods: [{ id: 'a', mp: 'ML', custo: 90, preco: 100, vendas: 10 }] }); assert.strictEqual(F.resumo(c).peRec, null);
});
t('valores negativos e texto são saneados', () => { const q = F.normProd({ id: 1, custo: -5, preco: 'abc', imp: 250, vendas: -3.7 }); assert.deepStrictEqual([q.custo, q.preco, q.imp, q.vendas], [0, 0, 100, 0]); });
t('marketplace inexistente não quebra o cálculo', () => { const c = mk(); assert.ok(isFinite(F.calc(c.prods[0], c, { mp: 'X' }).luc)); });

console.log('Cenários e fluxo de caixa');
t('cenário não altera os dados originais', () => {
  const c = mk({ cfg: { fixos: 1000 } }), antes = JSON.stringify(c), s = F.cenario(c, { dp: 10, dc: 5, dv: 20, df: -10 });
  assert.strictEqual(JSON.stringify(c), antes); near(s.prods[0].preco, 110); near(s.prods[0].vendas, 120); near(s.cfg.fixos, 900);
});
t('aumentar o preço melhora a margem', () => { const c = mk(), s = F.cenario(c, { dp: 10 }); assert.ok(F.resumo(s).mg > F.resumo(c).mg); });
t('sem prazos e sem crescimento: caixa mensal = lucro líquido + 0 (recebimento à vista)', () => {
  const c = mk({ cfg: { fixos: 1000, caixa: 500 } }), f = F.fluxo(c); near(f[0].liq, F.resumo(c).luc, 1e-6); near(f[5].caixa, 500 + 6 * F.resumo(c).luc, 1e-6);
});
t('prazo de recebimento com crescimento reduz o caixa frente ao lucro', () => {
  const c = mk({ cfg: { fixos: 1000, cresc: 10 }, mp: { dias: 30 } }), f = F.fluxo(c), c0 = mk({ cfg: { fixos: 1000, cresc: 10 } }), f0 = F.fluxo(c0);
  assert.ok(f[5].caixa < f0[5].caixa); near(f[0].lucro, f0[0].lucro);
});
t('prazo de 45 dias distribui entre meses', () => {
  const c = mk({ cfg: { fixos: 0, cresc: 0 }, mp: { dias: 45 } }); near(F.fluxo(c)[0].entradas, (100 - 14 - 6) * 100, 1e-6); // estável: mesmo valor
});
t('lucro contábil difere do caixa quando há prazo de pagamento de fornecedor com queda de vendas', () => {
  const c = mk({ cfg: { cresc: -20, diasForn: 30 } }), f = F.fluxo(c); assert.ok(Math.abs(f[2].liq - f[2].lucro) > 1);
});

console.log('Alertas');
t('taxas não configuradas, custo ausente e prejuízo', () => {
  const c = mk({ mp: { com: 0, fixa: 0, pag: 0 }, prods: [{ id: 'a', nome: 'A', mp: 'ML', custo: 0, preco: 100, vendas: 10 }, { id: 'b', nome: 'B', mp: 'Direta', custo: 150, preco: 100, vendas: 10 }] });
  const a = F.alertas(c).map(x => x.t).join('|'); assert.ok(/Taxas de ML não configuradas/.test(a) && /custo de aquisição não informado/.test(a) && /prejuízo/.test(a));
});
t('marketplace removido gera alerta', () => { const c = mk(); c.prods[0].mp = 'Sumiu'; assert.ok(F.alertas(c).some(x => /não existe mais/.test(x.t))); });

console.log('CSV e armazenamento');
t('CSV: BOM, ponto e vírgula, decimal vírgula, aspas', () => {
  const s = F.csv([['Nome', 'Valor'], ['A;B "x"', 1.5]]); assert.ok(s.startsWith('\ufeff')); assert.ok(s.includes('"A;B ""x"""') && s.includes(';1,5'));
});
t('CSV: bloqueia injeção de fórmula em texto, mantém números negativos', () => { const s = F.csv([['=1+1', -3]]); assert.ok(s.includes("'=1+1") && s.includes(';-3')); });
t('normState: dado corrompido é rejeitado, ids duplicados corrigidos, marketplace ausente criado', () => {
  assert.throws(() => F.normState(null)); assert.throws(() => F.normState({ prods: 'x' }));
  const s = F.normState({ prods: [{ id: 'x', nome: 'a', mp: 'Novo' }, { id: 'x', nome: 'b', mp: 'Novo' }], cfg: { fixos: '1000' } });
  assert.notStrictEqual(s.prods[0].id, s.prods[1].id); assert.ok(s.mps.Novo); assert.strictEqual(s.cfg.fixos, 1000);
});
t('normState preserva dados do formato antigo (precifica2)', () => {
  const s = F.normState({ cfg: { fixos: 300, rateio: 'fat', mmin: 10, malvo: 25, imp: 4, cresc: 2, caixa: 50, diasRepor: 15 }, mps: { 'Mercado Livre': { com: 14, fixa: 6, pag: 0 } }, prods: [{ id: '1', nome: 'P', mp: 'Mercado Livre', custo: 10, preco: 30, imp: 4, frete: 1, emb: 1, pub: 1, outros: 1, vendas: 10, estoque: 5, conc: 29 }], cur: {} });
  assert.strictEqual(s.prods[0].preco, 30); assert.strictEqual(s.mps['Mercado Livre'].com, 14); assert.strictEqual(s.cfg.rateio, 'fat'); assert.strictEqual(s.mps['Mercado Livre'].conf, '');
});
t('histórico: snapshot e variação', () => { const s = F.snapshot(mk({ cfg: { fixos: 1000 } }), '2026-10'); assert.strictEqual(s.mes, '2026-10'); near(s.luc, 1400); near(F.variacao(120, 100), .2); assert.strictEqual(F.variacao(5, 0), null); });

console.log(`\n${ok} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
