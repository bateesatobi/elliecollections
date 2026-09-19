import { useEffect, useState, type FormEvent } from 'react';
import { Stars } from './ProductCard';
import { getCustomerToken, marketApi } from '../services/api';
import { useMarket } from '../store/MarketStore';
import type { ProductReview } from '../types';

type Props = { productId: string };

export function ProductReviews({ productId }: Props) {
  const { customer } = useMarket();
  const [items, setItems] = useState<ProductReview[]>([]);
  const [average, setAverage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingMine, setPendingMine] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await marketApi.listReviews(productId);
      setItems(data.items);
      setAverage(data.average);
      setTotal(data.total);
    } catch {
      setItems([]);
      setAverage(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPendingMine(false);
    setSuccess(null);
    void refresh();
  }, [productId]);

  const alreadyReviewedPublic = Boolean(
    customer && items.some((r) => r.userId === customer.id),
  );
  const formLocked = alreadyReviewedPublic || pendingMine;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const token = getCustomerToken();
    if (!customer || !token) {
      setError('Sign in at checkout to leave a review.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await marketApi.createReview(token, productId, {
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      setTitle('');
      setBody('');
      setRating(5);
      setPendingMine(true);
      setSuccess(
        'Thanks! Your review was submitted and will appear after admin approval.',
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ec-reviews container" style={{ padding: '1.5rem 0 3rem' }}>
      <div className="ec-section-head">
        <div>
          <p className="eyebrow">Customer voices</p>
          <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '1.8rem' }}>
            Reviews
          </h2>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {loading
              ? 'Loading…'
              : total
                ? `${average.toFixed(1)} average · ${total} review${total === 1 ? '' : 's'}`
                : 'No published reviews yet — be the first'}
          </p>
        </div>
        {total > 0 ? (
          <div className="ec-reviews-avg">
            <Stars rating={average || 0} />
            <strong>{average.toFixed(1)}</strong>
          </div>
        ) : null}
      </div>

      <div className="ec-reviews-grid">
        <div className="ec-reviews-list">
          {!loading && !items.length ? (
            <div className="empty" style={{ background: '#fff' }}>
              No published reviews yet. New feedback is checked by our team before it appears.
            </div>
          ) : (
            items.map((r) => (
              <article key={r.id} className="ec-review-card">
                <div className="ec-review-head">
                  <Stars rating={r.rating} />
                  <strong>{r.authorName}</strong>
                  <span className="muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.title ? <h3>{r.title}</h3> : null}
                <p>{r.body}</p>
              </article>
            ))
          )}
        </div>

        <aside className="panel ec-review-form-wrap">
          <h3 style={{ marginTop: 0 }}>Write a review</h3>
          {!customer ? (
            <p className="muted">
              Sign in when you checkout, then return here to rate this piece.
            </p>
          ) : formLocked ? (
            <div className="alert alert-ok" style={{ marginBottom: 0 }}>
              {pendingMine
                ? 'Your review is awaiting admin approval before it is shown publicly.'
                : 'Thanks — you’ve already reviewed this piece.'}
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              {error ? <div className="alert alert-error">{error}</div> : null}
              {success ? <div className="alert alert-ok">{success}</div> : null}
              <div className="field">
                <label>Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  disabled={busy}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Title (optional)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Loved the fit"
                  disabled={busy}
                />
              </div>
              <div className="field">
                <label>Your review</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  required
                  minLength={3}
                  placeholder="How was the quality, fit, and delivery?"
                  disabled={busy}
                />
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
                Reviews are moderated. Approved feedback is shown to other shoppers.
              </p>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
