import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export type AdminMenuItem = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
};

type Props = {
  items: AdminMenuItem[];
  label?: string;
};

type PanelPos = { top: number; left: number };

export function AdminRowMenu({ items, label = 'Actions' }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const placePanel = () => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelW = panel?.offsetWidth ?? 220;
    const panelH = panel?.offsetHeight ?? items.length * 48 + 40;
    const gap = 6;
    const pad = 8;

    let top = rect.bottom + gap;
    let left = rect.right - panelW;

    if (top + panelH > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - panelH - gap);
    }
    if (left < pad) left = pad;
    if (left + panelW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - panelW - pad);
    }

    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onReposition = () => placePanel();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, items.length]);

  return (
    <div className="admin-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="admin-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="admin-menu-panel admin-menu-panel-portal"
              role="menu"
              id={menuId}
              style={{ top: pos.top, left: pos.left }}
            >
              <p className="admin-menu-heading">{label}</p>
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`admin-menu-item ${item.tone === 'danger' ? 'danger' : ''}`}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.icon ? <span className="admin-menu-item-icon">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

type ChromeProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
};

export function AdminModal({ open, title, onClose, children, wide, footer }: ChromeProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="admin-modal-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="admin-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className={`admin-modal-panel ${wide ? 'wide' : ''}`}>
        <div className="admin-modal-head">
          <h3>{title}</h3>
          <button type="button" className="admin-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function AdminDrawer({ open, title, onClose, children, wide, footer }: ChromeProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="admin-drawer-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="admin-drawer-backdrop" aria-label="Close" onClick={onClose} />
      <div className={`admin-drawer-panel ${wide ? 'wide' : ''}`}>
        <div className="admin-drawer-head">
          <h3>{title}</h3>
          <button type="button" className="admin-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="admin-drawer-body">{children}</div>
        {footer ? <div className="admin-drawer-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
