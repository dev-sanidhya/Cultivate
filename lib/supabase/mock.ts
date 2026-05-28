const MISSING_SUPABASE_ERROR = {
  message: "Supabase is not configured locally. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth and data access.",
} as const

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function ok<T>(data: T) {
  return Promise.resolve({ data, error: null })
}

function fail(message = MISSING_SUPABASE_ERROR.message) {
  return Promise.resolve({ data: null, error: { message } })
}

function createChainableResult<T>(data: T) {
  const base: Record<string, unknown> = {
    then(onFulfilled: unknown, onRejected: unknown) {
      return ok(data).then(onFulfilled as never, onRejected as never)
    },
    catch(onRejected: unknown) {
      return ok(data).catch(onRejected as never)
    },
    finally(onFinally: unknown) {
      return ok(data).finally(onFinally as never)
    },
  }

  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target]
      if (prop === Symbol.toStringTag) return "MockSupabaseQuery"
      return (..._args: unknown[]) => createChainableResult(data)
    },
  })
}

function createChannelMock() {
  return {
    on() {
      return this
    },
    subscribe() {
      return this
    },
    unsubscribe() {
      return Promise.resolve("ok")
    },
    send() {
      return Promise.resolve(true)
    },
  }
}

// The mock intentionally stays permissive because app queries use Supabase's fluent API in many shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockSupabaseClient(): any {
  return {
    auth: {
      getUser: () => ok({ user: null }),
      getSession: () => ok({ session: null }),
      signInWithPassword: () => fail(),
      signInWithOtp: () => fail(),
      signUp: () => fail(),
      signOut: () => fail(),
      verifyOtp: () => fail(),
      exchangeCodeForSession: () => fail(),
      resetPasswordForEmail: () => fail(),
      updateUser: () => fail(),
    },
    from() {
      return createChainableResult([])
    },
    rpc() {
      return createChainableResult(null)
    },
    storage: {
      from() {
        return createChainableResult(null)
      },
    },
    channel() {
      return createChannelMock()
    },
    removeChannel() {
      return Promise.resolve()
    },
    removeAllChannels() {
      return Promise.resolve([])
    },
    getChannels() {
      return []
    },
  } as const
}
