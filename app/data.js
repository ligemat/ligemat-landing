import { getClient } from './auth.js';
const sb = () => getClient();
const monthRange = (m) => { const s = new Date(m); const e = new Date(s); e.setMonth(e.getMonth()+1);
  const iso = d => d.toISOString().slice(0,10); return [iso(s), iso(e)]; };

export async function listCategories(){ const {data,error}=await sb().from('fin_categories').select('*').order('sort'); if(error)throw error; return data; }
export async function listAccounts(){ const {data,error}=await sb().from('fin_accounts').select('*').order('sort'); if(error)throw error; return data; }

export async function listTransactions(monthISO){ const [a,b]=monthRange(monthISO);
  const {data,error}=await sb().from('fin_transactions').select('*').gte('date',a).lt('date',b).order('date',{ascending:false}); if(error)throw error; return data; }
export async function addTransaction(t){ const {data,error}=await sb().from('fin_transactions').insert(t).select().single(); if(error)throw error; return data; }
export async function updateTransaction(id,patch){ const {error}=await sb().from('fin_transactions').update(patch).eq('id',id); if(error)throw error; }
export async function deleteTransaction(id){ const {error}=await sb().from('fin_transactions').delete().eq('id',id); if(error)throw error; }

export async function listBudgets(monthISO){ const {data,error}=await sb().from('fin_budgets').select('id,category_id,amount_egp').eq('month',monthISO); if(error)throw error; return data; }
export async function upsertBudget(category_id,monthISO,amount_egp){ const {error}=await sb().from('fin_budgets').upsert({category_id,month:monthISO,amount_egp},{onConflict:'user_id,category_id,month'}); if(error)throw error; }

export async function addCategory(name,type,color){ const {error}=await sb().from('fin_categories').insert({name,type,color}); if(error)throw error; }
export async function renameCategory(id,name){ const {error}=await sb().from('fin_categories').update({name}).eq('id',id); if(error)throw error; }
export async function deleteCategory(id){ const {error}=await sb().from('fin_categories').delete().eq('id',id); if(error)throw error; }
export async function addAccount(name,opening_balance_egp){ const {error}=await sb().from('fin_accounts').insert({name,opening_balance_egp}); if(error)throw error; }
export async function updateAccount(id,patch){ const {error}=await sb().from('fin_accounts').update(patch).eq('id',id); if(error)throw error; }
export async function deleteAccount(id){ const {error}=await sb().from('fin_accounts').delete().eq('id',id); if(error)throw error; }

export async function cashBalance(){
  const acc=await listAccounts(); let bal=acc.reduce((s,a)=>s+Number(a.opening_balance_egp),0);
  const {data,error}=await sb().from('fin_transactions').select('amount_egp,type'); if(error)throw error;
  for(const t of data) bal += (t.type==='income'?1:-1)*Number(t.amount_egp);
  return bal;
}
export async function monthSummary(monthISO){ const tx=await listTransactions(monthISO);
  let income=0,expense=0; for(const t of tx){ if(t.type==='income')income+=Number(t.amount_egp); else expense+=Number(t.amount_egp); }
  return { income, expense, net: income-expense }; }
