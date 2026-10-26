// Heterogeneous consolidated orders: per-leg truck type, destination and price,
// summed pricing, and homogeneous back-compat.
import { j, unwrap, login, ACCOUNTS, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Heterogeneous consolidated orders');
  const client = ctx?.client ?? (await login(ACCOUNTS.client));
  ok('client login', !!client.token);

  const base = {
    cargoType: 'GENERAL', cargoDescription: 'e2e heterogeneous', weight: 5000,
    mode: 'DIRECT', orderType: 'CONSOLIDATED',
    originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'warehouse',
    destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'port',
    requiredTruckType: 'REFRIGERATED', pickupDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    legs: [
      { requiredTruckType: 'REFRIGERATED', destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'market', price: 4200, reference: 'REF-COLD' },
      { requiredTruckType: 'CONTAINER_40', destinationCity: 'الدمام', destinationRegion: 'الشرقية', destinationAddress: 'port', price: 5800 },
      { requiredTruckType: 'LARGE_FLATBED', destinationCity: 'أبها', destinationRegion: 'عسير', destinationAddress: 'zone', price: 6000 },
    ],
  };
  const order = unwrap((await j('POST', '/orders', client.token, base)).data);
  ok('order created, CONSOLIDATED, 3 legs', order?.orderType === 'CONSOLIDATED' && order?.truckCount === 3, String(order?.truckCount));
  ok('clientBudget = sum of leg prices (16000)', Number(order?.clientBudget) === 16000, String(order?.clientBudget));
  ok('DIRECT agreedPrice = 16000 (sum)', Number(order?.agreedPrice) === 16000, String(order?.agreedPrice));

  const legs = unwrap((await j('GET', `/orders/${order.id}/legs`, client.token)).data);
  ok('legs endpoint reports heterogeneous', legs?.heterogeneous === true);
  ok('3 legs returned', legs?.legs?.length === 3);
  const L = legs?.legs || [];
  ok('leg 1 = REFRIGERATED → جدة @ 4200', L[0]?.requiredTruckType === 'REFRIGERATED' && L[0]?.destinationCity === 'جدة' && L[0]?.price === 4200);
  ok('leg 2 = CONTAINER_40 → الدمام @ 5800', L[1]?.requiredTruckType === 'CONTAINER_40' && L[1]?.destinationCity === 'الدمام' && L[1]?.price === 5800);
  ok('leg 3 = LARGE_FLATBED → أبها @ 6000', L[2]?.requiredTruckType === 'LARGE_FLATBED' && L[2]?.destinationCity === 'أبها' && L[2]?.price === 6000);

  const homo = unwrap((await j('POST', '/orders', client.token, { ...base, legs: undefined, truckCount: 2 })).data);
  const homoLegs = unwrap((await j('GET', `/orders/${homo.id}/legs`, client.token)).data);
  ok('homogeneous order: heterogeneous=false, legs share order values',
    homoLegs?.heterogeneous === false && homoLegs?.legs?.length === 2
    && homoLegs.legs[0].requiredTruckType === 'REFRIGERATED' && homoLegs.legs[0].destinationCity === 'جدة');

  for (const id of [order.id, homo.id]) await j('POST', `/orders/${id}/cancel`, client.token, { reason: 'e2e' });
  note('cleaned up');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });
