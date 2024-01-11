import { json, redirect, type RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent) {

    const session = await event.locals.getSession();

    if (!session) {
        throw redirect(303, "/login");
    }
    throw redirect(303, "/menu");
}