/* PRECIFICA: interface. O motor de cálculo está em finance.js (Fin). Dados no localStorage (chave precifica3; migra precifica2 sem apagá-la). */
window.addEventListener('error',function(e){var a=document.getElementById('app');if(a&&!a.innerHTML)a.innerHTML='<div class="card">Não foi possível iniciar o app. Atualize a página ou use um navegador atualizado. ('+e.message+')</div>'});
const $=s=>document.querySelector(s),n=Fin.num;
const R=v=>isFinite(v)?v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
const P=v=>isFinite(v)&&v!==null?(v*100).toFixed(1).replace('.',',')+'%':'—';
const N0=v=>isFinite(v)&&v!==null?Math.round(v).toLocaleString('pt-BR'):'—';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const mesAtual=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const mesFmt=m=>m.slice(5)+'/'+m.slice(0,4);
const dataFmt=d=>d?d.split('-').reverse().join('/'):'';
const MKT_PADRAO={'Mercado Livre':{},'Shopee':{},'Amazon':{},'TikTok Shop':{},'Venda direta':{}};

/* ===== ARMAZENAMENTO SEGURO ===== */
const KEY='precifica3',OLD='precifica2',DRAFT='precifica3_rascunho',BAK='precifica3_backup';
let AVISO='',SAVE_OK=true;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}}};
const lset=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}};
function load(){
 const raw=ls.get(KEY);
 if(raw){try{return Fin.normState(JSON.parse(raw))}catch(e){lset('precifica3_corrompido_'+Date.now(),raw);AVISO='Os dados salvos estavam ilegíveis. Uma cópia foi guardada no navegador (chave precifica3_corrompido_*) e o app abriu vazio.'}}
 else{const old=ls.get(OLD);if(old){try{const s=Fin.normState(JSON.parse(old));lset(OLD+'_backup',old);return s}catch(e){AVISO='Não foi possível migrar os dados da versão anterior. Eles continuam intactos no navegador.'}}}
 return Fin.normState({mps:MKT_PADRAO});
}
let S=load();
if(!ls.get(KEY)&&S.prods.length)lset(KEY,JSON.stringify(S));
const ctx=()=>({cfg:S.cfg,mps:S.mps,prods:S.prods});
function save(){const ok=lset(KEY,JSON.stringify(S));if(ok!==SAVE_OK){SAVE_OK=ok;const b=$('#aviso');if(b)b.innerHTML=avisoHtml()}return ok}
function backup(){lset(BAK,JSON.stringify({em:new Date().toISOString(),dados:S}))}
const avisoHtml=()=>(AVISO?`<div class="banner bad">${esc(AVISO)}</div>`:'')+(SAVE_OK?'':'<div class="banner bad">Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado). Exporte um backup em Ajustes para não perder dados.</div>');

/* ===== ESTADO DE TELA (não salvo nos dados reais) ===== */
const blank=()=>({id:uid(),nome:'',sku:'',mp:Object.keys(S.mps)[0],custo:0,preco:0,imp:S.cfg.imp,frete:0,emb:0,pub:0,outros:0,vendas:0,estoque:0,conc:0});
const UI={cur:blank(),step:0,dirty:false,sel:'',mode:'p',pcs:[],pcv:0,ch:{}};
let tab=(location.hash.slice(1)||'')||(S.prods.length?'cat':'calc'),SIM={dp:0,dc:0,da:0,dv:0,dd:0,df:0};
try{const d=JSON.parse(ls.get(DRAFT)||'null');if(d&&d.cur&&d.dirty){UI.cur={...blank(),...Fin.clean(d.cur),nome:String(d.cur.nome||''),mp:S.mps[d.cur.mp]?d.cur.mp:Object.keys(S.mps)[0],id:String(d.cur.id||uid())};UI.dirty=true}}catch(e){}
const saveDraft=()=>{lset(DRAFT,JSON.stringify({cur:UI.cur,dirty:UI.dirty}))};
window.addEventListener('beforeunload',e=>{if(UI.dirty&&UI.cur.nome.trim()){e.preventDefault();e.returnValue=''}});
const toast=t=>{const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2200)};
const cp=()=>S.prods.find(x=>x.id==UI.sel)||S.prods[0];
const emp=()=>'<div class="card"><h3>Comece cadastrando um produto</h3><p class="mu">Esta tela usa os produtos do seu catálogo.</p><button class="pri" onclick="go(\'calc\')">Cadastrar produto</button></div>';
const sel=()=>`<label>Produto<select onchange="UI.sel=this.value;render()">${S.prods.map(p=>`<option value="${esc(p.id)}" ${p.id==cp().id?'selected':''}>${esc(p.nome||'(sem nome)')}</option>`).join('')}</select></label>`;
const mpk=i=>Object.keys(S.mps)[i];
const cfgOk=m=>m&&(m.com||m.fixa||m.pag);

/* ===== CAMPOS: m=moeda (digita só números), p=percentual, ps=percentual com sinal, q=quantidade ===== */
const fv=(k,v)=>k=='m'?R(v):k=='q'?String(Math.round(v)||0):String(Math.round(v*100)/100).replace('.',',');
const ni=(k,v,js,ex='')=>`<input type="text" inputmode="${k=='m'||k=='q'?'numeric':'decimal'}" autocomplete="off" value="${esc(fv(k,v))}" oninput="${js}" ${ex}>`;
function fi(el,k){let s=el.value,v;
 if(k=='m'){v=(parseInt(s.replace(/\D/g,'').slice(0,12)||'0',10))/100;el.value=R(v);try{el.setSelectionRange(el.value.length,el.value.length)}catch(e){}}
 else if(k=='q'){s=s.replace(/\D/g,'').slice(0,9);if(s!=el.value)el.value=s;v=+s||0}
 else{const ng=k=='ps'&&s.trim()[0]=='-';s=s.replace(/\./g,',').replace(/[^\d,]/g,'');const i=s.indexOf(',');if(i>=0)s=s.slice(0,i+1)+s.slice(i+1).replace(/,/g,'').slice(0,2);if(n(s)>100)s='100';s=(ng?'-':'')+s;if(s!=el.value)el.value=s;v=n(s)}
 return v}
/* ===== SIMULADOR: barra + campo sincronizados (valores são variações em %) ===== */
const SIMR={dp:[-30,30],dc:[-30,30],da:[-100,100],dv:[-50,100],dd:[0,60],df:[-50,100]};
const sl=(k,l)=>{const[mn,mx]=SIMR[k];return`<div class="sw"><label for="f_${k}">${l}</label><div class="sr"><input type="range" id="r_${k}" aria-label="${l}" min="${mn}" max="${mx}" step="0.05" value="${SIM[k]}" oninput="simSet('${k}',+this.value,'r')"><div class="pc"><input type="text" id="f_${k}" inputmode="text" autocomplete="off" value="${fv('p',SIM[k])}" oninput="simIn('${k}',this)" onblur="simFix('${k}')"><i>%</i></div></div></div>`};
function simSet(k,v,src){SIM[k]=v;if(src!='r')$('#r_'+k).value=v;if(src!='f')$('#f_'+k).value=fv('p',v);$('#out').innerHTML=(tab=='pr'?prOut:simOut)()}
function simIn(k,el){const[mn,mx]=SIMR[k];let s=el.value.replace(/\./g,',').replace(/[^\d,-]/g,'');const ng=s[0]=='-';s=s.replace(/-/g,'');const i=s.indexOf(',');if(i>=0)s=s.slice(0,i+1)+s.slice(i+1).replace(/,/g,'').slice(0,2);s=(ng&&mn<0?'-':'')+s;if(s!=el.value)el.value=s;simSet(k,Math.min(mx,Math.max(mn,n(s))),'f')}
const simFix=k=>{$('#f_'+k).value=fv('p',SIM[k])};
const simReset=()=>{SIM={dp:0,dc:0,da:0,dv:0,dd:0,df:0};render()};

/* ===== ESTOQUE ===== */
const estD=p=>{const cob=p.vendas?p.estoque/(p.vendas/30):Infinity,low=p.estoque<=0||(S.cfg.diasRepor&&cob<S.cfg.diasRepor);return[R(p.estoque*p.custo),isFinite(cob)?Math.round(cob)+' dias':'—',p.estoque<=0?'<span class="bd neg">Sem estoque</span>':low?'<span class="bd war">Repor</span>':'<span class="bd pos">OK</span>',low]};
const estK=()=>{const d=S.prods.map(estD),a=d.filter(x=>x[3]).length;return`<div class="kpis"><div class="kpi"><span>Capital parado em estoque (a custo)</span><b>${R(S.prods.reduce((s,p)=>s+p.estoque*p.custo,0))}</b></div><div class="kpi"><span>Unidades em estoque</span><b>${N0(S.prods.reduce((s,p)=>s+p.estoque,0))}</b></div><div class="kpi"><span>Produtos para repor</span><b class="${a?'war':'pos'}">${a}</b></div></div>`};
function setE(id,v){const p=S.prods.find(x=>x.id==id);if(!p)return;p.estoque=Math.max(0,Math.round(v)||0);if(UI.cur.id==id&&!UI.dirty)UI.cur.estoque=p.estoque;const d=estD(p);$('#ec_'+id).textContent=d[0];$('#eb_'+id).textContent=d[1];$('#es_'+id).innerHTML=d[2];$('#estK').innerHTML=estK();save();$('#estMsg').textContent='✓ Salvo';clearTimeout(setE.t);setE.t=setTimeout(()=>{const e=$('#estMsg');if(e)e.textContent=''},1500)}
function stepE(id,d){const p=S.prods.find(x=>x.id==id);if(!p)return;setE(id,p.estoque+d);$('#eq_'+id).value=p.estoque}

/* ===== COMPARAÇÃO COM PERÍODOS ANTERIORES (só com fechamentos registrados pelo usuário) ===== */
const dlt=(a,b,pp)=>{if(b==null)return'';let d;if(pp)d=(a-b)*100;else{d=Fin.variacao(a,b);if(d==null)return'';d*=100}const t=(d>=0?'▲ ':'▼ ')+Math.abs(d).toFixed(1).replace('.',',')+(pp?' p.p.':'%');return`<small class="${d>=0?'pos':'neg'}">${t}</small>`};
const refHist=()=>{const h=S.hist.filter(x=>x.mes<mesAtual());return h[h.length-1]||null};
const kpi=(l,v,sub,cl='',d='')=>`<div class="kpi"><span>${l}</span><b class="${cl}">${v}</b>${d?`<div>${d}</div>`:''}${sub?`<small class="mu">${sub}</small>`:''}</div>`;
function fechar(){const m=($('#mesf')||{}).value||mesAtual();if(!/^\d{4}-\d{2}$/.test(m))return toast('Escolha o mês');backup();const s=Fin.snapshot(ctx(),m),i=S.hist.findIndex(x=>x.mes==m);if(i>=0){if(!confirm('Já existe um fechamento de '+mesFmt(m)+'. Substituir?'))return;S.hist[i]=s}else S.hist.push(s);S.hist.sort((a,b)=>a.mes<b.mes?-1:1);save();render();toast('Fechamento de '+mesFmt(m)+' registrado')}
function delH(m){if(confirm('Remover o fechamento de '+mesFmt(m)+'?')){backup();S.hist=S.hist.filter(x=>x.mes!=m);save();render()}}

/* ===== CAIXA ===== */
function fluxoHtml(){const f=Fin.fluxo(ctx()),r=Fin.resumo(ctx()),ng=f.find(x=>x.caixa<0),mx=Math.max(...f.map(x=>Math.abs(x.liq)),1);
 return`<p class="${ng?'neg':'pos'}" style="margin:10px 0"><b>${ng?`O caixa fica negativo no mês ${ng.m}.`:`Caixa positivo nos 6 meses. Saldo final projetado: ${R(f[5].caixa)}.`}</b></p>
 <div class="kpis">${kpi('Lucro líquido estimado (mês 1)',R(f[0].lucro),'contábil, por competência',f[0].lucro<0?'neg':'pos')}${kpi('Resultado de caixa (mês 1)',R(f[0].liq),'entradas − saídas efetivas',f[0].liq<0?'neg':'pos')}${kpi('Dinheiro disponível projetado (mês 6)',R(f[5].caixa),'caixa inicial + resultados',f[5].caixa<0?'neg':'pos')}${kpi('Estoque a custo',R(S.prods.reduce((s,p)=>s+p.estoque*p.custo,0)),'dinheiro já aplicado')}</div>
 <div class="tb"><table><tr><th>Mês</th><th>Faturamento</th><th>Lucro estimado</th><th>Entradas</th><th>Saídas</th><th>Resultado de caixa</th><th>Caixa acumulado</th><th></th></tr>
 ${f.map(x=>`<tr><td>${x.m}</td><td>${R(x.fat)}</td><td class="${x.lucro<0?'neg':'pos'}">${R(x.lucro)}</td><td>${R(x.entradas)}</td><td>${R(x.saidas)}</td><td class="${x.liq<0?'neg':'pos'}">${R(x.liq)}</td><td class="${x.caixa<0?'neg':'pos'}"><b>${R(x.caixa)}</b></td><td style="width:90px"><div class="bar" style="width:${Math.abs(x.liq)/mx*100}%;${x.liq<0?'background:var(--bad)':'background:var(--ok)'}"></div></td></tr>`).join('')}</table></div>`}
const fluxoUpd=()=>{const e=$('#fluxo');if(e)e.innerHTML=fluxoHtml()};

/* ===== PRODUTO: ETAPAS ===== */
const FD={nome:['Nome do produto','text'],sku:['SKU (opcional)','text'],mp:['Canal de venda','sel'],custo:['Custo de aquisição (R$)','m'],preco:['Preço de venda (R$)','m'],imp:['Impostos sobre a venda (%)','p'],frete:['Frete pago por você (R$)','m'],emb:['Embalagem (R$)','m'],pub:['Publicidade por venda (R$)','m'],outros:['Outros custos variáveis (R$)','m'],vendas:['Vendas por mês (un.)','q'],estoque:['Estoque (un.)','q'],conc:['Preço do concorrente (R$)','m']};
const STEPS=[['Produto',['nome','mp','custo','preco'],['sku']],['Custos da venda',['imp','frete'],['emb','pub','outros']],['Volume',['vendas'],['estoque','conc']]];
function upd(k,v){UI.cur[k]=(k=='nome'||k=='mp'||k=='sku')?v:n(v);UI.dirty=true;clearTimeout(upd.t);upd.t=setTimeout(saveDraft,400);$('#res').innerHTML=res(Fin.calc(UI.cur,ctx()))}
const fld=(k)=>{const[l,t]=FD[k],c=UI.cur;return`<label class="${k=='nome'||k=='mp'?'w':''}">${l}${t=='sel'?`<select onchange="upd('${k}',this.value)">${Object.keys(S.mps).map(x=>`<option ${x==c[k]?'selected':''}>${esc(x)}</option>`).join('')}</select>`:t=='text'?`<input type="text" maxlength="80" value="${esc(c[k])}" oninput="upd('${k}',this.value)">`:ni(t,c[k],`upd('${k}',fi(this,'${t}'))`)}</label>`};
function stepTo(i){if(i>UI.step&&UI.step==0&&!UI.cur.nome.trim())return toast('Dê um nome ao produto');UI.step=Math.max(0,Math.min(2,i));render()}
function res(r){const q=r.q,m=r.m,al=[];
 if(!q.preco)return'<h3>Quanto você realmente ganha</h3><p class="mu">Informe o preço de venda e os custos. O resultado aparece aqui, calculado só com os seus números.</p>';
 if(!cfgOk(S.mps[q.mp]))al.push('As taxas deste canal estão zeradas. Informe-as em Ajustes para o lucro refletir a comissão real.');
 if(!q.custo)al.push('Custo de aquisição zerado: o lucro está superestimado.');
 if(r.inviavel)al.push('Comissão, taxas e impostos somam 100% ou mais do preço: não existe preço que dê lucro.');
 if(!S.cfg.fixos)al.push('Custos fixos zerados: o lucro abaixo é antes de rateio de fixos.');
 const br=[['Custo do produto',q.custo],['Comissão e taxas do canal',r.taxas],['Impostos',r.imp],['Frete',q.frete],['Embalagem',q.emb],['Publicidade',q.pub],['Outros custos',q.outros],['Custos fixos (rateio)',r.fx],['Lucro',r.luc]];
 const cl=r.luc<0?'bad':S.cfg.mmin&&r.mg<S.cfg.mmin/100?'war':'pos',tx=r.luc<0?`Você perde ${R(-r.luc)} em cada venda.`:cl=='war'?`Margem abaixo da mínima de ${S.cfg.mmin}%.`:'Margem dentro do que você definiu.';
 return`<h3>Quanto você realmente ganha</h3><div class="big ${r.luc<0?'neg':'pos'}">${R(r.luc)}</div><div class="${cl}" style="margin:4px 0 12px">por unidade. ${tx}</div>
 ${al.map(a=>`<div class="banner warn">${a}</div>`).join('')}
 <div class="kpis"><div class="kpi"><span>Margem de lucro</span><b>${P(r.mg)}</b></div><div class="kpi"><span>Margem de contribuição</span><b>${R(r.cm)}</b><small class="mu">${P(r.cmPct)} do preço</small></div><div class="kpi"><span>Markup sobre o custo</span><b>${P(r.markup)}</b></div><div class="kpi"><span>ROI</span><b>${P(r.roi)}</b></div>
 <div class="kpi"><span>Custo total por venda</span><b>${R(r.tot)}</b></div><div class="kpi"><span>Preço mínimo (lucro zero)</span><b>${R(r.min)}</b></div><div class="kpi"><span>Preço recomendado (${S.cfg.malvo}%)</span><b>${R(r.ideal)}</b></div><div class="kpi"><span>Custo máx. de aquisição</span><b>${r.cmax>0?R(r.cmax):'—'}</b></div>
 <div class="kpi"><span>Ponto de equilíbrio (só este produto)</span><b>${r.pe===null?'—':N0(r.pe)+' un./mês'}</b></div></div>
 <div class="mu" style="font-size:13px;margin-bottom:6px">Para onde vai cada ${R(q.preco)}</div>
 ${br.map(([a,v],i)=>`<div class="bl"><span>${a}</span><div><div class="bar ${i==8?'l':''}" style="width:${Math.max(0,Math.min(100,q.preco?v/q.preco*100:0))}%"></div></div><span>${R(v)}</span></div>`).join('')}
 <div class="mu" style="font-size:12px;margin-top:8px">O preço recomendado cobre custo, comissão, taxas, impostos, frete, embalagem, publicidade, outros e o rateio de fixos, e ainda entrega a margem alvo. Ponto de equilíbrio: unidades por mês para cobrir os custos fixos vendendo só este produto.</div>`}
function saveP(){const c=UI.cur;if(!c.nome.trim()){UI.step=0;render();return toast('Dê um nome ao produto')}
 if(!c.preco)return toast('Informe o preço de venda');
 const v=Fin.normProd(c),i=S.prods.findIndex(x=>x.id==c.id);backup();i<0?S.prods.push(v):S.prods[i]=v;UI.dirty=false;saveDraft();save();render();toast('Produto salvo')}
const newP=()=>{if(UI.dirty&&UI.cur.nome.trim()&&!confirm('Há alterações não salvas neste produto. Descartar?'))return;UI.cur=blank();UI.dirty=false;UI.step=0;saveDraft();render()};
const editP=id=>{if(UI.dirty&&UI.cur.nome.trim()&&UI.cur.id!=id&&!confirm('Há alterações não salvas no produto em edição. Descartar?'))return;UI.cur={...S.prods.find(x=>x.id==id)};UI.dirty=false;UI.step=0;go('calc')};
const delP=id=>{if(confirm('Excluir este produto? Você poderá restaurar a versão anterior em Ajustes.')){backup();S.prods=S.prods.filter(x=>x.id!=id);if(UI.cur.id==id){UI.cur=blank();UI.dirty=false}save();render()}};

/* ===== EXPORTAÇÃO (CSV com ; e vírgula decimal: abre direto no Excel) ===== */
function dl(nome,txt,tipo){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:tipo||'text/csv;charset=utf-8'}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
const hoje=()=>new Date().toISOString().slice(0,10);
function expProd(){if(!S.prods.length)return toast('Nenhum produto para exportar');const c=ctx();
 dl('precifica-produtos-'+hoje()+'.csv',Fin.csv([['Produto','SKU','Canal','Custo de aquisição','Preço de venda','Imposto %','Frete','Embalagem','Publicidade','Outros custos','Vendas/mês','Estoque','Preço concorrente','Custo fixo rateado/un.','Custo total/un.','Lucro/un.','Margem %','Margem de contribuição/un.','Markup %','ROI %','Preço mínimo','Preço recomendado','Lucro mensal do produto']].concat(S.prods.map(p=>{const r=Fin.calc(p,c),q=r.q;return[q.nome,q.sku,q.mp,q.custo,q.preco,q.imp,q.frete,q.emb,q.pub,q.outros,q.vendas,q.estoque,q.conc,r.fx,r.tot,r.luc,r.mg*100,r.cm,r.markup==null?'':r.markup*100,r.roi*100,r.min,r.ideal,r.luc*q.vendas]}))))}
function expRel(){if(!S.prods.length)return toast('Nenhum produto para exportar');const c=ctx(),r=Fin.resumo(c),f=Fin.fluxo(c);
 const rows=[['Precifica: relatório gerado em '+hoje()],['Valores estimados a partir dos dados informados por você; não substituem contabilidade.'],[],['INDICADORES MENSAIS','Valor'],['Faturamento',r.fat],['Impostos sobre vendas',r.imp],['Receita líquida',r.recLiq],['Custo dos produtos vendidos',r.cmv],['Lucro bruto',r.lb],['Margem de contribuição',r.cm],['Custos fixos',r.fixos],['Lucro líquido estimado',r.luc],['Margem líquida %',r.mg*100],['Ponto de equilíbrio (R$)',r.peRec==null?'não atingível':r.peRec],['Ponto de equilíbrio (un.)',r.peUn==null?'não atingível':r.peUn],[],['PROJEÇÃO DE CAIXA','Faturamento','Lucro estimado','Entradas','Saídas','Resultado de caixa','Caixa acumulado']].concat(f.map(x=>['Mês '+x.m,x.fat,x.lucro,x.entradas,x.saidas,x.liq,x.caixa]));
 if(S.hist.length)rows.push([],['HISTÓRICO','Faturamento','Lucro bruto','Margem de contribuição','Lucro líquido','Margem %','Unidades']),S.hist.forEach(h=>rows.push([h.mes,h.fat,h.lb,h.cm,h.luc,h.mg*100,h.un]));
 dl('precifica-relatorio-'+hoje()+'.csv',Fin.csv(rows))}

/* ===== TELAS ===== */
const V={
calc(){const c=UI.cur,ed=S.prods.some(x=>x.id==c.id),s=UI.step,[tt,bas,adv]=STEPS[s];if(ed&&!UI.dirty)c.estoque=S.prods.find(x=>x.id==c.id).estoque;
 return`<h1>Descubra quanto você realmente ganha em cada produto.</h1><p class="mu" style="margin-top:0">Preencha em 3 passos. O resultado atualiza enquanto você digita.</p>
 <div class="grid"><div class="card"><h3>${ed?'Editando produto':'Novo produto'}${UI.dirty?' <span class="bd war">não salvo</span>':''}</h3>
 <div class="steps">${STEPS.map((x,i)=>`<button class="${i==s?'on':''}" onclick="stepTo(${i})" aria-current="${i==s}"><b>${i+1}</b> ${x[0]}</button>`).join('')}</div>
 <div class="fm">${bas.map(fld).join('')}</div>
 <details class="adv" ${adv.some(k=>c[k]&&k!='sku'&&k!='imp')?'open':''}><summary>Campos avançados (opcional)</summary><div class="fm">${adv.map(fld).join('')}</div></details>
 <div class="row">${s>0?`<button onclick="stepTo(${s-1})">Voltar</button>`:''}${s<2?`<button class="pri" onclick="stepTo(${s+1})">Próximo</button>`:''}<button class="${s==2?'pri':''}" onclick="saveP()">Salvar no catálogo</button><button onclick="newP()">Novo produto</button></div></div>
 <div class="card" id="res">${res(Fin.calc(c,ctx()))}</div></div>`},
cat(){if(!S.prods.length)return emp();
 const c=ctx(),r=Fin.resumo(c),ref=refHist(),L=r.L.slice().sort((a,b)=>a.mg-b.mg),prej=L.filter(x=>x.luc<0),baixo=L.filter(x=>x.luc>=0&&S.cfg.mmin&&x.mg<S.cfg.mmin/100),dup=new Set(prej.concat(baixo).map(x=>x.q.id)),al=Fin.alertas(c).filter(a=>!(a.id&&dup.has(a.id)&&/prejuízo|abaixo da mínima|margem de contribuição é negativa/.test(a.t)));
 const pe=r.peRec,pct=pe?Math.min(100,r.fat/pe*100):(pe===0?100:0);
 return`<div id="aviso">${avisoHtml()}</div>
 <div class="kpis kp3">${kpi('Faturamento mensal',R(r.fat),ref?'':'',' ',dlt(r.fat,ref&&ref.fat))}${kpi('Lucro bruto',R(r.lb),P(r.mgBruta)+' do faturamento','',dlt(r.lb,ref&&ref.lb))}${kpi('Margem de contribuição',R(r.cm),P(r.mcPct)+' do faturamento','',dlt(r.cm,ref&&ref.cm))}
 ${kpi('Lucro líquido estimado',R(r.luc),'após custos fixos',r.luc<0?'neg':'pos',dlt(r.luc,ref&&ref.luc))}${kpi('Margem líquida média',P(r.mg),'meta '+S.cfg.malvo+'% · mínima '+S.cfg.mmin+'%',r.mg<0?'neg':S.cfg.mmin&&r.mg<S.cfg.mmin/100?'war':'pos',dlt(r.mg,ref&&ref.mg,1))}${kpi('Ponto de equilíbrio',pe==null?'inatingível':R(pe),pe==null?'a margem de contribuição não cobre os fixos':N0(r.peUn)+' un./mês',pe==null?'neg':'')}</div>
 ${ref?`<p class="mu" style="margin:-4px 0 12px;font-size:12px">Variações em relação ao fechamento de ${mesFmt(ref.mes)}, registrado por você.</p>`:'<p class="mu" style="margin:-4px 0 12px;font-size:12px">Registre o fechamento do mês abaixo para ver comparações com períodos anteriores.</p>'}
 <div class="card"><h3>Faturamento × ponto de equilíbrio</h3><div class="eq"><div class="bar ${r.fat>=pe?'l':''}" style="width:${pct}%;height:14px;${r.fat<pe?'background:var(--bad)':''}"></div></div><div class="mu" style="font-size:13px;margin-top:6px">${pe==null?'Os custos fixos não são cobertos pelo mix atual.':r.fat>=pe?`Você está ${P(r.seg)} acima do equilíbrio (margem de segurança).`:`Faltam ${R(pe-r.fat)} de faturamento para cobrir os custos fixos.`}</div></div>
 ${prej.length||baixo.length?`<div class="card"><h3>Produtos que pedem atenção</h3>${prej.map(x=>`<div class="ins bad"><b>${esc(x.q.nome)}</b>: prejuízo de ${R(-x.luc)} por unidade (margem ${P(x.mg)}). Preço mínimo: ${R(x.min)}. <button onclick="editP('${esc(x.q.id)}')">Ajustar</button></div>`).join('')}${baixo.map(x=>`<div class="ins warn"><b>${esc(x.q.nome)}</b>: margem ${P(x.mg)}, abaixo da mínima de ${S.cfg.mmin}%. Preço para a meta: ${R(x.ideal)}. <button onclick="editP('${esc(x.q.id)}')">Ajustar</button></div>`).join('')}</div>`:''}
 ${al.length?`<div class="card"><h3>Alertas de configuração (${al.length})</h3>${al.slice(0,5).map(a=>`<div class="ins ${a.n=='bad'?'bad':a.n=='warn'?'warn':'info'}">${esc(a.t)}${a.id?` <button onclick="editP('${esc(a.id)}')">Corrigir</button>`:''}</div>`).join('')}${al.length>5?`<details><summary>Ver os outros ${al.length-5}</summary>${al.slice(5).map(a=>`<div class="ins ${a.n=='bad'?'bad':a.n=='warn'?'warn':'info'}">${esc(a.t)}</div>`).join('')}</details>`:''}</div>`:''}
 <div class="card"><h3>Fechamentos mensais</h3><p class="mu" style="margin-top:0">Grava uma fotografia dos números atuais para comparar com meses futuros. Só guarda o que você informou.</p><div class="row" style="margin:0 0 10px"><input id="mesf" type="month" value="${mesAtual()}" style="width:auto"><button onclick="fechar()">Registrar fechamento</button></div>
 ${S.hist.length?`<div class="tb"><table><tr><th>Mês</th><th>Faturamento</th><th>Lucro bruto</th><th>Lucro líquido</th><th>Margem</th><th></th></tr>${S.hist.slice(-6).reverse().map((h,i,a)=>{const pv=a[i+1];return`<tr><td>${mesFmt(h.mes)}</td><td>${R(h.fat)} ${dlt(h.fat,pv&&pv.fat)}</td><td>${R(h.lb)}</td><td class="${h.luc<0?'neg':''}">${R(h.luc)} ${dlt(h.luc,pv&&pv.luc)}</td><td>${P(h.mg)}</td><td><button onclick="delH('${h.mes}')" aria-label="Remover">×</button></td></tr>`}).join('')}</table></div>`:''}</div>
 <div class="card"><h3>Catálogo, do mais frágil ao mais forte</h3><div class="tb"><table><tr><th>Produto</th><th>Canal</th><th>Preço</th><th>Lucro/un.</th><th>Margem</th><th>ROI</th><th>Status</th><th></th></tr>
 ${L.map(x=>{const st=x.luc<0?['neg','Prejuízo']:(S.cfg.mmin&&x.mg<S.cfg.mmin/100)?['war','Abaixo da mínima']:(S.cfg.malvo&&x.mg<S.cfg.malvo/100)?['war','Abaixo da meta']:['pos','OK'];return`<tr><td>${esc(x.q.nome)}</td><td>${esc(x.q.mp)}</td><td>${R(x.q.preco)}</td><td class="${x.luc<0?'neg':''}">${R(x.luc)}</td><td>${P(x.mg)}</td><td>${P(x.roi)}</td><td><span class="bd ${st[0]}">${st[1]}</span></td><td><button onclick="editP('${esc(x.q.id)}')">Editar</button> <button onclick="delP('${esc(x.q.id)}')">Excluir</button></td></tr>`}).join('')}</table></div>
 <div class="row"><button onclick="expProd()">Exportar produtos (CSV/Excel)</button><button onclick="expRel()">Exportar relatório (CSV/Excel)</button></div></div>`},
prc(){if(!S.prods.length)return emp();const p=cp(),c=ctx(),a=Fin.calc(p,c);if(!p.preco)return`<div class="card"><h3>Comparar preços</h3>${sel()}<p class="mu">Informe o preço de venda deste produto para comparar alternativas.</p></div>`;
 const rows=[[-15,-10,-5,0,5,10,15].map(d=>[d?(d>0?'+':'')+d+'%':'Preço atual',p.preco*(1+d/100)])].flat();
 UI.pcs.forEach((v,i)=>rows.push(['Seu preço',v,i]));
 if(isFinite(a.min))rows.push(['Preço mínimo',a.min]);if(isFinite(a.ideal)&&S.cfg.malvo)rows.push(['Preço recomendado',a.ideal]);if(p.conc)rows.push(['Concorrente',p.conc]);
 rows.sort((x,y)=>x[1]-y[1]);
 return`<div class="card"><h3>Comparar preços de venda</h3>${sel()}<p class="mu">Mostra o impacto de cada preço no lucro e na margem, mantendo o volume atual (${N0(p.vendas)} un./mês). Nada é salvo no produto.</p>
 <div class="row" style="margin-top:0;align-items:end"><label style="flex:1;min-width:140px">Testar outro preço${ni('m',UI.pcv,"UI.pcv=fi(this,'m')")}</label><button onclick="addPc()">Adicionar</button>${UI.pcs.length?'<button onclick="UI.pcs=[];render()">Limpar meus preços</button>':''}</div>
 <div class="tb"><table><tr><th>Cenário</th><th>Preço</th><th>Lucro/un.</th><th>Margem</th><th>Lucro mensal*</th><th>Vendas p/ igualar o lucro atual</th><th></th></tr>
 ${rows.map(([l,pr,i])=>{const r=Fin.calc(p,c,{preco:pr}),atual=Math.abs(pr-p.preco)<.005,vol=a.cm>0&&r.cm>0?Math.ceil(a.cm*p.vendas/r.cm):null;const st=r.luc<0?['neg','Prejuízo']:(S.cfg.mmin&&r.mg<S.cfg.mmin/100)?['war','Abaixo da mínima']:(S.cfg.malvo&&r.mg<S.cfg.malvo/100)?['war','Abaixo da meta']:['pos','OK'];
 return`<tr class="${atual?'hl':''}"><td>${l}${i!==undefined?` <button onclick="UI.pcs.splice(${i},1);render()" aria-label="Remover">×</button>`:''}</td><td>${R(pr)} <small class="mu">${atual?'':dlt(pr,p.preco)}</small></td><td class="${r.luc<0?'neg':''}">${R(r.luc)}</td><td>${P(r.mg)}</td><td class="${r.luc<0?'neg':''}">${R(r.luc*p.vendas)}</td><td>${vol===null?'—':N0(vol)+' un.'}</td><td><span class="bd ${st[0]}">${st[1]}</span></td></tr>`}).join('')}</table></div>
 <p class="mu" style="font-size:12px">*Lucro do produto após o rateio de fixos, supondo o mesmo volume. Preços maiores podem reduzir as vendas; a coluna "Vendas p/ igualar" mostra quanto seria preciso vender para ganhar o mesmo que hoje.</p></div>`},
sim(){if(!S.prods.length)return emp();const emp_=UI.mode=='e';
 return`<div class="card"><h3>Simulador de cenários</h3><div class="banner info">Simulação: nada aqui altera os produtos, custos ou ajustes que você cadastrou.</div>
 <div class="steps"><button class="${!emp_?'on':''}" onclick="UI.mode='p';render()">Um produto</button><button class="${emp_?'on':''}" onclick="UI.mode='e';render()">Empresa toda</button></div>${emp_?'':sel()}
 <p class="mu" style="margin:8px 0 0">Arraste a barra ou digite o valor exato (ex.: 14,25). Todos os campos são variações em relação ao valor atual.</p>
 <div class="fm" style="margin-top:10px">${sl('dp','Preço (variação %)')}${sl('dc','Custo de aquisição (variação %)')}${sl('da','Publicidade (variação %)')}${sl('dv','Volume de vendas (variação %)')}${emp_?sl('df','Custos fixos (variação %)'):''}</div><div class="row" style="margin-top:0"><button onclick="simReset()">Zerar cenário</button></div><div id="out" style="margin-top:12px">${simOut()}</div></div>`},
mk(){if(!S.prods.length)return emp();const p=cp();
 return`<div class="card"><h3>Onde este produto rende mais</h3>${sel()}<p class="mu">Compare a rentabilidade por canal. Ajuste preço e frete de cada canal para simular (não altera o cadastro). Comissão, taxas e impostos vêm de Ajustes.</p>
 <div class="fm">${Object.keys(S.mps).map((k,i)=>{const o=UI.ch[p.id+'|'+k]||{};return`<div class="w chrow"><b>${esc(k)}</b><label>Preço (R$)${ni('m',o.preco!=null?o.preco:p.preco,`chSet(${i},'preco',fi(this,'m'))`)}</label><label>Frete (R$)${ni('m',o.frete!=null?o.frete:p.frete,`chSet(${i},'frete',fi(this,'m'))`)}</label></div>`}).join('')}</div>
 <div id="chOut" style="margin-top:12px">${chOut()}</div></div>`},
fin(){if(!S.prods.length)return emp();const c=S.cfg,f=(k,l,t)=>`<label>${l}${ni(t,c[k],`S.cfg.${k}=fi(this,'${t}');save();fluxoUpd()`)}</label>`;
 const nd=Object.keys(S.mps).filter(k=>S.prods.some(p=>p.mp==k)&&S.mps[k].dias===null);
 return`<div class="card"><h3>Lucro não é dinheiro no bolso</h3><p class="mu" style="margin-top:0">O <b>lucro estimado</b> é contábil (vendas menos custos do mês). O <b>caixa</b> considera quando o dinheiro entra (prazo de recebimento do canal) e sai (fornecedores, reposição de estoque, impostos, custos fixos).</p>
 ${nd.length?`<div class="banner warn">Prazo de recebimento não informado para: ${nd.map(esc).join(', ')}. A projeção considera recebimento à vista. Informe em Ajustes.</div>`:''}
 <div class="fm">${f('caixa','Caixa inicial (R$)','m')}${f('fixos','Custos fixos mensais (R$)','m')}${f('cresc','Crescimento mensal das vendas (%)','ps')}${f('diasForn','Prazo de pagamento a fornecedores (dias)','q')}</div>
 <p class="mu" style="font-size:12px">Premissas: vendas e prazos estáveis antes do mês 1; reposição de estoque igual às unidades vendidas; impostos pagos no mês da venda; taxas do canal descontadas no recebimento. É uma projeção a partir dos seus dados, não uma previsão.</p><div id="fluxo">${fluxoHtml()}</div><div class="row"><button onclick="expRel()">Exportar relatório (CSV/Excel)</button></div></div>`},
pr(){if(!S.prods.length)return emp();
 return`<div class="card"><h3>Análise de promoção</h3>${sel()}<div style="margin-top:10px">${sl('dd','Desconto (%)')}</div><div id="out" style="margin-top:12px">${prOut()}</div></div>`},
est(){if(!S.prods.length)return emp();
 return`<div id="estK">${estK()}</div><div class="card"><h3>Estoque</h3><p class="mu" style="margin-top:0">Altere a quantidade direto na tabela. Salvo automaticamente <b id="estMsg" class="pos"></b></p><div class="tb"><table><tr><th>Produto</th><th>Quantidade</th><th>Capital parado</th><th>Cobertura</th><th>Situação</th></tr>
 ${S.prods.map(p=>{const d=estD(p),id=esc(p.id);return`<tr><td>${esc(p.nome)}</td><td><div class="qty"><button onclick="stepE('${id}',-1)" aria-label="Diminuir">−</button><input id="eq_${id}" type="text" inputmode="numeric" autocomplete="off" value="${p.estoque}" oninput="setE('${id}',fi(this,'q'))" aria-label="Quantidade de ${esc(p.nome)}"><button onclick="stepE('${id}',1)" aria-label="Aumentar">+</button></div></td><td id="ec_${id}">${d[0]}</td><td id="eb_${id}">${d[1]}</td><td id="es_${id}">${d[2]}</td></tr>`}).join('')}</table></div><p class="mu" style="font-size:12px">A reposição entra na projeção de caixa em Finanças.</p></div>`},
ia(){if(!S.prods.length)return emp();
 return`<div class="card"><h3>O que eu deveria fazer para ganhar mais dinheiro?</h3><p class="mu">Análise automática por regras, só com os seus dados. Cada item traz diagnóstico, recomendação e ação.</p>${ins().map(([t,x])=>`<div class="ins ${t}">${x}</div>`).join('')}</div>`},
cfg(){const c=S.cfg,f=(k,l,t)=>`<label>${l}${ni(t,c[k],`S.cfg.${k}=fi(this,'${t}');save()`)}</label>`,ks=Object.keys(S.mps);
 return`<div id="aviso">${avisoHtml()}</div><div class="card"><h3>Operação</h3><div class="fm">${f('fixos','Custos fixos mensais (R$)','m')}<label>Rateio dos custos fixos<select onchange="S.cfg.rateio=this.value;save()"><option value="un" ${c.rateio=='un'?'selected':''}>Por unidade vendida</option><option value="fat" ${c.rateio=='fat'?'selected':''}>Por faturamento</option></select></label>${f('mmin','Margem mínima (%)','p')}${f('malvo','Margem alvo (%)','p')}${f('imp','Imposto padrão para novos produtos (%)','p')}${f('cresc','Crescimento mensal das vendas (%)','ps')}${f('caixa','Caixa inicial (R$)','m')}${f('diasForn','Prazo de pagamento a fornecedores (dias)','q')}${f('diasRepor','Alertar reposição abaixo de (dias de estoque)','q')}</div></div>
 <div class="card"><h3>Marketplaces: informe as taxas de cada um</h3><div class="banner warn">O Precifica não traz taxas prontas. Consulte a tabela oficial de cada canal, informe aqui e marque a data da conferência. Sem a data, a taxa aparece como "não verificada".</div><div class="tb"><table><tr><th>Nome</th><th>Comissão %</th><th>Taxa fixa R$</th><th>Pagamento %</th><th>Receb. (dias)</th><th>Conferida em</th><th></th></tr>
 ${ks.map((k,i)=>{const m=S.mps[k];return`<tr><td>${esc(k)}<br>${m.conf?`<span class="bd pos">conferida ${dataFmt(m.conf)}</span>`:'<span class="bd war">não verificada</span>'}</td>${['com','fixa','pag'].map(x=>`<td>${ni(x=='fixa'?'m':'p',m[x],`setMp(${i},'${x}',fi(this,'${x=='fixa'?'m':'p'}'))`)}</td>`).join('')}<td><input type="text" inputmode="numeric" autocomplete="off" placeholder="não informado" value="${m.dias===null?'':m.dias}" oninput="setMp(${i},'dias',this.value===''?null:fi(this,'q'))" style="width:96px"></td><td><input type="date" value="${esc(m.conf)}" onchange="setMp(${i},'conf',this.value);render()" style="width:140px"></td><td><button onclick="delMp(${i})" aria-label="Remover ${esc(k)}">×</button></td></tr>`}).join('')}</table></div>
 <div class="row"><button onclick="addMp()">Adicionar marketplace</button></div></div>
 <div class="card"><h3>Dados</h3><p class="mu" style="margin-top:0">Os dados ficam só neste navegador. Faça backup com frequência. Antes de excluir, importar ou apagar, o app guarda a versão anterior.</p><div class="row"><button onclick="exp()">Exportar backup (JSON)</button><button onclick="$('#imp').click()">Importar JSON</button><button onclick="restore()">Restaurar versão anterior</button><button onclick="expProd()">Produtos (CSV/Excel)</button><button onclick="expRel()">Relatório (CSV/Excel)</button><button onclick="reset()">Apagar todos os dados</button></div><input id="imp" type="file" accept=".json" hidden onchange="imp(this.files[0])"></div>`}
};
function setMp(i,k,v){const m=S.mps[mpk(i)];if(m){m[k]=v;save()}}
function delMp(i){const k=mpk(i);if(Object.keys(S.mps).length<2)return toast('Mantenha ao menos um marketplace');const u=S.prods.filter(p=>p.mp==k).length;if(u)return toast(u+' produto(s) usam '+k+'. Mude o canal deles antes.');if(confirm('Remover '+k+'?')){backup();delete S.mps[k];save();render()}}
function addMp(){const k=(prompt('Nome do marketplace:')||'').trim().slice(0,40);if(!k)return;if(S.mps[k])return toast('Esse nome já existe');S.mps[k]=Fin.normMp({});save();render()}
function addPc(){if(!UI.pcv)return toast('Digite um preço');UI.pcs.push(UI.pcv);UI.pcv=0;render()}
function chSet(i,k,v){const p=cp(),key=p.id+'|'+mpk(i);UI.ch[key]=UI.ch[key]||{};UI.ch[key][k]=v;$('#chOut').innerHTML=chOut()}
function chOut(){const p=cp(),c=ctx(),L=Object.keys(S.mps).map(k=>{const o=UI.ch[p.id+'|'+k]||{},r=Fin.calc(p,c,{mp:k,preco:o.preco!=null?o.preco:p.preco,frete:o.frete!=null?o.frete:p.frete});return[k,r]});
 const okL=L.filter(([k])=>cfgOk(S.mps[k])).sort((a,b)=>b[1].luc-a[1].luc),best=okL[0]&&okL[0][0],rest=L.filter(([k])=>!cfgOk(S.mps[k]));
 return`<div class="tb"><table><tr><th>Canal</th><th>Preço</th><th>Comissão + taxas</th><th>Impostos</th><th>Lucro/un.</th><th>Margem</th><th>ROI</th><th>Preço p/ ${S.cfg.malvo}%</th></tr>${okL.concat(rest).map(([k,r])=>{const sem=!cfgOk(S.mps[k]);return`<tr><td>${esc(k)} ${k==best&&okL.length>1?'<span class="bd pos">melhor</span>':''}${k==p.mp?' <span class="bd mu">atual</span>':''}${sem?' <span class="bd war">sem taxas</span>':''}</td><td>${R(r.q.preco)}</td><td>${R(r.taxas)}</td><td>${R(r.imp)}</td><td class="${r.luc<0?'neg':''}">${R(r.luc)}</td><td>${P(r.mg)}</td><td>${P(r.roi)}</td><td>${R(r.ideal)}</td></tr>`}).join('')}</table></div>${rest.length?`<p class="war" style="font-size:13px">Canais "sem taxas" não entram no ranking: com comissão zerada o lucro apareceria maior do que é. Configure em Ajustes.</p>`:''}`}
function simOut(){const c=ctx();
 if(UI.mode=='e'){const a=Fin.resumo(c),b=Fin.resumo(Fin.cenario(c,SIM)),rw=(l,x,y,f)=>`<tr><td>${l}</td><td>${f(x)}</td><td>${f(y)}</td></tr>`,pe=v=>v==null?'inatingível':R(v);
  return`<div class="tb"><table><tr><th></th><th>Hoje</th><th>Cenário</th></tr>${rw('Faturamento',a.fat,b.fat,R)}${rw('Lucro bruto',a.lb,b.lb,R)}${rw('Margem de contribuição',a.cm,b.cm,R)}${rw('Custos fixos',a.fixos,b.fixos,R)}${rw('Lucro líquido estimado',a.luc,b.luc,R)}${rw('Margem líquida',a.mg,b.mg,P)}${rw('Ponto de equilíbrio',a.peRec,b.peRec,pe)}</table></div>`}
 const p=cp(),k=1+SIM.dv/100,a=Fin.calc(p,c),b=Fin.calc(p,c,{preco:p.preco*(1+SIM.dp/100),custo:p.custo*(1+SIM.dc/100),pub:p.pub*(1+SIM.da/100),vendas:p.vendas*k});
 const rw=(l,x,y,f)=>`<tr><td>${l}</td><td>${f(x)}</td><td>${f(y)}</td></tr>`;
 return`<p>${SIM.dp||SIM.dc||SIM.da||SIM.dv?`Com essas mudanças, sua margem vai de <b>${P(a.mg)}</b> para <b class="${S.cfg.mmin&&b.mg<S.cfg.mmin/100?'neg':'pos'}">${P(b.mg)}</b>.`:'Mova os controles para ver o efeito.'}</p><div class="tb"><table><tr><th></th><th>Hoje</th><th>Cenário</th></tr>
 ${rw('Preço',a.q.preco,b.q.preco,R)}${rw('Custo total por venda',a.tot,b.tot,R)}${rw('Lucro por unidade',a.luc,b.luc,R)}${rw('Margem',a.mg,b.mg,P)}${rw('ROI',a.roi,b.roi,P)}${rw('Margem de contribuição mensal',a.cm*p.vendas,b.cm*p.vendas*k,R)}${rw('Lucro mensal do produto (após fixos rateados)',a.luc*p.vendas,b.luc*p.vendas*k,R)}</table></div>`}
function prOut(){const c=ctx(),p=cp(),a=Fin.calc(p,c),pr=p.preco*(1-SIM.dd/100),b=Fin.calc(p,c,{preco:pr}),pmin=Fin.precoPara(a.q,a.dir,a.pct,c,Fin.totals(c.prods,p.id),S.cfg.mmin),dmax=isFinite(pmin)&&p.preco?Math.max(0,1-pmin/p.preco):null;
 const need=b.cm>0&&a.cm>0?Math.ceil(a.cm*p.vendas/b.cm):null;
 return`<div class="kpis"><div class="kpi"><span>Preço promocional</span><b>${R(pr)}</b></div><div class="kpi"><span>Margem na promoção</span><b class="${S.cfg.mmin&&b.mg<S.cfg.mmin/100||b.mg<0?'neg':'pos'}">${P(b.mg)}</b></div><div class="kpi"><span>Lucro por unidade</span><b>${R(b.luc)}</b></div><div class="kpi"><span>Vendas para igualar o lucro de hoje</span><b>${need===null?'inviável':N0(need)+' un.'}</b></div></div>
 <p>${need===null?(a.cm<=0?'Hoje o produto já não cobre os custos variáveis.':'Neste desconto cada venda não cobre os custos variáveis. Não vale a pena.'):`Você precisa vender ${(need/Math.max(p.vendas,1)).toFixed(1).replace('.',',')}x o volume atual (${N0(p.vendas)} un.) para ganhar o mesmo que hoje.`} ${dmax===null?'Não existe desconto que mantenha a margem mínima.':`O desconto máximo que mantém sua margem mínima é <b>${P(dmax)}</b>.`}</p>`}
function ins(){const o=[],c=ctx(),L=S.prods.map(p=>Fin.calc(p,c)),rec=L.reduce((a,r)=>a+r.q.preco*r.q.vendas,0),g=S.cfg;
 Fin.alertas(c).filter(a=>a.n!='info').forEach(a=>o.push([a.n=='bad'?'bad':'warn',esc(a.t)]));
 L.forEach(r=>{const q=r.q,nm='<b>'+esc(q.nome)+'</b>';
  if(r.luc<0&&isFinite(r.min))o.push(['bad',`${nm}: o preço mínimo para não ter prejuízo é ${R(r.min)}.`]);
  else if(g.mmin&&r.mg<g.mmin/100&&r.luc>=0)o.push(['warn',`${nm} está abaixo da margem mínima (${P(r.mg)} contra ${g.mmin}%). Para chegar a ${g.malvo}%, venda por ${R(r.ideal)}${r.cmax>0?` ou pague no máximo ${R(r.cmax)} no produto`:''}. Ele representa ${P(rec?q.preco*q.vendas/rec:0)} do seu faturamento.`]);
  if(q.conc>0&&q.conc<q.preco)o.push(['info',`${nm}: o concorrente cobra ${R(q.conc)}. Igualar o preço levaria sua margem de ${P(r.mg)} para ${P(Fin.calc(q,c,{preco:q.conc}).mg)}.`]);
  if(q.conc>q.preco)o.push(['info',`${nm}: o concorrente cobra mais (${R(q.conc)}). Subir até lá levaria a margem de ${P(r.mg)} para ${P(Fin.calc(q,c,{preco:q.conc}).mg)}, se as vendas se mantiverem.`]);
  const best=Object.keys(S.mps).filter(k=>cfgOk(S.mps[k])).map(k=>[k,Fin.calc(q,c,{mp:k}).luc]).sort((a,b)=>b[1]-a[1])[0];
  if(best&&best[0]!==q.mp&&cfgOk(S.mps[q.mp])&&best[1]-r.luc>.5)o.push(['info',`${nm}: em ${esc(best[0])} o lucro por unidade seria ${R(best[1])}, contra ${R(r.luc)} em ${esc(q.mp)} (mesmo preço e custos).`]);
  const cob=q.vendas?q.estoque/(q.vendas/30):Infinity;
  if(g.diasRepor&&cob<g.diasRepor&&g.malvo&&r.mg>=g.malvo/100)o.push(['ok',`${nm} tem boa margem (${P(r.mg)}) e estoque para só ${Math.round(cob)} dias. Vale repor.`]);
 });
 if(!o.length)o.push(['ok','Nenhum alerta: todos os produtos estão acima da margem mínima.']);return o}

/* ===== DADOS: backup, importação, restauração ===== */
function exp(){dl('precifica-dados-'+hoje()+'.json',JSON.stringify({v:3,cfg:S.cfg,mps:S.mps,prods:S.prods,hist:S.hist},null,1),'application/json')}
function imp(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=Fin.normState(JSON.parse(r.result));if(!confirm('Importar '+d.prods.length+' produto(s) e substituir os dados atuais? A versão atual será guardada para restauração.'))return;backup();S=d;UI.cur=blank();UI.dirty=false;save();render();toast('Dados importados')}catch(e){toast('Arquivo inválido: nada foi alterado')}$('#imp')&&($('#imp').value='')};r.readAsText(f)}
function restore(){try{const b=JSON.parse(ls.get(BAK)||'null');if(!b)return toast('Não há versão anterior guardada');if(!confirm('Restaurar a versão de '+new Date(b.em).toLocaleString('pt-BR')+'? Os dados atuais serão guardados no lugar.'))return;const d=Fin.normState(b.dados);backup();S=d;UI.cur=blank();UI.dirty=false;save();render();toast('Versão restaurada')}catch(e){toast('Não foi possível restaurar')}}
function reset(){if(confirm('Apagar todos os produtos e ajustes? A versão atual fica guardada para restauração (e exporte um backup para garantir).')){backup();S=Fin.normState({mps:MKT_PADRAO});UI.cur=blank();UI.dirty=false;saveDraft();save();render()}}

/* ===== NAVEGAÇÃO ===== */
const MAIN=[['cat','Painel'],['calc','Calculadora'],['est','Estoque'],['fin','Finanças']],TOOLS=[['prc','Preços'],['mk','Canais'],['sim','Simulador'],['pr','Promoções'],['ia','Assistente'],['cfg','Ajustes']];
const nb=([k,l])=>`<button class="${k==tab?'on':''}" aria-current="${k==tab}" onclick="go('${k}')">${l}</button>`;
function go(t){tab=t;if(location.hash.slice(1)!=t)history.pushState(null,'','#'+t);render();window.scrollTo(0,0)}
window.addEventListener('popstate',()=>{const t=location.hash.slice(1);if(V[t]&&t!=tab){tab=t;render()}});
function render(){if(!V[tab])tab=S.prods.length?'cat':'calc';if(!S.prods.some(p=>p.id==UI.sel))UI.sel=S.prods[0]?S.prods[0].id:'';
 $('#nav').innerHTML=MAIN.map(nb).join('')+`<div class="tools"><small>Ferramentas</small>${TOOLS.map(nb).join('')}</div>`;$('#app').innerHTML=V[tab]();}
render();
