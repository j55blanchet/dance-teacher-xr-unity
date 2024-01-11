// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from '../$types'

export const load: PageServerLoad = async ({ url, locals: { getSession }, depends }) => {
  depends('supabase:auth')
  const session = await getSession()
  
  // if the user is already logged in return them to the account page
  if (session) {
    throw redirect(302, '/menu')
  }

  return { server_url: url.origin, session }
}