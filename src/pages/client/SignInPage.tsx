import { useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneInput } from '../../components/PhoneInput';
import { Seo } from '../../components/Seo';
import { useMarket } from '../../store/MarketStore';
import { useCurrency } from '../../store/CurrencyStore';
import { SHOP, whatsappHref } from '../../utils/shopContact';
import { validateMobilePhone } from '../../utils/phone';

const SIGNIN_VISUAL =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80';

function isoFromCurrency(code: string) {
  const map: Record<string, string> = {
    UGX: 'UG',
    KES: 'KE',
    TZS: 'TZ',
    RWF: 'RW',
    SSP: 'SS',
    CDF: 'CD',
  };
  return map[code] || 'UG';
}

export function SignInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { customer, continueWithPhone } = useMarket();
  const { currency, detectedCountry } = useCurrency();
  const defaultIso = detectedCountry || isoFromCurrency(currency.code);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [needsName, setNeedsName] = useState(false);

  const nextPath = useMemo(() => {
    const raw = params.get('next') || '';
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/orders';
  }, [params]);

  if (customer && !busy) return <Navigate to={nextPath} replace />;

  const onContinue = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const phoneErr = validateMobilePhone(phone, defaultIso);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await continueWithPhone(phone, needsName ? name : undefined);
    setBusy(false);
    if (err) {
      if (/new number|enter your name/i.test(err)) {
        setNeedsName(true);
        setError('New number — enter your name once to save your orders.');
        return;
      }
      setError(err);
      return;
    }
    navigate(nextPath, { replace: true });
  };

  const wa = whatsappHref('Hi Elliecollections 👋 I need help signing in.');

  return (
    <section className="ec-signin-page">
      <Seo
        title="Continue with phone"
        description="Enter your mobile number to track orders and reorder faster at Elliecollections."
        path="/signin"
        noIndex
      />

      <div
        className="ec-signin-visual"
        style={{ backgroundImage: `url(${SIGNIN_VISUAL})` }}
        aria-hidden
      >
        <div className="ec-signin-veil" />
        <div className="ec-signin-visual-copy">
          <p className="ec-signin-brand">
            Ellie<em>collections</em>
          </p>
          <h2>Your number is your account</h2>
          <p>No password. No OTP. Just the phone you use for MoMo and WhatsApp.</p>
        </div>
      </div>

      <div className="ec-signin-panel">
        <div className="ec-signin-panel-inner">
          <p className="eyebrow">Your account</p>
          <h1>Continue with phone</h1>
          <p className="ec-signin-lead">
            Enter your mobile number. Prefer to buy once?{' '}
            <Link to="/checkout">Checkout as guest</Link>.
          </p>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <form onSubmit={onContinue} className="ec-signin-form">
            <PhoneInput
              id="signin-phone"
              label="Mobile number"
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setNeedsName(false);
              }}
              defaultIso={defaultIso}
              required
              disabled={busy}
              hint="Supported: Uganda, Kenya, Tanzania, Rwanda, South Sudan, DR Congo"
            />
            {needsName ? (
              <div className="field">
                <label htmlFor="signin-name">Your name</label>
                <input
                  id="signin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                  disabled={busy}
                  required
                />
              </div>
            ) : null}
            <button type="submit" className="btn btn-bag" disabled={busy}>
              {busy ? 'Continuing…' : needsName ? 'Save & continue' : 'Continue'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            WhatsApp us anytime on {SHOP.phoneDisplay}
            {wa ? (
              <>
                {' · '}
                <a href={wa} target="_blank" rel="noreferrer">
                  Chat now
                </a>
              </>
            ) : null}
          </p>

          <nav className="ec-signin-links" aria-label="Account shortcuts">
            <Link to="/checkout">Checkout as guest</Link>
            <Link to="/track">Track by phone</Link>
            <Link to="/size-guide">Size guide</Link>
            <Link to="/shop">Continue shopping</Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
