import { json, redirect, type RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent) {

    const session = await event.locals.getSession();

    if (!session) {
        redirect(303, "/login");
    }
    redirect(303, "/menu");
}