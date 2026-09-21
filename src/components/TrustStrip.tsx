import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, RefreshCw, Ruler, Smartphone, Truck } from 'lucide-react';
import { SHOP, whatsappHref } from '../utils/shopContact';

type Props = { compact?: boolean };

export function TrustStrip({ compact = false }: Props) {
  const wa = whatsappHref(
    'Hi Elliecollections 👋 I have a question before I order.',
  );

  return (
    <section className={`ec-trust${compact ? ' is-compact' : ''}`} aria-label="Why shop with us">
      <div className={`ec-trust-grid${compact ? '' : ' is-wide'}`}>
        <div className="ec-trust-item">
          <Truck size={20} strokeWidth={1.75} aria-hidden />
          <div>
            <strong>Pay on delivery</strong>
            <span>Cash, MTN or Airtel — pay when you’re ready</span>
          </div>
        </div>
        <div className="ec-trust-item">
          <MapPin size={20} strokeWidth={1.75} aria-hidden />
          <div>
            <strong>Collect in Kololo</strong>
            <span>
              {SHOP.address} · {SHOP.hours.split('·')[0].trim()}
            </span>
          </div>
        </div>
        <div className="ec-trust-item">
          <Smartphone size={20} strokeWidth={1.75} aria-hidden />
          <div>
            <strong>Phone is enough</strong>
            <span>No password — order &amp; track with your number</span>
          </div>
        </div>
        <div className="ec-trust-item">
          <MessageCircle size={20} strokeWidth={1.75} aria-hidden />
          <div>
            <strong>WhatsApp {SHOP.phoneDisplay}</strong>
            <span>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer">
                  Size help, reserve a piece, confirm delivery
                </a>
              ) : (
                'Size help before you buy'
              )}
            </span>
          </div>
        </div>
        {!compact ? (
          <>
            <div className="ec-trust-item">
              <RefreshCw size={20} strokeWidth={1.75} aria-hidden />
              <div>
                <strong>{SHOP.returnsWindowDays}-day exchange</strong>
                <span>
                  <Link to="/returns">Unworn with tags</Link> — we sort it on WhatsApp
                </span>
              </div>
            </div>
            <div className="ec-trust-item">
              <Ruler size={20} strokeWidth={1.75} aria-hidden />
              <div>
                <strong>Size guide</strong>
                <span>
                  <Link to="/size-guide">Measure once</Link>, then ask us if you’re between sizes
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
