import type { Order, OrderStatus } from '../types';

export type TrackLog = {
  id: string;
  status: OrderStatus | 'placed' | 'note';
  title: string;
  detail: string;
  at: string | null;
  done: boolean;
  current: boolean;
  upcoming?: boolean;
};

/**
 * Cash on delivery / pay-at-shop never needs a separate “paid” stage —
 * money is collected at delivery or pickup. Online payments skip “pending”.
 */
function pipelineFor(order: Order): OrderStatus[] {
  if (order.paymentMethod === 'cash') {
    return ['pending', 'processing', 'shipped', 'delivered'];
  }
  return ['paid', 'processing', 'shipped', 'delivered'];
}

export function orderPipeline(order: Order): OrderStatus[] {
  return pipelineFor(order);
}

export function orderStepIndex(order: Order): number {
  if (order.status === 'cancelled' || order.status === 'refunded') return -1;
  const steps = pipelineFor(order);
  // Cash orders may still be stored as "paid" if an admin marked them — map to processing
  let status = order.status;
  if (order.paymentMethod === 'cash' && status === 'paid') {
    status = 'processing';
  }
  const i = steps.indexOf(status);
  return i >= 0 ? i : 0;
}

export function statusLabel(status: string, order?: Order): string {
  if (order?.paymentMethod === 'cash') {
    if (status === 'pending') {
      return order.fulfillmentMode === 'pickup' ? 'Confirmed — pay at shop' : 'Confirmed — pay on delivery';
    }
    if (status === 'paid') {
      return order.fulfillmentMode === 'pickup' ? 'Confirmed — pay at shop' : 'Confirmed — pay on delivery';
    }
    if (status === 'shipped') {
      return order.fulfillmentMode === 'pickup' ? 'Ready for pickup' : 'On the way';
    }
    if (status === 'delivered') {
      return order.fulfillmentMode === 'pickup' ? 'Collected' : 'Delivered';
    }
  }
  const map: Record<string, string> = {
    pending: 'Awaiting payment',
    paid: 'Payment confirmed',
    processing: 'Preparing your order',
    shipped: 'On the way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    placed: 'Order placed',
  };
  return map[status] || status;
}

/** Human “where is it” copy for the current stage. */
export function whereIsOrder(order: Order): { headline: string; body: string } {
  const pickup = order.fulfillmentMode === 'pickup';
  const place = pickup ? 'the Elliecollections boutique' : 'your delivery address';
  const cash = order.paymentMethod === 'cash';

  switch (order.status) {
    case 'pending':
      if (cash) {
        return {
          headline: pickup ? 'Order confirmed — pay at the shop' : 'Order confirmed — pay on delivery',
          body: pickup
            ? 'We’re preparing your pieces. Bring cash when you collect at Kololo.'
            : 'We’re preparing your pieces. Have cash ready for the rider when your order arrives.',
        };
      }
      return {
        headline: 'Waiting for payment',
        body: pickup
          ? 'Complete payment so we can prepare your pickup.'
          : 'Complete payment so we can start preparing your pieces.',
      };
    case 'paid':
      if (cash) {
        return {
          headline: pickup ? 'Order confirmed — pay at the shop' : 'Order confirmed — pay on delivery',
          body: pickup
            ? 'We’re preparing your pieces. Bring cash when you collect.'
            : 'We’re preparing your pieces. Pay the rider in cash on arrival.',
        };
      }
      return {
        headline: 'Confirmed at Elliecollections',
        body: 'We’ve received your payment and queued the order for packing.',
      };
    case 'processing':
      return {
        headline: 'Being prepared at the boutique',
        body: pickup
          ? 'Your items are being packed for shop pickup.'
          : 'Your items are being checked, packed, and labeled for dispatch.',
      };
    case 'shipped':
      return {
        headline: pickup ? 'Ready for pickup' : 'With the courier',
        body: pickup
          ? `Collect from ${order.deliveryAddress || 'our shop'}${order.district ? `, ${order.district}` : ''}${cash ? ' — pay cash at collection.' : '.'}`
          : order.trackingNumber
            ? `In transit via ${order.trackingCarrier || 'courier'} · tracking ${order.trackingNumber}.${cash ? ' Pay cash on arrival.' : ''}`
            : `Heading to ${order.deliveryAddress || place}${order.district ? `, ${order.district}` : ''}.${cash ? ' Pay cash on arrival.' : ''}`,
      };
    case 'delivered':
      return {
        headline: pickup ? 'Collected' : 'Delivered',
        body: pickup
          ? cash
            ? 'Collected and paid at the shop. Thank you for shopping Elliecollections.'
            : 'This order was collected from the shop. Thank you for shopping Elliecollections.'
          : cash
            ? `Delivered to ${order.recipientName || 'you'} and paid on delivery.`
            : `Delivered to ${order.recipientName || 'the recipient'} at ${order.deliveryAddress || 'the delivery address'}.`,
      };
    case 'cancelled':
      return {
        headline: 'Order cancelled',
        body: 'This order will not be fulfilled. Contact support if you need help.',
      };
    case 'refunded':
      return {
        headline: 'Refund processed',
        body: order.refundNote || 'A refund was issued for this order.',
      };
    default:
      return {
        headline: 'Tracking update',
        body: 'We’re updating the status of your order.',
      };
  }
}

function stepDetail(order: Order, step: OrderStatus): string {
  const cash = order.paymentMethod === 'cash';
  const pickup = order.fulfillmentMode === 'pickup';
  switch (step) {
    case 'pending':
      return cash
        ? pickup
          ? 'Order locked in. Pay cash when you collect.'
          : 'Order locked in. Pay cash to the rider on arrival.'
        : 'Waiting for payment confirmation.';
    case 'paid':
      return cash
        ? pickup
          ? 'Order locked in. Pay cash when you collect.'
          : 'Order locked in. Pay cash to the rider on arrival.'
        : `Payment via ${paymentMethodLabel(order)} · ref ${order.paymentRef}`;
    case 'processing':
      return 'Boutique team is selecting sizes and packing.';
    case 'shipped':
      if (order.trackingNumber) {
        return `${order.trackingCarrier || 'Courier'} · ${order.trackingNumber}`;
      }
      return pickup ? 'Ready for collection at the shop.' : 'Dispatched for home delivery.';
    case 'delivered':
      return pickup
        ? cash
          ? 'Collected and paid at the shop.'
          : 'Collected by customer.'
        : cash
          ? `Delivered to ${order.deliveryAddress || 'destination'} — cash collected.`
          : `Arrived at ${order.deliveryAddress || 'destination'}.`;
    default:
      return '';
  }
}

/**
 * Activity log: only real progress (placed + stages up to current).
 * Upcoming stages are listed without timestamps so COD doesn’t look “already delivered”.
 */
export function buildOrderLogs(order: Order): TrackLog[] {
  const created = order.createdAt;
  const updated = order.updatedAt || order.createdAt;
  const steps = pipelineFor(order);
  const active = orderStepIndex(order);
  const logs: TrackLog[] = [];

  logs.push({
    id: 'placed',
    status: 'placed',
    title: 'Order placed',
    detail: `Received · ${order.items.length} item${order.items.length === 1 ? '' : 's'} · ${
      order.fulfillmentMode === 'pickup' ? 'Shop pickup' : 'Home delivery'
    }${order.paymentMethod === 'cash' ? ` · ${paymentMethodLabel(order)}` : ''}`,
    at: created,
    done: true,
    current: false,
  });

  if (order.status === 'cancelled' || order.status === 'refunded') {
    logs.push({
      id: order.status,
      status: order.status,
      title: statusLabel(order.status, order),
      detail: order.refundNote || whereIsOrder(order).body,
      at: updated,
      done: true,
      current: true,
    });
    return logs;
  }

  steps.forEach((s, i) => {
    const done = active >= 0 && i < active;
    const current = active >= 0 && i === active;
    const upcoming = active >= 0 && i > active;

    logs.push({
      id: s,
      status: s,
      title: statusLabel(s, order),
      detail: upcoming
        ? cashUpcomingHint(order, s)
        : stepDetail(order, s),
      // Only stamp times for events that have actually happened
      at: upcoming ? null : current ? updated : created,
      done: done || current,
      current,
      upcoming,
    });
  });

  return logs;
}

function cashUpcomingHint(order: Order, step: OrderStatus): string {
  if (step === 'processing') return 'Waiting for the boutique to start packing.';
  if (step === 'shipped') {
    return order.fulfillmentMode === 'pickup'
      ? 'You’ll be notified when it’s ready to collect.'
      : 'You’ll be notified when the rider is on the way.';
  }
  if (step === 'delivered') {
    return order.paymentMethod === 'cash'
      ? order.fulfillmentMode === 'pickup'
        ? 'Pay cash at the shop when you collect.'
        : 'Pay cash to the rider when it arrives.'
      : 'Final stage once the order reaches you.';
  }
  return 'Coming up.';
}

export function paymentMethodLabel(order: Order): string {
  switch (order.paymentMethod) {
    case 'mtn':
      return 'MTN MoMo (Pesapal)';
    case 'airtel':
      return 'Airtel Money (Pesapal)';
    case 'card':
      return 'Card (Pesapal)';
    case 'cash':
      return order.fulfillmentMode === 'pickup' ? 'Pay at shop' : 'Cash on delivery';
    default:
      return 'Payment';
  }
}
