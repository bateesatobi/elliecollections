/** Compact brand-style marks for checkout payment options. */

type IconProps = { className?: string; title?: string };

export function MtnMomoIcon({ className, title = 'MTN MoMo' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 32"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="32" rx="6" fill="#FFCC00" />
      <text
        x="24"
        y="14"
        textAnchor="middle"
        fontFamily="Arial Black, Helvetica, sans-serif"
        fontSize="9"
        fontWeight="900"
        fill="#000"
        letterSpacing="0.5"
      >
        MTN
      </text>
      <text
        x="24"
        y="24"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="7"
        fontWeight="700"
        fill="#0033A0"
        letterSpacing="0.8"
      >
        MoMo
      </text>
    </svg>
  );
}

export function AirtelMoneyIcon({ className, title = 'Airtel Money' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 32"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="32" rx="6" fill="#ED1C24" />
      <text
        x="24"
        y="13.5"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="8"
        fontWeight="800"
        fill="#fff"
        letterSpacing="-0.2"
      >
        airtel
      </text>
      <text
        x="24"
        y="23"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="6.5"
        fontWeight="600"
        fill="#fff"
        opacity="0.95"
        letterSpacing="0.4"
      >
        money
      </text>
    </svg>
  );
}

export function CardPayIcon({ className, title = 'Card' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 32"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="32" rx="6" fill="#1A1F71" />
      {/* Visa-style mark */}
      <text
        x="14"
        y="20"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="9"
        fontWeight="800"
        fontStyle="italic"
        fill="#fff"
        letterSpacing="-0.5"
      >
        VISA
      </text>
      {/* Mastercard-style interlocking circles */}
      <circle cx="34" cy="16" r="6.5" fill="#EB001B" />
      <circle cx="40" cy="16" r="6.5" fill="#F79E1B" />
      <path
        d="M37 10.2a6.5 6.5 0 0 1 0 11.6 6.5 6.5 0 0 1 0-11.6z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function CashPayIcon({
  className,
  title = 'Cash',
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 32"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="32" rx="6" fill="#1B5E20" />
      <rect x="5" y="6" width="38" height="20" rx="3" fill="#E8F5E9" />
      <rect x="7" y="8" width="34" height="16" rx="2" fill="#C8E6C9" />
      <circle cx="24" cy="16" r="5.5" fill="#2E7D32" />
      <text
        x="24"
        y="18.5"
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="7"
        fontWeight="800"
        fill="#E8F5E9"
      >
        UGX
      </text>
      <circle cx="10" cy="16" r="1.6" fill="#81C784" />
      <circle cx="38" cy="16" r="1.6" fill="#81C784" />
    </svg>
  );
}

export function PesapalBadgeIcon({ className, title = 'Pesapal' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="10" fill="#0B4F8A" />
      <path
        d="M6 10.2l2.4 2.4L14.2 7"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
