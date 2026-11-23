import { supabase } from '../lib/supabase/client.jsx';

/**
 * Signs up an admin or employee user via the standard Supabase client.
 * Account is set to 'pending' status immediately — the user is signed out
 * right after creation so they CANNOT log in until a manager or super admin approves them.
 */
export async function signUpAdmin({
  email,
  password,
  fullName,
  role = 'employee',
  department = '',
  jobTitle = '',
  phone = '',
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        department,
        job_title: jobTitle,
        phone,
        account_status: 'pending',
      },
    },
  });

  if (error) {
    throw error;
  }

  let profileSetupError = null;
  try {
    // When signup returns a session, write and verify the pending profile status.
    // Email-confirmation signups have no session; the database trigger handles those.
    if (data?.user?.id && data.session) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: fullName || null,
          invitation_email: email.trim().toLowerCase(),
          department: department || null,
          job_title: jobTitle || null,
          phone: phone || null,
          account_status: 'pending',
          employment_status: 'probation',
        }, { onConflict: 'id' })
        .select('id, account_status')
        .single();

      if (profileError || profile?.account_status !== 'pending') {
        throw new Error(
          'Your account was created, but its pending approval status could not be saved. Please contact a manager or super admin before trying again.',
        );
      }
    }
  } catch (error) {
    profileSetupError = error;
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (profileSetupError) {
    if (signOutError) console.error('Could not sign out after profile setup failed:', signOutError);
    throw profileSetupError;
  }
  if (signOutError) {
    throw new Error(
      'Your account was created and is pending approval, but sign-out did not complete. Close this page and do not sign in until a manager or super admin approves the account.',
    );
  }

  return data;
}

/**
 * Signs in an admin user using standard client-side credentials.
 * The AuthContext.signIn() will block pending/suspended accounts.
 */
export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}
