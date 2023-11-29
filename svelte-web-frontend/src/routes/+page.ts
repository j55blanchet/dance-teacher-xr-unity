// since there's no dynamic data here, we can prerender

import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// it so that it gets served as a static asset in production
export const prerender = true;

export const load: PageLoad = async ({ url, data }) => {
    
    if (data.session) {
        throw redirect(302, '/menu')
    }

    return {
        server_url: data.server_url,
        origin: url.origin,
    }
};