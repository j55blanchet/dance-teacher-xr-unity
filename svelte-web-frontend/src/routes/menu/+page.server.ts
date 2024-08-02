import { redirect } from "@sveltejs/kit"

export const load = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession()
  
    if (!session) {
      redirect(303, '/');
    }

    return {
        session
    }
}