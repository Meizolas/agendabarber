import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function load(file, mocks = {}) {
  const filename = path.resolve(file)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const compiledModule = { exports: {} }
  const resolve = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks)
    return require(name)
  }
  new Function('require', 'module', 'exports', source)(resolve, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

async function main() {
  const security = load('src/lib/security/request.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  })
  const previousNodeEnv = process.env.NODE_ENV
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originRequest = (url, origin) => ({ nextUrl: new URL(url), headers: new Headers({ origin }) })
  try {
    process.env.NEXT_PUBLIC_APP_URL = 'https://agendbarber.vercel.app'
    process.env.NODE_ENV = 'development'
    assert.equal(security.isOfficialOrigin(originRequest('http://localhost:3000/api/auth/login', 'http://localhost:3000')), true)
    assert.equal(security.isOfficialOrigin(originRequest('http://127.0.0.1:3000/api/auth/login', 'http://127.0.0.1:3000')), true)
    assert.equal(security.isOfficialOrigin(originRequest('http://localhost:3000/api/auth/login', 'http://localhost:3001')), false)
    assert.equal(security.isOfficialOrigin(originRequest('http://localhost:3000/api/auth/login', 'https://foreign.test')), false)
    assert.equal(security.isOfficialOrigin(originRequest('http://localhost:3000/api/auth/login', 'invalid')), false)
    process.env.NODE_ENV = 'production'
    assert.equal(security.isOfficialOrigin(originRequest('http://localhost:3000/api/auth/login', 'http://localhost:3000')), false)
    assert.equal(security.isOfficialOrigin(originRequest('https://agendbarber.vercel.app/api/auth/login', 'https://agendbarber.vercel.app')), true)
    assert.equal(security.isOfficialOrigin(originRequest('https://agendbarber.vercel.app/api/auth/login', 'https://foreign.test')), false)
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
  }
  console.log('PASS: origem local em desenvolvimento, rejeição de origem/porta diferente e restrição de produção')

  const { blockTimeSchema, blockTimesBatchSchema, calendarDateSchema } = load('src/lib/validations/availability.ts')
  assert.equal(blockTimeSchema.safeParse({ blocked_date: '2028-02-29', blocked_time: null, reason: null }).success, true)
  assert.equal(blockTimeSchema.safeParse({ blocked_date: '2028-02-29', blocked_time: '' }).success, true)
  assert.equal(blockTimeSchema.safeParse({ blocked_date: '2028-02-29', blocked_time: '25:00' }).success, false)
  for (const date of ['2027-02-29', '2028-02-30', '2028-13-01', 'invalid']) assert.equal(calendarDateSchema.safeParse(date).success, false)
  const batchParsed = blockTimesBatchSchema.parse({ blocked_date: '2028-02-29', blocked_times: ['10:30', '09:00', '10:30'], reason: ' Compromisso ' })
  assert.deepEqual(batchParsed.blocked_times, ['09:00', '10:30'])
  assert.equal(batchParsed.reason, 'Compromisso')
  assert.equal(blockTimesBatchSchema.safeParse({ blocked_date: '2028-02-29', blocked_times: [] }).success, false)
  assert.equal(blockTimesBatchSchema.safeParse({ blocked_date: '2028-02-29', blocked_times: ['25:00'] }).success, false)

  let user = { id: 'owner' }
  let existing = []
  let rpcError = null
  const calls = []
  const admin = { from(table) {
    const call = { table, filters: [], action: 'select' }
    calls.push(call)
    const query = {
      select() { return this }, order() { return this }, limit() { return this },
      eq(key, value) { call.filters.push([key, value]); return this },
      is(key, value) { call.filters.push([key, value]); return this },
      in(key, value) { call.filters.push([key, value]); return this },
      insert(value) { call.action = 'insert'; call.value = value; return this },
      delete() { call.action = 'delete'; return this },
      maybeSingle() { return Promise.resolve({ data: { id: 'shop' }, error: null }) },
      single() { return Promise.resolve({ data: { id: 'block', ...call.value }, error: null }) },
      then(resolve) { return Promise.resolve({ data: existing, error: null }).then(resolve) },
    }
    return query
  }, rpc(name, args) {
    calls.push({ action: 'rpc', name, args })
    if (rpcError) return Promise.resolve({ data: null, error: rpcError })
    return Promise.resolve({
      data: args.p_blocked_times?.map((time, index) => ({ id: `batch-${index}`, barber_id: args.p_barber_id, blocked_date: args.p_blocked_date, blocked_time: time, reason: args.p_reason })) ?? [],
      error: null,
    })
  } }
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/supabase/server': { createServiceClient: () => admin },
    '@/lib/auth/session': { getCurrentUser: async () => user },
    '@/lib/security/request': { isTrustedMutationRequest: (request) => request.headers.get('origin') !== 'https://foreign.test' },
    '@/lib/utils/timezone': { getSaoPauloDate: () => '2026-09-18', getSaoPauloParts: () => ({ hour: '12', minute: '00' }) },
  }
  const route = load('src/app/api/blocked-times/route.ts', mocks)
  const request = (url, method = 'GET', body, headers = {}) => {
    const value = new Request(`https://app.test${url}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    value.nextUrl = new URL(value.url)
    return value
  }
  user = null
  assert.equal((await route.POST(request('/api/blocked-times', 'POST', {}))).status, 401)
  user = { id: 'owner' }
  assert.equal((await route.POST(request('/api/blocked-times', 'POST', {}, { origin: 'https://foreign.test' }))).status, 403)
  assert.equal((await route.POST(request('/api/blocked-times', 'POST', { blocked_date: '2026-09-17' }))).status, 400)
  const created = await route.POST(request('/api/blocked-times', 'POST', { blocked_date: '2026-09-25', blocked_time: null }))
  assert.equal(created.status, 201)
  assert.equal((await created.json()).blocked.blocked_time, null)
  assert.equal(calls.find((call) => call.action === 'insert').value.barber_id, 'shop')
  const batchResponse = await route.POST(request('/api/blocked-times', 'POST', { blocked_date: '2026-09-25', blocked_times: ['15:00', '14:00', '15:00'], reason: 'Pessoal' }))
  assert.equal(batchResponse.status, 201)
  assert.deepEqual((await batchResponse.json()).blocked.map((block) => block.blocked_time), ['14:00', '15:00'])
  const batchCall = calls.find((call) => call.action === 'rpc' && call.name === 'block_barber_times')
  assert.equal(batchCall.args.p_barber_id, 'shop')
  assert.deepEqual(batchCall.args.p_blocked_times, ['14:00', '15:00'])
  assert.equal((await route.POST(request('/api/blocked-times', 'POST', { blocked_date: '2026-09-18', blocked_times: ['11:59'] }))).status, 400)
  rpcError = { code: 'PGRST202' }
  existing = [{ id: 'existing-slot', blocked_time: '14:00:00' }]
  const fallbackResponse = await route.POST(request('/api/blocked-times', 'POST', { blocked_date: '2026-09-26', blocked_times: ['14:00', '15:00'] }))
  assert.equal(fallbackResponse.status, 201)
  const fallbackInsert = [...calls].reverse().find((call) => call.action === 'insert')
  assert.deepEqual(fallbackInsert.value.map((item) => item.blocked_time), ['15:00'])
  rpcError = null
  existing = [{ id: 'existing', blocked_time: null }]
  const inserts = calls.filter((call) => call.action === 'insert').length
  assert.equal((await route.POST(request('/api/blocked-times', 'POST', { blocked_date: '2026-09-25' }))).status, 200)
  assert.equal(calls.filter((call) => call.action === 'insert').length, inserts)
  assert.equal((await route.DELETE(request('/api/blocked-times?date=2026-09-25', 'DELETE'))).status, 200)
  assert.deepEqual(calls.at(-1).filters, [['barber_id', 'shop'], ['blocked_date', '2026-09-25'], ['blocked_time', null]])
  assert.equal((await route.GET(request('/api/blocked-times?date=2026-09-25'))).status, 200)
  assert.deepEqual(calls.at(-1).filters, [['barber_id', 'shop'], ['blocked_date', '2026-09-25']])
  const migration = fs.readFileSync('supabase/migrations/202610200001_blocked_times_batch.sql', 'utf8')
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /where not exists/)
  assert.match(migration, /grant execute .* to service_role/)
  assert.doesNotMatch(migration, /grant execute .* (anon|authenticated)/)
  console.log('PASS: datas, bloqueio integral/em lote, deduplicação, fallback, horário passado, autorização e liberação seletiva')

  const { isSpecialAppointment } = load('src/lib/appointments/special.ts')
  for (const name of ['Hélio Nunes', 'HELIO NUNES', '  Hélio   Nunes  ']) {
    for (const phone of ['77988197912', '(77) 98819-7912', '+55 (77) 98819-7912']) {
      assert.equal(isSpecialAppointment({ client_name: name, client_whatsapp: phone }), true)
    }
  }
  for (const [name, phone] of [['Hélio Nunes', '77988197913'], ['Outro Cliente', '77988197912'], ['Hélio Nunes Junior', '77988197912'], ['Hélio Nunes', '177988197912']]) {
    assert.equal(isSpecialAppointment({ client_name: name, client_whatsapp: phone }), false)
  }
  const sound = load('src/lib/appointments/special-sound.ts')
  let oscillators = 0
  global.window = { AudioContext: class {
    state = 'suspended'
    currentTime = 0
    destination = {}
    async resume() { this.state = 'running' }
    createOscillator() { oscillators++; return { frequency: {}, connect() {}, start() {}, stop() {} } }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }
  } }
  await sound.playSpecialSound()
  assert.equal(oscillators, 0)
  await sound.prepareSpecialSound()
  assert.equal(oscillators, 0)
  await sound.playSpecialSound()
  assert.equal(oscillators, 4)
  await sound.prepareSpecialSound()
  assert.equal(oscillators, 4)
  await sound.playSpecialSound()
  assert.equal(oscillators, 8)
  global.window = {}
  const unsupportedSound = load('src/lib/appointments/special-sound.ts')
  await unsupportedSound.prepareSpecialSound()
  await unsupportedSound.playSpecialSound()
  assert.equal(oscillators, 8)
  delete global.window
  console.log('PASS: identificação conjunta por nome/telefone, preparação silenciosa do áudio e navegador sem suporte')

  const { serviceSchema } = load('src/lib/validations/service.ts')
  for (const image of [undefined, null, '']) {
    const result = serviceSchema.safeParse({ name: 'Corte', price: '35,50', duration_minutes: 30, image_url: image })
    assert.equal(result.success, true)
    assert.equal(result.data.image_url, null)
    assert.equal(result.data.price, 35.5)
  }
  assert.equal(serviceSchema.safeParse({ name: 'Corte', price: 35, duration_minutes: 30, image_url: 'invalid' }).success, false)
  const serviceRoute = load('src/app/api/services/route.ts', mocks)
  const createdService = await serviceRoute.POST(request('/api/services', 'POST', { name: 'Corte', price: 35, duration_minutes: 30, image_url: null }))
  assert.equal(createdService.status, 201)
  assert.equal((await createdService.json()).service.image_url, null)
  assert.equal(calls.at(-1).value.barber_id, 'shop')
  admin.from = ((original) => (table) => {
    const query = original(table)
    query.update = (value) => { calls.at(-1).value = value; return query }
    return query
  })(admin.from)
  const serviceById = load('src/app/api/services/[id]/route.ts', mocks)
  const updatedService = await serviceById.PUT(request('/api/services/service', 'PUT', { name: 'Corte', price: 35, duration_minutes: 30, image_url: null }), { params: Promise.resolve({ id: 'service' }) })
  assert.equal(updatedService.status, 200)
  assert.equal((await updatedService.json()).service.image_url, null)
  assert.deepEqual(calls.at(-1).filters, [['id', 'service'], ['barber_id', 'shop']])
  console.log('PASS: foto opcional no schema, criação sem foto e remoção na API de edição')

  let dayBlocks = [{ blocked_time: null }]
  const slotAdmin = { from(table) {
    const result = () => ({ error: null, data: table === 'availability_rules'
      ? { start_time: '09:00:00', end_time: '11:00:00', interval_minutes: 30 }
      : table === 'services' ? { duration_minutes: 30 }
        : table === 'blocked_times' ? dayBlocks : table === 'appointments' ? [] : { id: 'shop' } })
    const query = { select() { return this }, eq() { return this }, single() { return Promise.resolve(result()) }, maybeSingle() { return Promise.resolve(result()) }, then(resolve) { return Promise.resolve(result()).then(resolve) } }
    return query
  }, rpc() { return { single: async () => ({ data: null, error: { message: 'BLOCKED_TIME' } }) } } }
  const slotMocks = { ...mocks,
    '@/lib/supabase/server': { createServiceClient: () => slotAdmin },
    '@/lib/billing/access': { getBillingAccessByBarberId: async () => ({ allowed: true }) },
    '@/lib/push/send': { notifyNewAppointment: async () => {} },
    '@/lib/security/request': { ...mocks['@/lib/security/request'], enforceRateLimit: async () => true, requestFingerprint: () => 'test' },
  }
  const slotsRoute = load('src/app/api/available-slots/route.ts', slotMocks)
  const uuid = '00000000-0000-4000-8000-000000000001'
  const slotsRequest = request(`/api/available-slots?barber_id=${uuid}&staff_member_id=${uuid}&service_id=${uuid}&date=2099-09-25`)
  assert.deepEqual((await (await slotsRoute.GET(slotsRequest)).json()).slots, [])
  dayBlocks = [{ blocked_time: '09:00:00' }]
  const freedSlots = (await (await slotsRoute.GET(slotsRequest)).json()).slots
  assert.equal(freedSlots.includes('09:00'), false)
  assert.equal(freedSlots.includes('09:30'), true)
  const appointmentBody = { barber_id: uuid, staff_member_id: uuid, service_id: uuid, client_name: 'Cliente Teste', client_whatsapp: '77999999999', appointment_date: '2099-09-25', appointment_time: '09:30' }
  const publicRoute = load('src/app/api/appointments/route.ts', slotMocks)
  const manualRoute = load('src/app/api/appointments/manual/route.ts', slotMocks)
  assert.equal((await publicRoute.POST(request('/api/appointments', 'POST', appointmentBody))).status, 409)
  assert.equal((await manualRoute.POST(request('/api/appointments/manual', 'POST', appointmentBody))).status, 409)
  console.log('PASS: prévia sem horários em dia congelado, liberação com bloqueio específico e BLOCKED_TIME com 409 nos fluxos público/manual')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
