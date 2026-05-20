import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { LoadingIcon } from '@/src/assets/icons/Icons';

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[\s—–]+/g, '-')
    .replace(/[^฀-๿a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const MermaidBlock = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 11)}`,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error)?.message || 'Mermaid render failed');
        }
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
        <p className="font-semibold mb-2">เกิดข้อผิดพลาดในการแสดง diagram</p>
        <p className="font-mono text-xs">{error}</p>
        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 p-4 bg-white border border-emerald-100 rounded-lg overflow-x-auto flex justify-center"
    />
  );
};

const FlowDocs = () => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const [search, setSearch] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#10b981',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#a7f3d0',
        lineColor: '#94a3b8',
        secondaryColor: '#fef3c7',
        tertiaryColor: '#fde68a',
        background: '#ffffff',
        fontFamily: 'inherit',
      },
      flowchart: { useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/docs/FLOW.md');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setMarkdown(text);
      } catch (err) {
        setError((err as Error)?.message || 'โหลดเอกสารไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toc = useMemo<TocEntry[]>(() => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const entries: TocEntry[] = [];
    let inCodeBlock = false;
    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        entries.push({ id: slugify(text), text, level });
      }
    }
    return entries;
  }, [markdown]);

  const filteredToc = useMemo(() => {
    if (!search.trim()) return toc;
    const q = search.toLowerCase();
    return toc.filter((t) => t.text.toLowerCase().includes(q));
  }, [toc, search]);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    const headings = contentRef.current.querySelectorAll('h2[id], h3[id]');
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [markdown]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <LoadingIcon className="w-10 h-10 animate-spin text-primary mb-3" />
        <p className="text-sm text-slate-400">กำลังโหลดเอกสาร...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
          <p className="font-semibold">โหลดเอกสารไม่สำเร็จ</p>
          <p className="font-mono text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-slate-50">
      {/* Sidebar TOC */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-[calc(100vh-64px)] overflow-y-auto">
        <div className="w-full p-4">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              สารบัญ
            </h2>
          </div>
          <input
            type="text"
            placeholder="ค้นหาในสารบัญ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 mb-3"
          />
          <nav className="space-y-1">
            {filteredToc.map((entry) => (
              <button
                key={entry.id}
                onClick={() => scrollToSection(entry.id)}
                className={`block w-full text-left text-xs leading-relaxed py-1.5 px-2 rounded transition-colors ${
                  entry.level === 3 ? 'pl-5 text-slate-500' : 'font-medium text-slate-700'
                } ${
                  activeSection === entry.id
                    ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500'
                    : 'hover:bg-slate-100'
                }`}
              >
                {entry.text}
              </button>
            ))}
            {filteredToc.length === 0 && (
              <p className="text-xs text-slate-400 italic p-2">ไม่พบหัวข้อที่ค้นหา</p>
            )}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto p-6 lg:p-10" ref={contentRef}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-slate-800 mb-4 pb-3 border-b-2 border-emerald-100">
                  {children}
                </h1>
              ),
              h2: ({ children }) => {
                const text = String(children);
                const id = slugify(text);
                return (
                  <h2
                    id={id}
                    className="text-2xl font-bold text-slate-800 mt-10 mb-4 pb-2 border-b border-slate-200 scroll-mt-20"
                  >
                    {children}
                  </h2>
                );
              },
              h3: ({ children }) => {
                const text = String(children);
                const id = slugify(text);
                return (
                  <h3
                    id={id}
                    className="text-xl font-semibold text-emerald-700 mt-8 mb-3 scroll-mt-20"
                  >
                    {children}
                  </h3>
                );
              },
              h4: ({ children }) => (
                <h4 className="text-lg font-semibold text-slate-700 mt-6 mb-2">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed text-slate-700 mb-3">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside ml-6 space-y-1 text-sm text-slate-700 mb-3">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside ml-6 space-y-1 text-sm text-slate-700 mb-3">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-emerald-400 bg-emerald-50/40 pl-4 py-2 my-4 text-sm text-slate-700 italic">
                  {children}
                </blockquote>
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match?.[1];
                const value = String(children).replace(/\n$/, '');
                if (lang === 'mermaid') {
                  return <MermaidBlock chart={value} />;
                }
                if (lang) {
                  return (
                    <pre className="my-3 bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 bg-slate-100 text-emerald-700 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <>{children}</>,
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-emerald-50 border-b border-emerald-100">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  {children}
                </th>
              ),
              tbody: ({ children }) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
              td: ({ children }) => <td className="px-3 py-2 text-slate-700">{children}</td>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-emerald-600 hover:text-emerald-700 hover:underline"
                  onClick={(e) => {
                    if (href?.startsWith('#')) {
                      e.preventDefault();
                      scrollToSection(href.slice(1));
                    }
                  }}
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="my-8 border-slate-200" />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </main>

      {/* Back to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="กลับไปด้านบน"
        title="กลับไปด้านบน"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
};

export default FlowDocs;
