// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url, locals: { getSession }, depends }) => {
  const session = await getSession()
  depends('supabase:auth')

  // if the user is already logged in return them to the account page
  if (session) {
    throw redirect(303, '/menu')
  }

  return { url: url.origin, session }
}