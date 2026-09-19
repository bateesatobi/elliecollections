import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { marketApi, type Promo } from '../services/api';
import './PromoBanner.css';

export function PromoBanner() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void marketApi
      .listPromos()
      .then(setPromos)
      .catch(() => setPromos([]));
  }, []);

  useEffect(() => {
    if (promos.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % promos.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [promos.length]);

  if (!promos.length) return null;
  const promo = promos[index] || promos[0];
  const animation = promo.animation || 'slide';

  return (
    <section className={`ec-promo-banner anim-${animation}`} key={`${promo.id}-${index}`}>
      {promo.imageUrl ? (
        <div
          className="ec-promo-bg"
          style={{ backgroundImage: `url(${promo.imageUrl})` }}
          aria-hidden
        />
      ) : (
        <div className="ec-promo-bg ec-promo-bg-fallback" aria-hidden />
      )}
      <div className="ec-promo-veil" />
      <div className="ec-promo-copy">
        <span className="ec-promo-chip">{promo.badge || 'Promo'}</span>
        <h2>{promo.title}</h2>
        {promo.subtitle ? <p>{promo.subtitle}</p> : null}
        <Link to={promo.ctaUrl || '/shop?promo=1'} className="btn btn-ghost">
          {promo.ctaLabel || 'Shop now'}
        </Link>
      </div>
      {promos.length > 1 ? (
        <div className="ec-promo-dots">
          {promos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={i === index ? 'active' : ''}
              aria-label={`Show promo ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
