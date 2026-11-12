import { supabase } from '../lib/supabase/client.jsx';

/**
 * Signs up an admin or employee user via the standard Supabase client.
 * Uses ONLY the public anon/publishable key in the browser.
 * User metadata (full_name, department, job_title, phone, role) is passed
 * to supabase.auth.signUp() and handled safely by Supabase auth & PostgreSQL triggers.
 */
export async function signUpAdmin({
  email,
  password,
  fullName,
  role = 'administrator',
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
      },
    },
  });

  if (error) {
    throw error;
  }

  // Update profile extra details if session was established directly (e.g. if email confirmation disabled)
  if (data?.user?.id) {
    try {
      await supabase
        .from('profiles')
        .update({
          department: department || null,
          job_title: jobTitle || null,
          phone: phone || null,
        })
        .eq('id', data.user.id);
    } catch (profileErr) {
      console.warn('Profile update note:', profileErr);
    }
  }

  return data;
}

/**
 * Signs in an admin user using standard client-side credentials.
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
