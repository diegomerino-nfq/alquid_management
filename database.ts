import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default supabase;

export const queries = {
  addLog: async (user: string, module: string, action: string, details: string, type: string) => {
    await supabase.from('activity_logs').insert({ user, module, action, details, type });
  },
  getLogs: async () => {
    const { data } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(200);
    return data || [];
  },
  clearLogs: async () => {
    await supabase.from('activity_logs').delete().gte('id', 0);
  },

  addUser: async (email: string, role: string) => {
    await supabase.from('users').insert({ email, role });
  },
  removeUser: async (email: string) => {
    await supabase.from('users').delete().eq('email', email);
  },
  getUsers: async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  getUserByEmail: async (email: string) => {
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return data || null;
  },

  addRepoFile: async (id: string, client: string, geography: string | null, env: string, filename: string, version: number, content: string, uploadedBy: string, comment: string) => {
    const { error } = await supabase.from('repository_files').insert({ id, client, geography, env, filename, version, content, uploaded_by: uploadedBy, comment });
    if (error) throw new Error(error.message);
  },
  getRepoFiles: async (client: string, geography: string | null, env: string) => {
    let q = supabase.from('repository_files').select('*')
      .eq('client', client)
      .eq('env', env)
      .order('uploaded_at', { ascending: false })
      .order('version', { ascending: false });
    if (geography === null) {
      q = q.is('geography', null);
    } else {
      q = q.eq('geography', geography);
    }
    const { data } = await q;
    return data || [];
  },
  getRepoFileById: async (id: string) => {
    const { data } = await supabase.from('repository_files').select('id').eq('id', id).maybeSingle();
    return data || null;
  },
  getLatestVersion: async (client: string, geography: string | null, env: string) => {
    let q = supabase.from('repository_files').select('version')
      .eq('client', client)
      .eq('env', env)
      .order('version', { ascending: false })
      .limit(1);
    if (geography === null) {
      q = q.is('geography', null);
    } else {
      q = q.eq('geography', geography);
    }
    const { data } = await q;
    return { maxV: (data && data.length > 0) ? data[0].version : null };
  },
  getRepoSummary: async () => {
    const { data } = await supabase.from('repository_files').select('client, geography, env');
    if (!data) return [];
    const groups: Record<string, any> = {};
    for (const f of data) {
      const geo = f.geography || 'general';
      const key = `${f.client}||${geo}||${f.env}`;
      if (!groups[key]) groups[key] = { client: f.client, geography: geo, env: f.env, count: 0 };
      groups[key].count++;
    }
    return Object.values(groups);
  },
  deleteRepoFile: async (id: string) => {
    await supabase.from('repository_files').delete().eq('id', id);
  },

  addTemplate: async (id: string, client: string, geography: string | null, name: string, content: string, uploadedBy: string) => {
    await supabase.from('templates').insert({ id, client, geography, name, content, uploaded_by: uploadedBy });
  },
  getTemplates: async (client: string, geography: string | null) => {
    let q = supabase.from('templates').select('*').eq('client', client).order('uploaded_at', { ascending: false });
    if (geography === null) {
      q = q.is('geography', null);
    } else {
      q = q.eq('geography', geography);
    }
    const { data } = await q;
    return data || [];
  },
  getAllTemplates: async () => {
    const { data } = await supabase.from('templates').select('*').order('client').order('uploaded_at', { ascending: false });
    return data || [];
  },
  deleteTemplate: async (id: string) => {
    await supabase.from('templates').delete().eq('id', id);
  },
  getTemplateById: async (id: string) => {
    const { data } = await supabase.from('templates').select('*').eq('id', id).maybeSingle();
    return data || null;
  },
};
