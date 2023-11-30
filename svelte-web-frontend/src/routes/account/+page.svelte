<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms'
    import { navbarProps } from "$lib/elements/NavBar.svelte";
    import { onMount } from "svelte";

        
    onMount(() => {
        navbarProps.set({
            collapsed: false,
            pageTitle: "Account",
            back: {
                url: '/menu',
                title: 'Home'
            },
        });
    });

	export let data
	export let form

	let { session, supabase, profile } = data
	$: ({ session, supabase, profile } = data)

	let profileForm: HTMLFormElement
	let loading = false
	let fullName: string = profile?.full_name ?? ''
	let username: string = profile?.username ?? ''
	let avatarUrl: string = profile?.avatar_url ?? ''

    /** @type {import('./$types').SubmitFunction} */    
	const handleSubmit = () => {
		loading = true
		return async () => {
			loading = false
		}
	}

    /** @type {import('./$types').SubmitFunction} */    
	const handleSignOut = () => {
		loading = true
		return async ({ update }) => {
			loading = false
			update()
		}
	}
</script>

<svelte:head>
	<title>Account | DanceTeacher</title>
	<meta name="description" content="Dance Teacher Account Page" />
</svelte:head>	

<div class="accountPage">
    <div class="form-widget">
        <form
            class="form-widget"
            method="post"
            action="?/update"
            use:enhance={handleSubmit}
            bind:this={profileForm}
        >
            <div>
                <label for="email">Email</label>
                <input class="outlined thin text-disabled" id="email" type="text" value={session?.user?.email} disabled />
            </div>

            <div>
                <label for="fullName">Full Name</label>
                <input class="outlined thin" id="fullName" name="fullName" type="text" value={form?.fullName ?? fullName} />
            </div>

            <div>
                <label for="username">Username</label>
                <input class="outlined thin" id="username" name="username" type="text" value={form?.username ?? username} />
            </div>

            <div>
                <input
                    type="submit"
                    class="button block primary"
                    value={loading ? 'Loading...' : 'Update'}
                    disabled={loading}
                />
            </div>
        </form>

        <form method="post" action="?/signout" use:enhance={handleSignOut}>
            <div>
                <button class="button block" disabled={loading}>Sign Out</button>
            </div>
        </form>

        <a href="/updatepassword">Update Password</a>
    </div>
</div>

<style lang="scss">
    .accountPage {
        width: 100%;
        min-height: var(--content_height);
        display: flex;
        flex-flow: column nowrap;
        align-items: center;
        justify-content: center;
    }

    .form-widget {
        display: flex;
        flex-flow: column nowrap;
        gap: 0.5em;
    }

</style>