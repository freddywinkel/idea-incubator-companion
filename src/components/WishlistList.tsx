import React, { useCallback, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  PiggyBank,
  RotateCcw,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useModalFocus } from '../hooks/useModalFocus';
import {
  formatEuro,
  getWishlistProgress,
  getWishlistStateLabel,
  parseEuroToCents,
} from '../lib/wishlist';
import type { WishlistItem } from '../types';
import { SearchBar } from './SearchBar';

type WishlistFilter = 'all' | 'active' | 'saving' | 'goal' | 'bought' | 'archived';
type DerivedState = 'wishlist' | 'saving' | 'goal' | 'bought' | 'archived';

type DialogState =
  | { kind: 'add-savings'; item: WishlistItem }
  | { kind: 'edit'; item: WishlistItem }
  | { kind: 'delete'; item: WishlistItem }
  | null;

interface EditFormState {
  title: string;
  targetPrice: string;
  savedAmount: string;
  productUrl: string;
  notes: string;
}

interface WishlistListProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const FILTERS: Array<{ value: WishlistFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'saving', label: 'Saving' },
  { value: 'goal', label: 'Goal reached' },
  { value: 'bought', label: 'Bought' },
  { value: 'archived', label: 'Archived' },
];

function centsToInput(cents: number | undefined): string {
  if (cents === undefined) return '';
  return (cents / 100)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

function safeProductUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function getDerivedState(item: WishlistItem): DerivedState {
  switch (getWishlistStateLabel(item)) {
    case 'Saving': return 'saving';
    case 'Goal reached': return 'goal';
    case 'Bought': return 'bought';
    case 'Archived': return 'archived';
    default: return 'wishlist';
  }
}

function stateLabel(state: DerivedState): string {
  switch (state) {
    case 'wishlist': return 'Wishlist';
    case 'saving': return 'Saving';
    case 'goal': return 'Goal reached';
    case 'bought': return 'Bought';
    case 'archived': return 'Archived';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const WishlistList: React.FC<WishlistListProps> = ({ showToast }) => {
  const { wishlistItems, saveWish, removeWishlistItem } = useAppData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WishlistFilter>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [addAmount, setAddAmount] = useState('');
  const [editForm, setEditForm] = useState<EditFormState>({
    title: '',
    targetPrice: '',
    savedAmount: '',
    productUrl: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const closeDialog = useCallback(() => {
    if (isSaving) return;
    setDialog(null);
    setFormError('');
  }, [isSaving]);
  const dialogRef = useModalFocus(Boolean(dialog), closeDialog);

  const summary = useMemo(() => {
    const active = wishlistItems.filter((item) => item.status === 'active');
    return {
      activeCount: active.length,
      savedCents: active.reduce((sum, item) => sum + item.savedAmountCents, 0),
      remainingCents: active.reduce(
        (sum, item) =>
          sum + Math.max((item.targetPriceCents ?? item.savedAmountCents) - item.savedAmountCents, 0),
        0
      ),
    };
  }, [wishlistItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const statusRank: Record<WishlistItem['status'], number> = {
      active: 0,
      bought: 1,
      archived: 2,
    };

    return wishlistItems
      .filter((item) => {
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query) ||
          item.productUrl?.toLowerCase().includes(query);
        if (!matchesSearch) return false;

        const state = getDerivedState(item);
        switch (filter) {
          case 'all': return true;
          case 'active': return item.status === 'active';
          case 'saving': return state === 'saving';
          case 'goal': return state === 'goal';
          case 'bought': return state === 'bought';
          case 'archived': return state === 'archived';
        }
      })
      .sort((a, b) => {
        const statusDifference = statusRank[a.status] - statusRank[b.status];
        return statusDifference || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [wishlistItems, search, filter]);

  const openAddSavings = useCallback((item: WishlistItem) => {
    setAddAmount('');
    setFormError('');
    setDialog({ kind: 'add-savings', item });
  }, []);

  const openEdit = useCallback((item: WishlistItem) => {
    setEditForm({
      title: item.title,
      targetPrice: centsToInput(item.targetPriceCents),
      savedAmount: centsToInput(item.savedAmountCents),
      productUrl: item.productUrl ?? '',
      notes: item.notes ?? '',
    });
    setFormError('');
    setDialog({ kind: 'edit', item });
  }, []);

  const handleAddSavings = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'add-savings') return;

    const amountCents = parseEuroToCents(addAmount);
    if (amountCents === null || amountCents === undefined || amountCents <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const item = dialog.item;
      const nextSavedAmount = item.savedAmountCents + amountCents;
      const reachedGoal =
        item.targetPriceCents !== undefined &&
        item.savedAmountCents < item.targetPriceCents &&
        nextSavedAmount >= item.targetPriceCents;

      await saveWish({
        ...item,
        savedAmountCents: nextSavedAmount,
        updatedAt: new Date().toISOString(),
      });
      setDialog(null);
      setFormError('');
      showToast(
        reachedGoal ? 'Savings goal reached!' : `${formatEuro(amountCents)} added to your savings.`,
        'success'
      );
    } catch {
      showToast('Could not update your savings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [dialog, addAmount, saveWish, showToast]);

  const handleSaveEdit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog?.kind !== 'edit') return;

    const title = editForm.title.trim();
    if (!title) {
      setFormError('Enter an item name.');
      return;
    }

    const targetPriceCents = editForm.targetPrice.trim()
      ? parseEuroToCents(editForm.targetPrice)
      : undefined;
    if (targetPriceCents === null || targetPriceCents === 0) {
      setFormError('Enter a target price greater than zero, or leave it blank.');
      return;
    }

    const savedAmountCents = editForm.savedAmount.trim()
      ? parseEuroToCents(editForm.savedAmount)
      : 0;
    if (savedAmountCents === null || savedAmountCents === undefined) {
      setFormError('Enter a valid saved amount of zero or more.');
      return;
    }

    const productUrl = editForm.productUrl.trim();
    if (productUrl && !safeProductUrl(productUrl)) {
      setFormError('Enter a product link starting with http:// or https://.');
      return;
    }

    setIsSaving(true);
    try {
      await saveWish({
        ...dialog.item,
        title,
        targetPriceCents,
        savedAmountCents,
        productUrl: productUrl || undefined,
        notes: editForm.notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      setDialog(null);
      setFormError('');
      showToast('Wishlist item updated', 'success');
    } catch {
      showToast('Could not save your changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [dialog, editForm, saveWish, showToast]);

  const updateStatus = useCallback(async (
    item: WishlistItem,
    status: WishlistItem['status']
  ) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      await saveWish({
        ...item,
        status,
        boughtAt: status === 'bought' ? now : undefined,
        updatedAt: now,
      });
      showToast(
        status === 'bought'
          ? 'Marked as bought'
          : status === 'archived'
            ? 'Wishlist item archived'
            : 'Moved back to your wishlist',
        'success'
      );
    } catch {
      showToast('Could not update this item. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [saveWish, showToast]);

  const handleDelete = useCallback(async () => {
    if (dialog?.kind !== 'delete') return;

    setIsSaving(true);
    try {
      await removeWishlistItem(dialog.item.id);
      setDialog(null);
      setFormError('');
      showToast('Wishlist item deleted', 'success');
    } catch {
      showToast('Could not delete this item. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [dialog, removeWishlistItem, showToast]);

  if (wishlistItems.length === 0) {
    return (
      <div className="empty-state">
        <ShoppingBag size={48} strokeWidth={1.5} aria-hidden="true" />
        <h3>Your wishlist is empty</h3>
        <p>Add something you would like to buy from the Capture tab.</p>
      </div>
    );
  }

  return (
    <div>
      <section className="wishlist-summary" aria-label="Wishlist savings summary">
        <div className="wishlist-summary__item">
          <span className="wishlist-summary__label">Active items</span>
          <strong className="wishlist-summary__value">{summary.activeCount}</strong>
        </div>
        <div className="wishlist-summary__item">
          <span className="wishlist-summary__label">Saved</span>
          <strong className="wishlist-summary__value">{formatEuro(summary.savedCents)}</strong>
        </div>
        <div className="wishlist-summary__item">
          <span className="wishlist-summary__label">Remaining</span>
          <strong className="wishlist-summary__value">{formatEuro(summary.remainingCents)}</strong>
        </div>
      </section>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search your wishlist..."
      />

      <div className="filter-bar wishlist-filter-bar" role="group" aria-label="Filter wishlist">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip ${filter === option.value ? 'active' : ''}`}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="wishlist-result-count" aria-live="polite">
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
      </p>

      {filteredItems.length === 0 ? (
        <div className="empty-state wishlist-empty-filter">
          <p>No wishlist items match this search or filter.</p>
        </div>
      ) : (
        <div>
          {filteredItems.map((item) => {
            const state = getDerivedState(item);
            const progress = getWishlistProgress(item);
            const progressValue = progress.hasGoal
              ? Math.min(item.savedAmountCents, item.targetPriceCents ?? 0)
              : 0;
            const isExpanded = expandedId === item.id;
            const productUrl = safeProductUrl(item.productUrl);

            return (
              <article key={item.id} className="card wishlist-card">
                <button
                  type="button"
                  className="wishlist-card__toggle"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${item.title}`}
                  onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}
                >
                  <span className="wishlist-card__heading">
                    <span className="wishlist-card__title-wrap">
                      <span className={`badge wishlist-badge wishlist-badge--${state}`}>
                        {stateLabel(state)}
                      </span>
                      <strong className="wishlist-card__title">{item.title}</strong>
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={20} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={20} aria-hidden="true" />
                    )}
                  </span>

                  {progress.hasGoal ? (
                    <span className="wishlist-progress-block">
                      <span className="wishlist-progress-copy">
                        <span>
                          {formatEuro(item.savedAmountCents)} saved of {formatEuro(item.targetPriceCents ?? 0)}
                        </span>
                        <span>{progress.percent}%</span>
                      </span>
                      <progress
                        className="wishlist-progress"
                        max={item.targetPriceCents}
                        value={progressValue}
                        aria-label={`${formatEuro(item.savedAmountCents)} saved of ${formatEuro(item.targetPriceCents ?? 0)} for ${item.title}`}
                      />
                      <span className="wishlist-remaining">
                        {progress.remainingCents > 0
                          ? `${formatEuro(progress.remainingCents)} to go`
                          : 'Savings goal reached'}
                      </span>
                    </span>
                  ) : (
                    <span className="wishlist-no-goal">
                      <span className="wishlist-no-goal__title">
                        <PiggyBank size={17} aria-hidden="true" />
                        No savings goal yet
                      </span>
                      <span className="wishlist-no-goal__saved">
                        {item.savedAmountCents > 0
                          ? `${formatEuro(item.savedAmountCents)} saved so far`
                          : 'No savings added yet'}
                      </span>
                    </span>
                  )}
                </button>

                {item.status === 'active' && (
                  <div className="wishlist-card__quick-action">
                    {!progress.hasGoal ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => openAddSavings(item)}>
                          <PiggyBank size={16} aria-hidden="true" /> Add savings
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
                          Set a goal
                        </button>
                      </>
                    ) : state === 'goal' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={isSaving}
                        onClick={() => updateStatus(item, 'bought')}
                      >
                        <Check size={16} aria-hidden="true" /> Mark as bought
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => openAddSavings(item)}>
                        <PiggyBank size={16} aria-hidden="true" /> Add savings
                      </button>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div className="wishlist-card__details">
                    {item.notes && (
                      <div>
                        <span className="wishlist-detail-label">Notes</span>
                        <p>{item.notes}</p>
                      </div>
                    )}
                    {productUrl && (
                      <div>
                        <span className="wishlist-detail-label">Product link</span>
                        <a
                          className="wishlist-product-link"
                          href={productUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Open product page <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      </div>
                    )}
                    <div>
                      <span className="wishlist-detail-label">Added</span>
                      <p>{formatDate(item.createdAt)}</p>
                    </div>

                    <div className="action-row wishlist-card__actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
                        <Pencil size={16} aria-hidden="true" /> Edit
                      </button>
                      {item.status === 'active' ? (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={isSaving}
                            onClick={() => updateStatus(item, 'bought')}
                          >
                            <Check size={16} aria-hidden="true" /> Mark as bought
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={isSaving}
                            onClick={() => updateStatus(item, 'archived')}
                          >
                            <Archive size={16} aria-hidden="true" /> Archive
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isSaving}
                          onClick={() => updateStatus(item, 'active')}
                        >
                          <RotateCcw size={16} aria-hidden="true" /> Move back to wishlist
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm wishlist-delete-button"
                        onClick={() => setDialog({ kind: 'delete', item })}
                      >
                        <Trash2 size={16} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {dialog && (
        <div className="modal-overlay" onClick={closeDialog}>
          <div
            ref={dialogRef}
            className="modal-card wishlist-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-dialog-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            {dialog.kind === 'add-savings' && (
              <form onSubmit={handleAddSavings}>
                <h2 id="wishlist-dialog-title">Add savings</h2>
                <p className="wishlist-modal__intro">{dialog.item.title}</p>
                <div className="form-group">
                  <label htmlFor="wishlist-add-amount">Amount to add (€)</label>
                  <input
                    id="wishlist-add-amount"
                    type="text"
                    inputMode="decimal"
                    value={addAmount}
                    onChange={(event) => {
                      setAddAmount(event.target.value);
                      setFormError('');
                    }}
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? 'wishlist-form-error' : 'wishlist-money-help'}
                    placeholder="25,00"
                  />
                  <p id="wishlist-money-help" className="wishlist-field-help">
                    Use a comma or dot for cents.
                  </p>
                </div>
                {formError && (
                  <p id="wishlist-form-error" className="wishlist-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="action-row">
                  <button className="btn btn-primary" type="submit" disabled={isSaving}>
                    <PiggyBank size={16} aria-hidden="true" />
                    {isSaving ? 'Adding...' : 'Add to savings'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={closeDialog} disabled={isSaving}>
                    <X size={16} aria-hidden="true" /> Cancel
                  </button>
                </div>
              </form>
            )}

            {dialog.kind === 'edit' && (
              <form onSubmit={handleSaveEdit}>
                <h2 id="wishlist-dialog-title">Edit wishlist item</h2>
                <div className="wishlist-edit-fields">
                  <div className="form-group">
                    <label htmlFor="wishlist-edit-title">Item name</label>
                    <input
                      id="wishlist-edit-title"
                      type="text"
                      required
                      value={editForm.title}
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, title: event.target.value }));
                        setFormError('');
                      }}
                    />
                  </div>
                  <div className="wishlist-money-grid">
                    <div className="form-group">
                      <label htmlFor="wishlist-edit-target">Target price (€)</label>
                      <input
                        id="wishlist-edit-target"
                        type="text"
                        inputMode="decimal"
                        value={editForm.targetPrice}
                        onChange={(event) => {
                          setEditForm((current) => ({ ...current, targetPrice: event.target.value }));
                          setFormError('');
                        }}
                        aria-describedby="wishlist-edit-money-help"
                        placeholder="300,00"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="wishlist-edit-saved">Saved so far (€)</label>
                      <input
                        id="wishlist-edit-saved"
                        type="text"
                        inputMode="decimal"
                        value={editForm.savedAmount}
                        onChange={(event) => {
                          setEditForm((current) => ({ ...current, savedAmount: event.target.value }));
                          setFormError('');
                        }}
                        aria-describedby="wishlist-edit-money-help"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <p id="wishlist-edit-money-help" className="wishlist-field-help wishlist-money-help">
                    Use a comma or dot for cents. Leave target price blank if you do not know it yet.
                  </p>
                  <div className="form-group">
                    <label htmlFor="wishlist-edit-link">Product link</label>
                    <input
                      id="wishlist-edit-link"
                      type="url"
                      value={editForm.productUrl}
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, productUrl: event.target.value }));
                        setFormError('');
                      }}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="wishlist-edit-notes">Notes</label>
                    <textarea
                      id="wishlist-edit-notes"
                      rows={3}
                      value={editForm.notes}
                      onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                </div>
                {formError && (
                  <p id="wishlist-form-error" className="wishlist-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="action-row">
                  <button className="btn btn-primary" type="submit" disabled={isSaving}>
                    <Check size={16} aria-hidden="true" />
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={closeDialog} disabled={isSaving}>
                    <X size={16} aria-hidden="true" /> Cancel
                  </button>
                </div>
              </form>
            )}

            {dialog.kind === 'delete' && (
              <div>
                <h2 id="wishlist-dialog-title">Delete wishlist item?</h2>
                <p className="wishlist-modal__intro">
                  Delete “{dialog.item.title}”? This cannot be undone.
                </p>
                <div className="action-row">
                  <button className="btn btn-danger" onClick={handleDelete} disabled={isSaving}>
                    <Trash2 size={16} aria-hidden="true" />
                    {isSaving ? 'Deleting...' : 'Delete'}
                  </button>
                  <button className="btn btn-secondary" onClick={closeDialog} disabled={isSaving}>
                    <X size={16} aria-hidden="true" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
