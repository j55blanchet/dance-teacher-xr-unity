<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

    
    import type { SupabaseClient } from '@supabase/supabase-js';
  
    export let supabaseClient: SupabaseClient
    export let view: 'sign_in' | 'sign_up' | 'forgot_password'
    export let redirectTo = '';
  
    let error = '';
    let message = ''; 
    let loading = false;
    let email = '';
    let password = '';
    let confirmpassword = '';
    
  
    async function submit() {
      error = ''
      message = ''
      loading = true
  
      if (view == 'sign_up') {
        if (confirmpassword !== password) {
          error = 'Passwords do not match'
          loading = false
          return
        }

        const { error: signUpError } = await supabaseClient.auth.signUp({
          email, password
        })
  
        if (signUpError) error = signUpError.message
        await invalidateAll();
      } else if (view == 'sign_in') {
        const signinResult = await supabaseClient.auth.signInWithPassword({
            email, password
        });
  
        if (signinResult.error) {
            error = signinResult.error.message
        } else {
            await invalidateAll();
        }
      } else if (view == 'forgot_password') {

        const { error: forgotPasswordError } = await supabaseClient.auth.resetPasswordForEmail(
            email,
            {
                redirectTo: redirectTo,
            },
        )
  
        if (forgotPasswordError) error = forgotPasswordError.message
        else message = 'Check your email for the password reset link'
      }
  
      loading = false
    }
  </script>
  
  <form on:submit|preventDefault={submit}>

    <h3>
        {#if view === "sign_in"}
            Sign In
        {:else if view === "sign_up"}
            Create Account
        {:else if view === "forgot_password"}
            Password Reset
        {:else}
            {view}
        {/if}
    </h3>

    <label>Email
        <input class="outlined thin" name="email" type="email" bind:value={email}/>
    </label>
    {#if view == 'sign_up' || view == 'sign_in'}
        <label>Password
            <input class="outlined thin" name="password" type="password" bind:value={password}/>
        </label>
    {/if}
    {#if view == 'sign_up'}
    <label>Confirm Password
        <input class="outlined thin" name="confirm_password" type="password" bind:value={confirmpassword}/>
    </label>
    {/if}
    
  
    {#if view == 'sign_up'}
        <button class="button" type="submit" disabled={loading}>Sign up</button>
    {:else if view == 'sign_in'}
        <button class="button" type="submit" disabled={loading}>Sign in</button>
    {:else}
        <button class="button" type="submit" disabled={loading}>Reset Password</button>
        <p>Redirect path: {redirectTo}</p>
    {/if}
  
    <div class="flex flex-col buttons">
        {#if view !== "sign_in"}
        <button class="link" on:click={() => view = "sign_in"}>Sign In</button>
        {/if}
        {#if view !== "sign_up"}
        <button class="link" on:click={() => view = "sign_up"}>Create Account</button>
        {/if}
        {#if view !== "forgot_password"}
        <button class="link" on:click={() => view = "forgot_password"}>Forgot Password</button>
        {/if}
    </div>

    {#if message}
    <p>{message}</p>
    {/if}

    {#if error}
        <p class="text-red">{error}</p>
    {/if}

  </form>
  
  <style>
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .buttons {
        gap: 0.25rem;
    }

    p, h3 {
        margin: 0;
    }
  </style>