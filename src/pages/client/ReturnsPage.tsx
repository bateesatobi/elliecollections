import { Link } from 'react-router-dom';
import { Seo } from '../../components/Seo';
import { SHOP, whatsappHref } from '../../utils/shopContact';

export function ReturnsPage() {
  const wa = whatsappHref(
    'Hi Elliecollections 👋 I’d like to start a return / exchange for order: ',
  );

  return (
    <div className="container section ec-help-page">
      <Seo
        title="Returns & exchanges"
        description={`Return or exchange Elliecollections pieces within ${SHOP.returnsWindowDays} days — unworn, with tags.`}
        path="/returns"
      />
      <p className="eyebrow">Shop with peace of mind</p>
      <h1 style={{ fontFamily: 'var(--display)', marginTop: 0 }}>Returns &amp; exchanges</h1>
      <p className="muted" style={{ maxWidth: 560 }}>
        Fashion online should feel as safe as trying something in Kololo. If the fit isn’t right,
        we’ll help you exchange or return.
      </p>

      <div className="ec-help-grid" style={{ marginTop: 20 }}>
        <div className="panel">
          <h2>{SHOP.returnsWindowDays}-day window</h2>
          <ul>
            <li>Request within {SHOP.returnsWindowDays} days of delivery or pickup.</li>
            <li>Item must be unused, unwashed, with original tags attached.</li>
            <li>Underwear, beauty opened after seals, and final-sale / clearance may not return.</li>
          </ul>
        </div>
        <div className="panel">
          <h2>How it works</h2>
          <ol>
            <li>WhatsApp us your order ID + phone + photos of the piece.</li>
            <li>We confirm exchange (different size) or refund path.</li>
            <li>
              Bring the item to {SHOP.address}, or arrange a pickup where we deliver.
            </li>
            <li>Refunds for MoMo/card go back to the same method; cash COD refunds are cash.</li>
          </ol>
          {wa ? (
            <a href={wa} className="btn btn-primary" target="_blank" rel="noreferrer">
              Start on WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Try before you commit</h2>
        <p className="muted">
          Choose <strong>shop pickup</strong> at checkout and try pieces in Kololo before paying
          cash. Or message us for size advice using our{' '}
          <Link to="/size-guide">size guide</Link>.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          {SHOP.phoneDisplay} · {SHOP.hours}
        </p>
      </div>
    </div>
  );
}
