import { useState, useEffect, useCallback, useRef, useMemo, FC } from 'react';
import Swal from '@/src/utils/swal';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Button, Input } from '../../components/common/FormControls';
import { Modal } from '../../components/common/Modal';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  DocumentTextIcon,
  ManageIcon,
  LoadingIcon,
} from '../../assets/icons/Icons';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { isManagementRole, isExecutiveRole } from '../../utils/role';
import { formatThaiDate } from '../../utils/date';
import {
  ServiceProcedureTemplateApi,
  IServiceProcedureTemplate,
} from '../../api/service-procedure-template';

// TipTap
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';

// Custom FontSize — extends TextStyle, re-exports color attribute so Color extension works
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, '') || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize: (size: string) => ({ chain }: { chain: () => ReturnType<ReturnType<typeof useEditor>['chain']> }) => {
        return chain().setMark('textStyle', { fontSize: size }).run();
      },
      unsetFontSize: () => ({ chain }: { chain: () => ReturnType<ReturnType<typeof useEditor>['chain']> }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

const FONT_SIZES = [
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
];

// Font Size Dropdown
const FontSizeDropdown: FC<{ editor: ReturnType<typeof useEditor> }> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!editor) return null;

  const currentSize = editor.getAttributes('textStyle').fontSize || '';
  const currentLabel = FONT_SIZES.find((s) => s.value === currentSize)?.label || '16';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 px-2 py-1 text-xs rounded transition-colors text-slate-600 hover:bg-slate-100 min-w-[40px] justify-center"
      >
        <span className="text-sm font-medium">{currentLabel}</span>
        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 w-20 max-h-48 overflow-y-auto">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                if (s.value === '16px') {
                  editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
                } else {
                  editor.chain().focus().setMark('textStyle', { fontSize: s.value }).run();
                }
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${currentSize === s.value ? 'text-green-700 bg-green-50 font-medium' : 'text-slate-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Black', value: '#000000' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Red', value: '#fecaca' },
  { label: 'Gray', value: '#e5e7eb' },
];

// Color Picker Dropdown
const ColorPickerDropdown: FC<{
  editor: ReturnType<typeof useEditor>;
  type: 'text' | 'highlight';
}> = ({ editor, type }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!editor) return null;

  const colors = type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const currentColor = type === 'text'
    ? (editor.getAttributes('textStyle').color || '')
    : (editor.getAttributes('highlight').color || '');

  const handleSelect = (color: string) => {
    if (type === 'text') {
      if (!color) {
        editor.chain().focus().unsetColor().run();
      } else {
        const result = editor.chain().focus().setColor(color).run();
        console.log('[DEBUG] setColor result:', result, 'color:', color, 'HTML:', editor.getHTML());
      }
    } else {
      if (!color) {
        editor.chain().focus().unsetHighlight().run();
      } else {
        editor.chain().focus().setHighlight({ color }).run();
      }
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex flex-col items-center px-2 py-1 text-xs rounded transition-colors text-slate-600 hover:bg-slate-100"
      >
        <div className="flex items-center gap-0.5">
          {type === 'text' ? (
            <span className="font-bold text-sm">A</span>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v14M5 10l7 7 7-7" />
            </svg>
          )}
          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
        </div>
        <div
          className="w-full h-1 rounded-full mt-0.5"
          style={{ backgroundColor: type === 'text' ? (currentColor || '#000') : (currentColor || '#fef08a') }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-50 w-[200px]">
          <p className="text-xs text-slate-500 mb-1.5 font-medium">{type === 'text' ? 'สีตัวอักษร' : 'สี Highlight'}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((c) => (
              <button
                key={c.value || 'none'}
                type="button"
                onClick={() => handleSelect(c.value)}
                title={c.label}
                className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 flex items-center justify-center ${currentColor === c.value ? 'border-green-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                style={{
                  backgroundColor: type === 'highlight' ? (c.value || '#ffffff') : '#ffffff',
                }}
              >
                {type === 'text' ? (
                  <span className="font-bold text-sm" style={{ color: c.value || '#000' }}>A</span>
                ) : !c.value ? (
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// List Dropdown Component
const ListDropdown: FC<{ editor: ReturnType<typeof useEditor> }> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!editor) return null;

  const isListActive = editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${isListActive ? 'bg-green-100 text-green-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          <path d="M9 6h12M9 12h12M9 18h12" />
        </svg>
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 w-44">
          <button
            type="button"
            onClick={() => { editor.chain().focus().toggleBulletList().run(); setOpen(false); }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${editor.isActive('bulletList') ? 'text-green-700 bg-green-50' : 'text-slate-700'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
              <path d="M9 6h12M9 12h12M9 18h12" />
            </svg>
            Bullet List
          </button>
          <button
            type="button"
            onClick={() => { editor.chain().focus().toggleOrderedList().run(); setOpen(false); }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${editor.isActive('orderedList') ? 'text-green-700 bg-green-50' : 'text-slate-700'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <text x="2" y="8" fontSize="8" fill="currentColor" fontFamily="sans-serif">1</text>
              <text x="2" y="14.5" fontSize="8" fill="currentColor" fontFamily="sans-serif">2</text>
              <text x="2" y="21" fontSize="8" fill="currentColor" fontFamily="sans-serif">3</text>
              <path d="M10 6h11M10 12h11M10 18h11" />
            </svg>
            Ordered List
          </button>
          <button
            type="button"
            onClick={() => { editor.chain().focus().toggleTaskList().run(); setOpen(false); }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${editor.isActive('taskList') ? 'text-green-700 bg-green-50' : 'text-slate-700'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="5" height="5" rx="1" />
              <path d="M3.5 6.5l1 1 2-2" />
              <path d="M10 6h11" />
              <rect x="2" y="13" width="5" height="5" rx="1" />
              <path d="M10 15.5h11" />
            </svg>
            Task List
          </button>
        </div>
      )}
    </div>
  );
};

// TipTap Toolbar Component
const EditorToolbar: FC<{ editor: ReturnType<typeof useEditor> }> = ({ editor }) => {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-green-100 text-green-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
      {/* Lists dropdown */}
      <ListDropdown editor={editor} />

      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />

      {/* Text style */}
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}>B</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}>I</button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))}>U</button>
      <ColorPickerDropdown editor={editor} type="text" />
      <ColorPickerDropdown editor={editor} type="highlight" />
      <FontSizeDropdown editor={editor} />

      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />

      {/* Headings */}
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))}>H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))}>H3</button>

      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />

      {/* Alignment */}
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h10M3 18h14" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M5 18h14" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M11 12h10M7 18h14" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnClass(editor.isActive({ textAlign: 'justify' }))}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>

      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />

      {/* Table */}
      <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btnClass(false)}>
        <span className="text-sm">&#9638; Table</span>
      </button>
      {editor.isActive('table') && (
        <>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className={btnClass(false)}>+Col</button>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={btnClass(false)}>+Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className={btnClass(false)}>-Col</button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className={btnClass(false)}>-Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50">Del Table</button>
        </>
      )}
    </div>
  );
};

// TipTap Editor Wrapper
const TipTapEditor: FC<{ content: string; onChange: (html: string) => void }> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'พิมพ์รายละเอียดขั้นตอนบริการ...' }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap-editor" />
      <style>{`
        .tiptap-editor .tiptap {
          min-height: 300px;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.6;
          outline: none;
        }
        .tiptap-editor .tiptap h2 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; }
        .tiptap-editor .tiptap h3 { font-size: 17px; font-weight: 700; margin: 10px 0 4px; }
        .tiptap-editor .tiptap ul, .tiptap-editor .tiptap ol { padding-left: 24px; margin: 4px 0; }
        .tiptap-editor .tiptap ul:not([data-type="taskList"]) { list-style-type: disc; }
        .tiptap-editor .tiptap ol { list-style-type: decimal; }
        .tiptap-editor .tiptap li { margin: 2px 0; }
        .tiptap-editor .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
        .tiptap-editor .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
        .tiptap-editor .tiptap ul[data-type="taskList"] li label { margin-top: 2px; }
        .tiptap-editor .tiptap table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        .tiptap-editor .tiptap th, .tiptap-editor .tiptap td { border: 1px solid #ccc; padding: 6px 10px; min-width: 60px; vertical-align: top; }
        .tiptap-editor .tiptap th { background: #f5f5f5; font-weight: 700; }
      `}</style>
    </div>
  );
};

type ModalMode = 'create' | 'edit' | 'detail';

const ServiceDetailPage: FC = () => {
  const currentUser = useCurrentUser();
  const canEdit = isManagementRole(currentUser?.roleType) || isExecutiveRole(currentUser?.roleType);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [detailName, setDetailName] = useState('');
  const [editorContent, setEditorContent] = useState('');

  // Data
  const [details, setDetails] = useState<IServiceProcedureTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // PDF loading
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDetails = useMemo(() => {
    if (!searchQuery.trim()) return details;
    const q = searchQuery.toLowerCase();
    return details.filter((d) => d.name?.toLowerCase().includes(q));
  }, [details, searchQuery]);

  const totalItems = filteredDetails.length;
  const paginatedDetails = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDetails.slice(start, start + itemsPerPage);
  }, [filteredDetails, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  // Dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<IServiceProcedureTemplate | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ServiceProcedureTemplateApi.getAll({ page: 1, limit: 100 });
      setDetails(res?.data || []);
    } catch (err) {
      console.error('Failed to load service procedure templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Dropdown
  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, detail: IServiceProcedureTemplate) => {
    event.stopPropagation();
    if (openDropdownId === detail.id) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedDetail(detail);
      setOpenDropdownId(detail.id);
      const dropdownHeight = 200;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const showAbove = spaceBelow < dropdownHeight;
      setDropdownPosition({
        top: showAbove ? buttonRect.top - dropdownHeight : buttonRect.bottom,
        left: buttonRect.right,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-detail-id]')) return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  // Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setDetailName('');
    setEditorContent('');
    setIsModalOpen(true);
  };

  const openEditModal = (detail: IServiceProcedureTemplate) => {
    setModalMode('edit');
    setEditingId(detail.id);
    setDetailName(detail.name);
    setEditorContent(detail.content);
    setIsModalOpen(true);
  };

  const openDetailModal = (detail: IServiceProcedureTemplate) => {
    console.log('[DEBUG] Loading content from API:', detail.content);
    setModalMode('detail');
    setEditingId(detail.id);
    setDetailName(detail.name);
    setEditorContent(detail.content);
    setIsModalOpen(true);
  };

  // Save
  const handleSave = async () => {
    if (!detailName.trim()) {
      Swal.fire('กรุณากรอกข้อมูลให้ครบ', 'ชื่อ จำเป็นต้องกรอก', 'warning');
      return;
    }

    try {
      console.log('[DEBUG] Saving content:', editorContent);
      if (modalMode === 'edit' && editingId) {
        await ServiceProcedureTemplateApi.update(editingId, {
          name: detailName.trim(),
          content: editorContent,
        });
      } else {
        await ServiceProcedureTemplateApi.create({
          name: detailName.trim(),
          content: editorContent,
          created_by: currentUser?.id,
        });
      }

      Swal.fire('สำเร็จ', 'บันทึกรายละเอียดขั้นตอนบริการเรียบร้อย', 'success');
      setIsModalOpen(false);
      fetchDetails();
    } catch (err) {
      console.error('Failed to save:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: 'ต้องการลบรายละเอียดขั้นตอนบริการนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!confirm.isConfirmed) return;

    try {
      await ServiceProcedureTemplateApi.remove(id);
      Swal.fire('สำเร็จ', 'ลบรายละเอียดเรียบร้อย', 'success');
      fetchDetails();
    } catch (err) {
      console.error('Failed to delete:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
    }
  };

  const getModalTitle = () => {
    if (modalMode === 'create') return 'สร้างรายละเอียดขั้นตอนบริการ';
    if (modalMode === 'edit') return 'แก้ไขรายละเอียดขั้นตอนบริการ';
    return 'ดูรายละเอียดขั้นตอนบริการ';
  };

  const isReadOnly = modalMode === 'detail';

  const modalFooter = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
        {isReadOnly ? 'ปิด' : 'ยกเลิก'}
      </Button>
      {!isReadOnly && (
        <Button variant="primary" onClick={handleSave} type="button">
          บันทึก
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">รายละเอียดขั้นตอนบริการ</h1>
          <p className="mt-1 text-slate-600">
            จัดการรายละเอียดขั้นตอนการให้บริการสำหรับแนบในเอกสาร
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreateModal} className="shadow-md shadow-primary/20">
            <PlusIcon className="w-5 h-5 mr-2" />
            สร้างรายละเอียดขั้นตอนบริการ
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-80 flex-shrink-0">
            <Input
              type="search"
              placeholder="ค้นหาชื่อ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full border-b border-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">ลำดับ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ชื่อ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-40">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-40">ผู้สร้าง</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-32">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDetails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลรายละเอียดขั้นตอนบริการ</p>
                        {canEdit && (
                          <p className="text-sm mt-1">กดปุ่ม "สร้างรายละเอียดขั้นตอนบริการ" เพื่อเริ่มต้น</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDetails.map((detail, index) => (
                    <tr key={detail.id} className={`hover:bg-slate-50/50 transition-colors [&>td]:text-center [&>td]:align-middle ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 text-sm text-slate-700">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium text-center">{detail.name}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">
                        {formatThaiDate(detail.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">
                        {detail.creator ? `${detail.creator.first_name} ${detail.creator.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={loadingPdfId === detail.id}
                            onClick={async () => {
                              setLoadingPdfId(detail.id);
                              try {
                                const blob = await ServiceProcedureTemplateApi.exportPdf(detail.id);
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              } catch (err) {
                                console.error('Failed to export PDF:', err);
                                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถ Export PDF ได้', 'error');
                              } finally {
                                setLoadingPdfId(null);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {loadingPdfId === detail.id ? <LoadingIcon className="h-3.5 w-3.5 animate-spin" /> : <EyeIcon className="h-3.5 w-3.5" />}
                            <span>{loadingPdfId === detail.id ? 'กำลังโหลด...' : 'ดู PDF'}</span>
                          </button>
                          <Button
                            data-detail-id={detail.id}
                            onClick={(e) => handleDropdownToggle(e, detail)}
                            variant="icon"
                            title="จัดการ"
                          >
                            <ManageIcon className="h-5 w-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
      </div>

      {/* Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-30 border border-slate-100 overflow-hidden"
        >
          <div className="py-1">
            <button
              onClick={() => {
                if (selectedDetail) openDetailModal(selectedDetail);
                setOpenDropdownId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <EyeIcon className="w-4 h-4 text-slate-400" />
              ดูรายละเอียด
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    if (selectedDetail) openEditModal(selectedDetail);
                    setOpenDropdownId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                >
                  <PencilIcon className="w-4 h-4 text-slate-400" />
                  แก้ไข
                </button>
                <button
                  onClick={() => {
                    if (selectedDetail) handleDelete(selectedDetail.id);
                    setOpenDropdownId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-red-400" />
                  ลบ
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={getModalTitle()}
          size="6xl"
          footer={modalFooter}
        >
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              {isReadOnly ? (
                <p className="text-sm text-slate-800 font-medium">{detailName}</p>
              ) : (
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="เช่น รายละเอียดงานควบคุมป้องกันกำจัดปลวก"
                  value={detailName}
                  onChange={(e) => setDetailName(e.target.value)}
                />
              )}
            </div>

            {/* Rich Text Editor */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">รายละเอียดขั้นตอนบริการ</label>
              {isReadOnly ? (
                <>
                  <style>{`
                    .tiptap-content h2 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; }
                    .tiptap-content h3 { font-size: 17px; font-weight: 700; margin: 10px 0 4px; }
                    .tiptap-content p:empty::before { content: '\\00a0'; }
                    .tiptap-content ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 24px; margin: 4px 0; }
                    .tiptap-content ol { list-style-type: decimal; padding-left: 24px; margin: 4px 0; }
                    .tiptap-content li { margin: 2px 0; }
                    .tiptap-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
                    .tiptap-content th, .tiptap-content td { border: 1px solid #ccc; padding: 6px 10px; }
                    .tiptap-content th { background: #f5f5f5; font-weight: 700; }
                    .tiptap-content ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
                    .tiptap-content ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
                    .tiptap-content mark { padding: 2px 0; }
                    .tiptap-content mark:not([style]) { background-color: #fef08a; }
                  `}</style>
                  <div
                    className="tiptap-content max-w-none border border-slate-200 rounded-lg p-4 bg-slate-50 min-h-[200px] text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: editorContent }}
                  />
                </>
              ) : (
                <TipTapEditor content={editorContent} onChange={setEditorContent} />
              )}
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
};

export default ServiceDetailPage;
