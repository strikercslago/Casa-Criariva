import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

type AppRole = 'owner' | 'admin' | 'teacher'
type Action = 'list' | 'invite' | 'set-role' | 'deactivate'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function assertRole(value: unknown): AppRole {
  if (value === 'owner' || value === 'admin' || value === 'teacher') {
    return value
  }

  throw new Error('Invalid role.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Admin users function is not configured.' }, 500)
  }

  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized.' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const { data: ownerCheck, error: ownerError } = await userClient.rpc('current_user_is_owner')
  const { data: callerData, error: callerError } = await userClient.auth.getUser()

  if (ownerError || callerError || ownerCheck !== true || !callerData.user) {
    return json({ error: 'Forbidden.' }, 403)
  }

  const actorUserId = callerData.user.id

  try {
    const body = await request.json()
    const action = body.action as Action

    if (action === 'list') {
      const { data: authUsers, error: usersError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (usersError) {
        throw usersError
      }

      const userIds = authUsers.users.map((user) => user.id)
      const { data: profiles, error: profilesError } = await serviceClient
        .from('profiles')
        .select('id, full_name, is_active')
        .in('id', userIds)

      if (profilesError) {
        throw profilesError
      }

      const { data: roleRows, error: rolesError } = await serviceClient
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)

      if (rolesError) {
        throw rolesError
      }

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
      const rolesById = new Map<string, AppRole[]>()

      for (const row of roleRows ?? []) {
        const current = rolesById.get(row.user_id) ?? []
        current.push(row.role as AppRole)
        rolesById.set(row.user_id, current)
      }

      return json({
        users: authUsers.users.map((user) => {
          const profile = profileById.get(user.id)

          return {
            created_at: user.created_at ?? null,
            email: user.email ?? '',
            full_name: profile?.full_name ?? '',
            id: user.id,
            is_active: profile?.is_active ?? false,
            last_sign_in_at: user.last_sign_in_at ?? null,
            roles: rolesById.get(user.id) ?? [],
          }
        }),
      })
    }

    if (action === 'invite') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const fullName = String(body.fullName ?? '').trim()
      const role = assertRole(body.role)

      if (!email || !fullName) {
        return json({ error: 'Name and email are required.' }, 400)
      }

      const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      })

      if (inviteError) {
        throw inviteError
      }

      const userId = invited.user.id
      const { error: profileError } = await serviceClient.from('profiles').upsert({
        full_name: fullName,
        id: userId,
        is_active: true,
      })

      if (profileError) {
        throw profileError
      }

      await serviceClient.from('user_roles').delete().eq('user_id', userId)
      const { error: roleError } = await serviceClient.from('user_roles').insert({
        role,
        user_id: userId,
      })

      if (roleError) {
        throw roleError
      }

      await serviceClient.from('audit_events').insert({
        actor_user_id: actorUserId,
        action: 'user.invited',
        entity_id: userId,
        entity_type: 'user',
        metadata: { role, summary: `Usuario ${email} convidado` },
      })

      return json({
        user: {
          created_at: invited.user.created_at ?? null,
          email,
          full_name: fullName,
          id: userId,
          is_active: true,
          last_sign_in_at: invited.user.last_sign_in_at ?? null,
          roles: [role],
        },
      })
    }

    if (action === 'set-role') {
      const userId = String(body.userId ?? '')
      const role = assertRole(body.role)

      if (!userId) {
        return json({ error: 'User id is required.' }, 400)
      }

      await serviceClient.from('user_roles').delete().eq('user_id', userId)
      const { error: roleError } = await serviceClient.from('user_roles').insert({
        role,
        user_id: userId,
      })

      if (roleError) {
        throw roleError
      }

      await serviceClient.from('audit_events').insert({
        actor_user_id: actorUserId,
        action: 'user.role_changed',
        entity_id: userId,
        entity_type: 'user',
        metadata: { role, summary: 'Papel administrativo alterado' },
      })

      return json({ user: { id: userId, roles: [role] } })
    }

    if (action === 'deactivate') {
      const userId = String(body.userId ?? '')

      if (!userId) {
        return json({ error: 'User id is required.' }, 400)
      }

      const { error: profileError } = await serviceClient
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)

      if (profileError) {
        throw profileError
      }

      const { error: banError } = await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
      })

      if (banError) {
        throw banError
      }

      await serviceClient.from('audit_events').insert({
        actor_user_id: actorUserId,
        action: 'user.deactivated',
        entity_id: userId,
        entity_type: 'user',
        metadata: { summary: 'Usuario desativado' },
      })

      return json({ user: { id: userId, is_active: false } })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Admin users operation failed.',
      },
      400,
    )
  }
})
