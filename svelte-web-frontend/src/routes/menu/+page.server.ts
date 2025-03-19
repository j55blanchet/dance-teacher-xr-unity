import { redirect } from "@sveltejs/kit"

export const load = async ({ locals: { supabase, session } }) => {
  
    if (!session) {
      redirect(303, '/');
    }

    return {
        session
    }
}