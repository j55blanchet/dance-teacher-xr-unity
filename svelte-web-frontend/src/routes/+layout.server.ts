// src/routes/+layout.server.ts


// Make the session object available to the client
export const load = async ({ locals: { getSession } }) => {
    return {
        session: await getSession(),
    }
}