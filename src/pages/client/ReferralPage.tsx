import { useEffect, useState } from 'react';
import { getCustomerToken, marketApi } from '../../services/api';
import { useMarket } from '../../store/MarketStore';
import {
  buildShopShareUrl,
  shareOrCopy,
} from '../../utils/referral';
import { swalSuccess, swalError } from '../../utils/swal';
import { Copy, Share2 } from 'lucide-react';
import { Seo } from '../../components/Seo';

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
        const info = await marketApi.myReferral(token);
        setCode(info.referral_code);
        setCount(info.referral_count);
      } catch (e) {
        await swalError('Referral', e instanceof Error ? e.message : 'Could not load referral link');
      }
    })();
  }, [customer]);

  if (!customer) {
    return (
      <div className="container" style={{ padding: '3rem 0' }}>
        <Seo
          title="Refer a friend"
          description="Share Elliecollections with friends and track your referrals."
          path="/refer"
        />
        <h1 style={{ fontFamily: 'var(--display)' }}>Referral links</h1>
        <p className="muted">Sign in at checkout to get your personal Elliecollections referral code.</p>
      </div>
    );
  }

  const url = buildShopShareUrl(code);

  return (
    <div className="container" style={{ padding: '3rem 0', maxWidth: 640 }}>
      <Seo
        title="Refer a friend"
        description="Share Elliecollections with friends and track your referrals."
        path="/refer"
      />
      <p className="eyebrow">Invite & earn love</p>
      <h1 style={{ fontFamily: 'var(--display)', marginTop: 0 }}>Your referral link</h1>
      <p className="muted">
        Share Elliecollections with friends. When they join using your link, we track the referral.
      </p>
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--line)',
          padding: '1.25rem',
          marginTop: '1.25rem',
        }}
      >
        <div className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
          CODE
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', margin: '0.35rem 0' }}>
          {code || '…'}
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {count} friend{count === 1 ? '' : 's'} joined with your code
        </div>
        <code
          style={{
            display: 'block',
            wordBreak: 'break-all',
            background: 'var(--blush-soft)',
            padding: '0.75rem',
            fontSize: 13,
          }}
        >
          {url}
        </code>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !code}
            onClick={() => {
              setBusy(true);
              void shareOrCopy({
                title: 'Elliecollections',
                text: 'Discover feminine fashion on Elliecollections',
                url,
              })
                .then((r) =>
                  swalSuccess(
                    r === 'shared' ? 'Shared' : 'Copied',
                    r === 'shared' ? 'Thanks for sharing.' : 'Referral link copied to clipboard.',
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
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
    </div>
  );
}
