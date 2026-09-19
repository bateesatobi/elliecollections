import { useCurrency } from '../store/CurrencyStore';
import { getPriceDisplay } from '../utils/pricing';

type Props = {
  priceUgx: number;
  compareAtPriceUgx?: number | null;
  unit?: string;
  size?: 'card' | 'detail';
};

export function AmzPrice({
  priceUgx,
  compareAtPriceUgx,
  unit,
  size = 'card',
}: Props) {
  const { formatMoney, currency } = useCurrency();
  const d = getPriceDisplay(priceUgx, compareAtPriceUgx);
  const amountClass = size === 'detail' ? 'amz-price-amount--lg' : 'amz-price-amount';

  return (
    <div className={`amz-price-block amz-price-block--${size}`}>
      <div className="amz-price-row">
        <span className={`${amountClass}${d.hasDiscount ? ' is-sale' : ''}`}>
          {formatMoney(d.priceUgx)}
        </span>
        {unit ? <span className="unit"> / {unit}</span> : null}
      </div>
      {currency.code !== 'UGX' ? (
        <div className="amz-list-price">≈ UGX {d.priceUgx.toLocaleString()}</div>
      ) : null}

      {d.hasDiscount && d.listPriceUgx != null ? (
        <>
          <div className="amz-list-price">
            List: <span className="amz-strike">{formatMoney(d.listPriceUgx)}</span>
          </div>
          <div className="amz-save-line">
            Save {formatMoney(d.saveUgx)} ({d.percentOff}%)
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DealBadge({
  priceUgx,
  compareAtPriceUgx,
}: {
  priceUgx: number;
  compareAtPriceUgx?: number | null;
}) {
  const d = getPriceDisplay(priceUgx, compareAtPriceUgx);
  if (!d.hasDiscount) return null;
  return <span className="amz-deal-badge">-{d.percentOff}%</span>;
}
