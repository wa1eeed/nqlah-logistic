// Policies & modules: per-group collection enforcement + defaults, client
// override, provider visibility scope, and the visible-carriers endpoint.
import { j, unwrap, listOf, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Policies & modules');
  const { admin, client, carrier: carrierA } = ctx ?? (await context());
  ok('logins', !!admin && !!client.token && !!carrierA.token);

  const clientId = client.user?.companyId;
  const carrierAId = carrierA.user?.companyId;
  const carriers = listOf((await j('GET', '/companies?type=CARRIER&limit=100', admin)).data);
  const carrierB = carriers.find((c) => c.id !== carrierAId);
  ok('fixtures resolved', !!clientId && !!carrierAId && !!carrierB);

  // Carrier group with only carrier A.
  const cg = unwrap((await j('POST', '/policies/carrier-groups', admin, { name: '[e2e] approved providers' })).data);
  await j('PUT', `/policies/carrier-groups/${cg.id}`, admin, { carrierIds: [carrierAId] });

  // Client group: GROUP visibility → cg, COD enforced.
  const pg = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] enforced COD' })).data);
  await j('PUT', `/policies/groups/${pg.id}`, admin, {
    policy: {
      allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
      allowPrepaid: true, allowCOD: true,
      defaultAssignment: 'MARKET', defaultPricing: 'MARKET',
      defaultCollectionMethod: 'COD', enforceCollectionMethod: true,
      visibilityScope: 'GROUP', visibleCarrierGroupId: cg.id,
    },
    clientIds: [clientId],
  });
  const pgRow = listOf((await j('GET', '/policies/groups', admin)).data).find((g) => g.id === pg.id);
  ok('group persisted enforce + COD + GROUP scope',
    pgRow?.policy?.enforceCollectionMethod === true && pgRow?.policy?.defaultCollectionMethod === 'COD'
    && pgRow?.policy?.visibilityScope === 'GROUP' && pgRow?.clientIds?.includes(clientId));

  const mine = unwrap((await j('GET', '/policies/mine', client.token)).data);
  ok('client /policies/mine shows enforced COD', mine?.enforceCollectionMethod === true && mine?.defaultCollectionMethod === 'COD');

  const vis = listOf((await j('GET', '/policies/visible-carriers', client.token)).data);
  ok('visible-carriers returns only grouped carrier A', vis.length === 1 && vis[0].id === carrierAId, vis.map((c) => c.id).join(','));

  const orderBody = {
    cargoType: 'GENERAL', cargoDescription: 'e2e policies', weight: 1000,
    mode: 'OPEN', collectionMethod: 'PREPAID_WALLET',
    originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'a',
    destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'b',
    requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 86400000).toISOString(),
  };
  const order = unwrap((await j('POST', '/orders', client.token, orderBody)).data);
  ok('ENFORCED: collection forced to COD despite PREPAID_WALLET request', order?.collectionMethod === 'COD', order?.collectionMethod);
  await j('POST', `/orders/${order.id}/publish`, client.token);
  const marketA = listOf((await j('GET', '/orders', carrierA.token)).data);
  ok('carrier A (in group) sees the market order', marketA.some((o) => o.id === order.id));

  // Second group: default without enforcement → client may override.
  const pg2 = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] default no-enforce' })).data);
  await j('PUT', `/policies/groups/${pg2.id}`, admin, {
    policy: {
      allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
      allowPrepaid: true, allowCOD: true,
      defaultCollectionMethod: 'PREPAID_WALLET', enforceCollectionMethod: false, visibilityScope: 'ALL',
    },
    clientIds: [clientId], // single-membership moves the client here
  });
  const o2 = unwrap((await j('POST', '/orders', client.token, { ...orderBody, collectionMethod: undefined })).data);
  ok('DEFAULT: omitted collection uses the group default', o2?.collectionMethod === 'PREPAID_WALLET', o2?.collectionMethod);
  const o3 = unwrap((await j('POST', '/orders', client.token, { ...orderBody, collectionMethod: 'COD' })).data);
  ok('OVERRIDE: client can override when not enforced', o3?.collectionMethod === 'COD', o3?.collectionMethod);

  // Cleanup.
  for (const id of [order.id, o2?.id, o3?.id].filter(Boolean)) await j('POST', `/orders/${id}/cancel`, client.token, { reason: 'e2e' });
  await j('POST', '/policies/assign', admin, { clientId, groupId: null });
  await j('DELETE', `/policies/groups/${pg.id}`, admin);
  await j('DELETE', `/policies/groups/${pg2.id}`, admin);
  await j('DELETE', `/policies/carrier-groups/${cg.id}`, admin);
  note('cleaned up test groups + orders');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });
