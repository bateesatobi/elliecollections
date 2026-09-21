import { Link } from 'react-router-dom';
import { Seo } from '../../components/Seo';
import { SHOP, whatsappHref } from '../../utils/shopContact';

const ROWS = [
  { size: 'XS', bust: '78–82', waist: '60–64', hip: '86–90' },
  { size: 'S', bust: '83–87', waist: '65–69', hip: '91–95' },
  { size: 'M', bust: '88–93', waist: '70–75', hip: '96–101' },
  { size: 'L', bust: '94–99', waist: '76–81', hip: '102–107' },
  { size: 'XL', bust: '100–106', waist: '82–88', hip: '108–114' },
  { size: 'XXL', bust: '107–114', waist: '89–96', hip: '115–122' },
];

export function SizeGuidePage() {
  const wa = whatsappHref(
    'Hi Elliecollections 👋 I need help choosing my size. My measurements are: bust ___, waist ___, hip ___.',
  );

  return (
    <div className="container section ec-help-page">
      <Seo
        title="Size guide"
        description="Elliecollections size chart and fit tips — measure once, order with confidence."
        path="/size-guide"
      />
      <p className="eyebrow">Fit with confidence</p>
      <h1 style={{ fontFamily: 'var(--display)', marginTop: 0 }}>Size guide</h1>
      <p className="muted" style={{ maxWidth: 540 }}>
        Soft tapes work best. Measure over light clothing. If you’re between sizes, WhatsApp us a
        photo or your usual brand size — we’ll recommend before you pay.
      </p>

      <div className="panel" style={{ overflowX: 'auto', marginTop: 20 }}>
        <table className="ec-size-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Bust (cm)</th>
              <th>Waist (cm)</th>
              <th>Hip (cm)</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.size}>
                <td>
                  <strong>{r.size}</strong>
                </td>
                <td>{r.bust}</td>
                <td>{r.waist}</td>
                <td>{r.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ec-help-grid">
        <div className="panel">
          <h2>How to measure</h2>
          <ol>
            <li>
              <strong>Bust</strong> — fullest part of the chest, tape parallel to the floor.
            </li>
            <li>
              <strong>Waist</strong> — narrowest part of your torso, usually above the navel.
            </li>
            <li>
              <strong>Hip</strong> — fullest part of your hips/seat.
            </li>
          </ol>
        </div>
        <div className="panel">
          <h2>Fit tips for East Africa</h2>
          <ul>
            <li>Prefer a looser drape in heat? size up on fitted dresses.</li>
            <li>Check the product size chips — some pieces run true to EU sizing.</li>
            <li>Unsure? Ask on WhatsApp before you order — we reply during shop hours.</li>
          </ul>
          {wa ? (
            <a href={wa} className="btn btn-primary" target="_blank" rel="noreferrer">
              Ask size on WhatsApp
            </a>
          ) : null}
          <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            {SHOP.phoneDisplay} · {SHOP.hours}
          </p>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 24 }}>
        See also: <Link to="/returns">Returns &amp; exchanges</Link> ·{' '}
        <Link to="/shop">Shop the collection</Link>
      </p>
    </div>
  );
}
