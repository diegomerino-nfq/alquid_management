import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { formatSqlBonito } from '../utils/sqlFormatter';
import { ArrowLeft, ArrowRight, GitCompare } from 'lucide-react';
import { diffLines, diffWords } from 'diff';

const parseQuery = (search: string) => {
  const params = new URLSearchParams(search);
  return {
    client: params.get('client') || '',
    geo: params.get('geo') || '',
    env: params.get('env') || '',
    oldId: params.get('old') || '',
    newId: params.get('new') || ''
  };
};

const highlightWords = (oldLine: string, newLine: string) => {
  const ow = oldLine.split(/(\s+)/);
  const nw = newLine.split(/(\s+)/);
  const max = Math.max(ow.length, nw.length);
  const parts: { left: string; right: string }[] = [];
  for (let i = 0; i < max; i++) {
    const a = ow[i] ?? '';
    const b = nw[i] ?? '';
    if (a === b) parts.push({ left: a, right: b });
    else parts.push({ left: `<mark class=\"bg-red-100\">${escapeHtml(a)}</mark>`, right: `<mark class=\"bg-green-100\">${escapeHtml(b)}</mark>` });
  }
  return {
    left: parts.map(p => p.left).join(''),
    right: parts.map(p => p.right).join('')
  };
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type LineRow = { left: string; right: string; status: 'UNCHANGED' | 'ADDED' | 'REMOVED' | 'MODIFIED' };

const computeLineDiff = (oldText: string, newText: string): LineRow[] => {
  // Use the `diff` library to compute line diffs, then align removed/added blocks
  const a = formatSqlBonito(oldText);
  const b = formatSqlBonito(newText);
  const parts = diffLines(a, b);
  const rows: LineRow[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const lines = part.value.split('\n');
    // Remove potential trailing empty line from split when value ends with \n
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    if (part.added) {
      // If previous was removed, we'll pair them; otherwise, mark as added
      const prev = parts[i - 1];
      if (prev && prev.removed) {
        const aLines = prev.value.split('\n');
        if (aLines.length > 0 && aLines[aLines.length - 1] === '') aLines.pop();
        const bLines = lines;
        const max = Math.max(aLines.length, bLines.length);
        for (let k = 0; k < max; k++) {
          rows.push({ left: aLines[k] || '', right: bLines[k] || '', status: (aLines[k] && bLines[k]) ? 'MODIFIED' : (aLines[k] ? 'REMOVED' : 'ADDED') });
        }
        // skip handling prev here because we've consumed it
      } else {
        lines.forEach(l => rows.push({ left: '', right: l, status: 'ADDED' }));
      }
    } else if (part.removed) {
      // If next is added, pairing will happen when next is processed; otherwise mark removed
      const nxt = parts[i + 1];
      if (nxt && nxt.added) {
        // pairing handled in next iteration
        continue;
      } else {
        lines.forEach(l => rows.push({ left: l, right: '', status: 'REMOVED' }));
      }
    } else {
      // unchanged
      lines.forEach(l => rows.push({ left: l, right: l, status: 'UNCHANGED' }));
    }
  }

  return rows;
};

const SqlDiffPane: React.FC<{ oldSql: string; newSql: string; showWord?: boolean }> = ({ oldSql, newSql, showWord = true }) => {
  const rows = computeLineDiff(oldSql, newSql);

  return (
    <div className="flex-1 flex border rounded overflow-hidden bg-white shadow-sm">
      <div className="w-1/2 border-r">
        <div className="bg-gray-50 px-3 py-2 text-xs font-bold">Versión Anterior</div>
        <div className="p-3 text-xs font-mono overflow-auto h-[60vh]">
          {rows.map((r, idx) => {
            if (r.status === 'UNCHANGED') return <div key={idx} className="py-[2px] text-gray-500">{r.left || <br />}</div>;
            if (r.status === 'REMOVED') return <div key={idx} className="py-[2px] text-red-700 bg-red-50">{r.left}</div>;
            if (r.status === 'ADDED') return <div key={idx} className="py-[2px] text-gray-300">&nbsp;</div>;
            // MODIFIED
            const html = showWord ? highlightWords(r.left, r.right).left : escapeHtml(r.left);
            return <div key={idx} className="py-[2px] text-red-700 bg-red-50" dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
          })}
        </div>
      </div>
      <div className="w-1/2">
        <div className="bg-gray-50 px-3 py-2 text-xs font-bold">Nueva Versión</div>
        <div className="p-3 text-xs font-mono overflow-auto h-[60vh]">
          {rows.map((r, idx) => {
            if (r.status === 'UNCHANGED') return <div key={idx} className="py-[2px] text-gray-500">{r.right || <br />}</div>;
            if (r.status === 'ADDED') return <div key={idx} className="py-[2px] text-green-700 bg-green-50">{r.right}</div>;
            if (r.status === 'REMOVED') return <div key={idx} className="py-[2px] text-gray-300">&nbsp;</div>;
            // MODIFIED
            const html = showWord ? highlightWords(r.left, r.right).right : escapeHtml(r.right);
            return <div key={idx} className="py-[2px] text-green-700 bg-green-50 font-bold" dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
          })}
        </div>
      </div>
    </div>
  );
};

const Compare: React.FC = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const { client, geo, env, oldId, newId } = parseQuery(loc.search);
  const { repositoryData, fetchRepositoryFiles } = useGlobalState();
  const [showWord, setShowWord] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (client && env) {
      const geoKey = geo || 'null';
      if (!repositoryData[client] || !repositoryData[client][geoKey] || !repositoryData[client][geoKey][env]) {
        fetchRepositoryFiles(client as any, geo ? (geo as any) : null, env as any);
      }
    }
  }, [client, geo, env]);

  const pair = useMemo(() => {
    if (!client || !env || !oldId || !newId) return null;
    const geoKey = geo || 'null';
    const files = repositoryData[client]?.[geoKey]?.[env] || [];
    const oldFile = files.find((f: any) => String(f.id) === String(decodeURIComponent(oldId)));
    const newFile = files.find((f: any) => String(f.id) === String(decodeURIComponent(newId)));
    if (!oldFile || !newFile) return null;

    const oldData = Array.isArray(oldFile.content) ? oldFile.content : [];
    const newData = Array.isArray(newFile.content) ? newFile.content : [];

    const mapOld = new Map<string, any>();
    oldData.forEach((r: any) => r.queries.forEach((q: any) => mapOld.set(`${r.report}::${q.filename}`, q)));
    const mapNew = new Map<string, any>();
    newData.forEach((r: any) => r.queries.forEach((q: any) => mapNew.set(`${r.report}::${q.filename}`, q)));

    const keys = Array.from(new Set([...mapOld.keys(), ...mapNew.keys()]));
    const diffs = keys.map(key => {
      const [report, filename] = key.split('::');
      const oldQ = mapOld.get(key);
      const newQ = mapNew.get(key);
      let status: string = 'UNCHANGED';
      const changes: string[] = [];
      if (!oldQ && newQ) status = 'ADDED';
      else if (oldQ && !newQ) status = 'REMOVED';
      else {
        if (oldQ.database !== newQ.database) changes.push('database');
        if (oldQ.schema !== newQ.schema) changes.push('schema');
        if (oldQ.table !== newQ.table) changes.push('table');
        if (formatSqlBonito(oldQ.sql) !== formatSqlBonito(newQ.sql)) changes.push('sql');
        if (changes.length) status = 'MODIFIED';
      }
      return { key, report, filename, status, oldQ, newQ, changes };
    }).sort((a, b) => a.status.localeCompare(b.status));

    return {
      oldFile,
      newFile,
      diffs
    };
  }, [repositoryData, client, geo, env, oldId, newId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pair) return;
      if (e.key === 'ArrowRight') setSelectedIndex(i => Math.min(i + 1, pair.diffs.length - 1));
      if (e.key === 'ArrowLeft') setSelectedIndex(i => Math.max(i - 1, 0));
      if (e.key.toLowerCase() === 'b') nav('/repository');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pair]);

  if (!pair) {
    return (
      <div className="p-8">
        <PageHeader title="Comparación" subtitle="Cargando comparación..." icon={<GitCompare />} />
        <div className="p-6">No se han encontrado las versiones indicadas o los datos aún se están cargando.</div>
        <div className="p-6"><button className="px-4 py-2 bg-alquid-navy text-white rounded" onClick={() => nav('/repository')}>Volver</button></div>
      </div>
    );
  }

  const current = pair.diffs[selectedIndex];

  return (
    <div className="h-full animate-fade-in bg-gray-50 min-h-screen">
      <PageHeader
        title={`Comparar: ${pair.oldFile.fileName} ↔ ${pair.newFile.fileName}`}
        subtitle={`v${pair.oldFile.version} → v${pair.newFile.version}`}
        icon={<GitCompare />}
        action={
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/repository')} className="px-3 py-2 rounded bg-white border">Volver</button>
            <button onClick={() => setShowWord(s => !s)} className="px-3 py-2 rounded bg-white border">{showWord ? 'Word' : 'Line'}</button>
            <div className="px-3 py-2 rounded bg-white border">{selectedIndex + 1}/{pair.diffs.length}</div>
          </div>
        }
      />

      <div className="p-6 grid grid-cols-4 gap-6">
        <div className="col-span-1 bg-white rounded shadow-sm p-4 overflow-auto h-[70vh]">
          <h4 className="text-sm font-bold mb-3">Cambios</h4>
          <ul className="space-y-2">
            {pair.diffs.map((d: any, i: number) => (
              <li key={d.key} onClick={() => setSelectedIndex(i)} className={`p-2 rounded cursor-pointer ${i === selectedIndex ? 'bg-alquid-navy/10' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{d.report} · {d.filename}</div>
                  <div className={`text-xs px-2 py-0.5 rounded ${d.status === 'MODIFIED' ? 'bg-yellow-100 text-yellow-800' : d.status === 'ADDED' ? 'bg-green-100 text-green-800' : d.status === 'REMOVED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{d.status}</div>
                </div>
                {d.changes && d.changes.length > 0 && <div className="text-xs text-gray-400 mt-1">{d.changes.join(', ')}</div>}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{current.report} · {current.filename}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIndex(i => Math.max(0, i - 1))} className="p-2 bg-white border rounded"><ArrowLeft /></button>
              <button onClick={() => setSelectedIndex(i => Math.min(pair.diffs.length - 1, i + 1))} className="p-2 bg-white border rounded"><ArrowRight /></button>
            </div>
          </div>

          {current.status === 'ADDED' && (
            <div className="p-4 bg-green-50 rounded">Query añadida. Mostrar contenido:</div>
          )}

          {current.status === 'REMOVED' && (
            <div className="p-4 bg-red-50 rounded">Query eliminada. Mostrar contenido previo:</div>
          )}

          {current.oldQ && current.newQ && (
            <SqlDiffPane oldSql={current.oldQ.sql || ''} newSql={current.newQ.sql || ''} showWord={showWord} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Compare;
