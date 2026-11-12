import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client.jsx';

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  roles: [],
  permissions: [],
  isAdmin: false,
  isSuperAdmin: false,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      setRoles([]);
      setPermissions([]);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return;
    }

    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      setProfile(profileData || null);

      // 2. Fetch User Roles
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('role_id, roles(id, name, description)')
        .eq('user_id', currentUser.id);

      const assignedRoles = (userRolesData || [])
        .map((ur) => ur.roles?.name)
        .filter(Boolean);

      setRoles(assignedRoles);

      const superAdminStatus = assignedRoles.includes('super_admin');
      const adminStatus = superAdminStatus || assignedRoles.includes('administrator');

      setIsSuperAdmin(superAdminStatus);
      setIsAdmin(adminStatus);

      // 3. Check permissions if roles exist
      if (assignedRoles.length > 0) {
        const roleIds = (userRolesData || []).map((ur) => ur.role_id).filter(Boolean);
        if (roleIds.length > 0) {
          const { data: permData } = await supabase
            .from('role_permissions')
            .select('permissions(name, module, action)')
            .in('role_id', roleIds);

          const grantedPerms = (permData || [])
            .map((p) => p.permissions?.name)
            .filter(Boolean);

          setPermissions([...new Set(grantedPerms)]);
        }
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('Error fetching user roles/profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!mounted) return;
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchUserData(initSession.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchUserData(currentSession.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setRoles([]);
        setPermissions([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Log to audit_logs
    if (data?.user) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: data.user.id,
          action: 'login',
          entity_type: 'auth',
          description: `User signed in with email: ${email}`,
        });
      } catch (logErr) {
        console.warn('Could not record audit log:', logErr);
      }
    }

    return data;
  };

  const signOut = async () => {
    if (user?.id) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'logout',
          entity_type: 'auth',
          description: `User signed out`,
        });
      } catch (logErr) {
        console.warn('Could not record audit log:', logErr);
      }
    }
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await fetchUserData(data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        permissions,
        isAdmin,
        isSuperAdmin,
        loading,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
