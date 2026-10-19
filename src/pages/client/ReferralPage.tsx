import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Gift, Share2, Sparkles } from 'lucide-react';
import { Seo } from '../../components/Seo';
import { getCustomerToken, marketApi } from '../../services/api';
import { useMarket } from '../../store/MarketStore';
import { buildShopShareUrl, shareOrCopy } from '../../utils/referral';
import { processLabel } from '../../utils/processCatalog';
import { runProcess } from '../../utils/processProgress';
import { swalError, swalSuccess } from '../../utils/swal';

export function ReferralPage() {
  const { customer } = useMarket();
  const [code, setCode] = useState('');
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const token = getCustomerToken();
    if (!token) return;
    void (async () => {
      try {
        await runProcess(
          {
            kind: 'load',
            title: processLabel('client.referral', 'Loading referral…'),
            mode: 'bar',
            percent: 30,
          },
          async (set) => {
            set(65, 'Fetching your link…');
            const info = await marketApi.myReferral(token);
            setCode(info.referral_code);
            setCount(info.referral_count);
          },
        );
      } catch (e) {
        await swalError('Referral', e instanceof Error ? e.message : 'Could not load referral link');
      }
    })();
  }, [customer]);

  const url = buildShopShareUrl(code);

  const share = async () => {
    if (!code) return;
    setBusy(true);
    try {
      const r = await shareOrCopy({
        title: 'Elliecollections',
        text: 'Discover feminine fashion on Elliecollections',
        url,
      });
      await swalSuccess(
        r === 'shared' ? 'Shared' : 'Copied',
        r === 'shared' ? 'Thanks for sharing.' : 'Referral link copied to clipboard.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ec-page">
      <Seo
        title="Refer a friend"
        description="Share Elliecollections with friends and track your referrals."
        path="/refer"
      />
      <header className="ec-page-hero">
        <p className="eyebrow">Invite &amp; earn love</p>
        <h1>Refer a friend</h1>
        <p className="muted">
          Send your link. When she joins or shops with it, we credit the referral to you.
        </p>
      </header>

      <div className="ec-page-body">
        {!customer ? (
          <div className="ec-page-card ec-request-gate">
            <Gift size={28} />
            <h2>Sign in for your personal link</h2>
            <p className="muted">Your referral code is tied to the phone on your account.</p>
            <Link to="/signin?next=/refer" className="btn btn-primary">
              Continue with phone
            </Link>
          </div>
        ) : (
          <div className="ec-refer-layout">
            <div className="ec-page-card">
              <span className="ec-refer-kicker">Your code</span>
              <div className="ec-refer-code">{code || '…'}</div>
              <p className="muted">
                {count} friend{count === 1 ? '' : 's'} joined with your code
              </p>
              <code className="ec-refer-url">{url}</code>
              <div className="ec-page-actions">
                <button type="button" className="btn btn-primary" disabled={busy || !code} onClick={() => void share()}>
                  <Share2 size={16} /> Share link
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!code}
                  onClick={() => {
                    void navigator.clipboard.writeText(url).then(() =>
                      swalSuccess('Copied', 'Referral link copied.'),
                    );
                  }}
                >
                  <Copy size={16} /> Copy
                </button>
              </div>
            </div>
            <ol className="ec-refer-steps">
              <li>
                <Sparkles size={18} />
                <div>
                  <strong>Share your link</strong>
                  <p>WhatsApp, Instagram, or a text — your code is already in the URL.</p>
                </div>
              </li>
              <li>
                <Gift size={18} />
                <div>
                  <strong>She shops the collection</strong>
                  <p>New visitors land on the shop with your referral attached.</p>
                </div>
              </li>
              <li>
                <Share2 size={18} />
                <div>
                  <strong>We track it for you</strong>
                  <p>The counter above updates when someone joins with your code.</p>
                </div>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
