/* PRECIFICA: motor financeiro (funções puras, sem DOM). Usado pelo app (window.Fin) e pelos testes (node).
   Definições:
   - Faturamento = preço × unidades (bruto).  Receita líquida = faturamento − impostos sobre a venda.
   - Lucro bruto = receita líquida − custo do produto vendido.
   - Margem de contribuição = preço − todos os custos variáveis (produto, impostos, comissão, taxas, frete, embalagem, publicidade, outros).
   - Lucro líquido estimado = margem de contribuição total − custos fixos (antes de imposto sobre o lucro).
   - Fluxo de caixa = entradas efetivas (com prazo de recebimento) − saídas efetivas (com prazo de pagamento e reposição). Não é lucro. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fin = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const num = (v, d = 0) => { const x = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : d; };
  const nn = v => Math.max(0, num(v));
  const pc = v => Math.min(100, nn(v));

  const CFG0 = { fixos: 0, rateio: 'un', mmin: 0, malvo: 0, imp: 0, cresc: 0, caixa: 0, diasRepor: 0, diasForn: 0 };
  const normCfg = c => { c = c || {}; return { fixos: nn(c.fixos), rateio: c.rateio === 'fat' ? 'fat' : 'un', mmin: pc(c.mmin), malvo: pc(c.malvo), imp: pc(c.imp), cresc: Math.min(100, Math.max(-100, num(c.cresc))), caixa: num(c.caixa), diasRepor: nn(c.diasRepor), diasForn: Math.min(365, nn(c.diasForn)) }; };
  const normMp = m => { m = m || {}; return { com: pc(m.com), fixa: nn(m.fixa), pag: pc(m.pag), dias: (m.dias === undefined || m.dias === null || m.dias === '') ? null : Math.min(365, Math.round(nn(m.dias))), conf: typeof m.conf === 'string' ? m.conf.slice(0, 10) : '' }; };
  /* clean: sem arredondar (cenários podem ter vendas fracionadas). normProd: para gravar (vendas/estoque inteiros). */
  const clean = p => ({ id: String(p.id == null ? '' : p.id), nome: String(p.nome == null ? '' : p.nome), sku: String(p.sku == null ? '' : p.sku), mp: String(p.mp == null ? '' : p.mp), custo: nn(p.custo), preco: nn(p.preco), imp: pc(p.imp), frete: nn(p.frete), emb: nn(p.emb), pub: nn(p.pub), outros: nn(p.outros), vendas: nn(p.vendas), estoque: nn(p.estoque), conc: nn(p.conc) });
  const normProd = p => { const q = clean(p); q.vendas = Math.round(q.vendas); q.estoque = Math.round(q.estoque); return q; };

  const totals = (prods, ex) => { let un = 0, fat = 0; for (const x of prods) { if (x.id === ex) continue; un += nn(x.vendas); fat += nn(x.preco) * nn(x.vendas); } return { un, fat }; };
  /* Custo fixo por unidade do produto q, conforme o critério de rateio. */
  function fixoUn(q, ctx, t) {
    const f = ctx.cfg.fixos; if (!f) return 0;
    if (ctx.cfg.rateio === 'fat') { const F = t.fat + q.preco * q.vendas; return F > 0 ? f * q.preco / F : 0; }
    const U = t.un + q.vendas; return U > 0 ? f / U : 0;
  }
  /* Preço que entrega a margem desejada (em %, sobre o preço). NaN se for matematicamente inviável. */
  function precoPara(q, dir, pct, ctx, t, margem) {
    const mg = margem / 100, d = 1 - pct - mg; if (d <= 1e-9) return NaN;
    if (ctx.cfg.rateio !== 'fat') return (dir + fixoUn(q, ctx, t)) / d;
    const g = p => 1 - pct - mg - (dir + fixoUn({ ...q, preco: p }, ctx, t)) / p; // crescente em p
    let lo = 0.01, hi = Math.max(1, dir * 2 + 1), i = 0;
    while (g(hi) < 0 && i++ < 60) hi *= 2;
    if (g(hi) < 0) return NaN;
    for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; g(mid) < 0 ? lo = mid : hi = mid; }
    return hi;
  }

  function calc(p, ctx, o) {
    const q = clean({ ...p, ...o }), m = normMp(ctx.mps[q.mp]), t = totals(ctx.prods, q.id);
    const pct = (m.com + m.pag + q.imp) / 100, fx = fixoUn(q, ctx, t);
    const dir = q.custo + q.frete + q.emb + q.pub + q.outros + m.fixa;           // custos variáveis que não dependem do preço
    const imp = q.preco * q.imp / 100, taxas = q.preco * (m.com + m.pag) / 100 + m.fixa;
    const cv = dir + q.preco * pct, cm = q.preco - cv, tot = cv + fx, luc = q.preco - tot;
    const ma = ctx.cfg.malvo;
    const cmax = q.preco * (1 - pct - ma / 100) - (dir - q.custo) - fx;          // custo de aquisição máximo p/ atingir a margem alvo no preço atual
    return {
      q, m, pct, fx, dir, imp, taxas, cv, cm, tot, luc,
      cmPct: q.preco ? cm / q.preco : 0, mg: q.preco ? luc / q.preco : 0, roi: tot ? luc / tot : 0,
      markup: q.custo ? q.preco / q.custo - 1 : null,
      recLiq: q.preco - imp, lb: q.preco - imp - q.custo,
      min: precoPara(q, dir, pct, ctx, t, 0), ideal: precoPara(q, dir, pct, ctx, t, ma), cmax,
      pe: cm > 0 ? Math.ceil(ctx.cfg.fixos / cm) : null,                         // só este produto, sozinho
      inviavel: pct >= 1
    };
  }

  function resumo(ctx) {
    const L = ctx.prods.map(p => calc(p, ctx)), r = { L, fat: 0, imp: 0, cmv: 0, taxas: 0, outrosVar: 0, cm: 0, un: 0 };
    for (const x of L) {
      const v = x.q.vendas; r.un += v; r.fat += x.q.preco * v; r.imp += x.imp * v; r.cmv += x.q.custo * v; r.taxas += x.taxas * v;
      r.outrosVar += (x.q.frete + x.q.emb + x.q.pub + x.q.outros) * v; r.cm += x.cm * v;
    }
    r.fixos = ctx.cfg.fixos; r.recLiq = r.fat - r.imp; r.lb = r.recLiq - r.cmv; r.luc = r.cm - r.fixos;
    r.mg = r.fat ? r.luc / r.fat : 0; r.mcPct = r.fat ? r.cm / r.fat : 0; r.mgBruta = r.fat ? r.lb / r.fat : 0;
    r.peRec = r.mcPct > 0 ? r.fixos / r.mcPct : (r.fixos === 0 ? 0 : null);       // ponto de equilíbrio em R$ (mix atual)
    r.peUn = r.un > 0 && r.cm > 0 ? r.fixos / (r.cm / r.un) : (r.fixos === 0 ? 0 : null);
    r.seg = r.fat > 0 && r.peRec !== null ? (r.fat - r.peRec) / r.fat : null;     // margem de segurança
    return r;
  }

  /* Cenário sobre a empresa toda: variações em %, sem tocar nos dados reais (devolve cópia). */
  function cenario(ctx, d) {
    const k = x => 1 + num(x) / 100;
    return { cfg: { ...ctx.cfg, fixos: ctx.cfg.fixos * k(d.df) }, mps: ctx.mps,
      prods: ctx.prods.map(p => ({ ...p, preco: nn(p.preco) * k(d.dp), custo: nn(p.custo) * k(d.dc), pub: nn(p.pub) * k(d.da), vendas: nn(p.vendas) * k(d.dv) })) };
  }

  /* Fluxo de caixa mensal. Premissas: regime estável antes do mês 1; recebimento líquido das taxas do canal com prazo `dias`
     de cada marketplace; fornecedores pagos em `diasForn`; reposição = unidades vendidas × custo; impostos e demais custos
     variáveis pagos no mês da venda. Atraso em dias é distribuído entre meses de 30 dias. */
  function fluxo(ctx, N = 6) {
    const g = ctx.cfg.cresc / 100, fac = j => Math.pow(1 + g, Math.max(j, 1) - 1);
    const lag = (base, dias, m) => { const L = Math.floor(dias / 30), r = (dias % 30) / 30; return base * ((1 - r) * fac(m - L) + r * fac(m - L - 1)); };
    let rec = [], forn = 0, vistaMes = 0, cmMes = 0, fatMes = 0;
    for (const p of ctx.prods) {
      const x = calc(p, ctx), v = x.q.vendas, m = x.m;
      rec.push({ dias: m.dias || 0, base: (x.q.preco - x.taxas) * v });
      forn += x.q.custo * v; vistaMes += (x.imp + x.q.frete + x.q.emb + x.q.pub + x.q.outros) * v; cmMes += x.cm * v; fatMes += x.q.preco * v;
    }
    const rows = []; let ac = ctx.cfg.caixa;
    for (let m = 1; m <= N; m++) {
      const ent = rec.reduce((s, r) => s + lag(r.base, r.dias, m), 0), comp = lag(forn, ctx.cfg.diasForn, m);
      const sai = comp + vistaMes * fac(m) + ctx.cfg.fixos, liq = ent - sai; ac += liq;
      rows.push({ m, fat: fatMes * fac(m), lucro: cmMes * fac(m) - ctx.cfg.fixos, entradas: ent, saidas: sai, liq, caixa: ac });
    }
    return rows;
  }

  /* Alertas: [{n:'bad'|'warn'|'info', t:texto, id?}] */
  function alertas(ctx) {
    const o = [], c = ctx.cfg, used = {};
    for (const p of ctx.prods) {
      const x = calc(p, ctx), q = x.q, nm = q.nome || 'Produto sem nome', m = ctx.mps[q.mp];
      used[q.mp] = 1;
      if (!m) o.push({ n: 'bad', id: q.id, t: `${nm}: o marketplace "${q.mp}" não existe mais em Ajustes.` });
      if (!q.custo) o.push({ n: 'warn', id: q.id, t: `${nm}: custo de aquisição não informado. O lucro está superestimado.` });
      if (!q.preco) o.push({ n: 'warn', id: q.id, t: `${nm}: preço de venda não informado.` });
      else if (x.inviavel) o.push({ n: 'bad', id: q.id, t: `${nm}: comissão + taxas + impostos somam 100% ou mais do preço. Nenhum preço cobre isso.` });
      else if (x.luc < 0) o.push({ n: 'bad', id: q.id, t: `${nm}: vendido com prejuízo de ${(-x.luc).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por unidade (inclui rateio de fixos).` });
      else if (x.cm < 0) o.push({ n: 'bad', id: q.id, t: `${nm}: a margem de contribuição é negativa; cada venda aumenta o prejuízo.` });
      else if (c.mmin && x.mg < c.mmin / 100) o.push({ n: 'warn', id: q.id, t: `${nm}: margem abaixo da mínima de ${c.mmin}%.` });
      if (!q.vendas) o.push({ n: 'info', id: q.id, t: `${nm}: sem vendas mensais informadas; fica de fora do faturamento e do rateio de fixos.` });
    }
    for (const k of Object.keys(used)) { const m = ctx.mps[k]; if (m && !m.com && !m.fixa && !m.pag) o.push({ n: 'warn', t: `Taxas de ${k} não configuradas (comissão, taxa fixa e pagamento em 0). O lucro dos produtos nesse canal está superestimado.` }); }
    for (const k of Object.keys(used)) { const m = ctx.mps[k]; if (m && m.dias === null) o.push({ n: 'info', t: `Prazo de recebimento de ${k} não informado: a projeção de caixa considera recebimento à vista.` }); }
    if (ctx.prods.length && !c.fixos) o.push({ n: 'info', t: 'Custos fixos mensais não informados: o lucro líquido estimado ignora aluguel, salários etc.' });
    if (ctx.prods.length && !c.malvo) o.push({ n: 'info', t: 'Margem alvo não definida: o preço ideal fica igual ao preço mínimo.' });
    if (ctx.prods.length && !c.imp && ctx.prods.some(p => !nn(p.imp))) o.push({ n: 'info', t: 'Há produtos com imposto 0%. Confirme se isso está correto para o seu regime.' });
    return o;
  }

  /* Histórico: fotografia mensal gravada pelo usuário (dados reais informados, nunca inventados). */
  const snapshot = (ctx, mes) => { const r = resumo(ctx); return { mes, fat: r.fat, lb: r.lb, cm: r.cm, luc: r.luc, mg: r.mg, un: r.un, fixos: r.fixos }; };
  const variacao = (atual, ant) => ant ? (atual - ant) / Math.abs(ant) : null;

  /* CSV compatível com Excel pt-BR: separador ';', decimal vírgula, BOM, protegido contra injeção de fórmula. */
  const cell = v => {
    if (typeof v === 'number') return isFinite(v) ? String(Math.round(v * 10000) / 10000).replace('.', ',') : '';
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = rows => '\ufeff' + rows.map(r => r.map(cell).join(';')).join('\r\n');

  /* Normaliza qualquer estado vindo do disco/importação. Lança erro se não for um estado reconhecível. */
  function normState(d) {
    if (!d || typeof d !== 'object' || (d.prods !== undefined && !Array.isArray(d.prods))) throw new Error('formato inválido');
    const mps = {}, src = d.mps && typeof d.mps === 'object' && !Array.isArray(d.mps) ? d.mps : {};
    for (const k of Object.keys(src)) { const nm = String(k).trim().slice(0, 40); if (nm) mps[nm] = normMp(src[k]); }
    if (!Object.keys(mps).length) mps['Venda direta'] = normMp({});
    const seen = {}, prods = (d.prods || []).filter(p => p && typeof p === 'object').map((p, i) => {
      const q = normProd(p); if (!q.id || seen[q.id]) q.id = 'p' + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 6);
      seen[q.id] = 1; if (!mps[q.mp]) mps[q.mp] = normMp({}); return q;
    });
    const hist = (Array.isArray(d.hist) ? d.hist : []).filter(h => h && /^\d{4}-\d{2}$/.test(h.mes)).map(h => ({ mes: h.mes, fat: num(h.fat), lb: num(h.lb), cm: num(h.cm), luc: num(h.luc), mg: num(h.mg), un: num(h.un), fixos: num(h.fixos) })).sort((a, b) => a.mes < b.mes ? -1 : 1);
    return { v: 3, cfg: normCfg(d.cfg), mps, prods, hist };
  }

  return { num, nn, CFG0, normCfg, normMp, normProd, clean, calc, resumo, cenario, fluxo, alertas, snapshot, variacao, csv, cell, normState, precoPara, fixoUn, totals };
});
