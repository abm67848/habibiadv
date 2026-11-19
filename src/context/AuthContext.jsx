import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client.jsx';
import { fetchRolePagePermissions } from '../services/roleAccessService.js';

const AuthContext = createContext(null);

function getAccountStatusError(profile) {
  if (!profile) {
    return 'Login failed: we could not verify your account status. Contact a manager or system administrator.';
  }
  if (profile.deleted_at) {
    return 'Login failed: this account has been deleted. Contact a system administrator if you believe this is an error.';
  }

  const status = String(profile.account_status || '').trim().toLowerCase();
  if (status === 'active') return null;
  if (status === 'pending') {
    return 'Login failed: your account is pending approval. A manager or super admin must approve and activate it before you can sign in.';
  }
  if (status === 'suspended') {
    return 'Login failed: your account is suspended. Contact a manager or system administrator.';
  }
  return `Login failed: your account status is "${status || 'unknown'}". Only active accounts can sign in. Contact a manager or system administrator.`;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePagePermissions, setRolePagePermissions] = useState(null);
  const [rolePagePermissionsError, setRolePagePermissionsError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [accountStatus, setAccountStatus] = useState('unknown');
  const [accountStatusError, setAccountStatusError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshRolePagePermissions = useCallback(async () => {
    try {
      const savedPermissions = await fetchRolePagePermissions();
      setRolePagePermissions(savedPermissions);
      setRolePagePermissionsError(null);
      return savedPermissions;
    } catch (error) {
      console.error('Could not load role page permissions:', error);
      setRolePagePermissions(null);
      setRolePagePermissionsError(error.message || 'Could not load saved role page permissions.');
      return null;
    }
  }, []);

  const fetchUserData = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      setRoles([]);
      setPermissions([]);
      setRolePagePermissions(null);
      setRolePagePermissionsError(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsManager(false);
      setAccountStatus('unknown');
      setAccountStatusError(null);
      return;
    }

    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Could not verify account status:', profileError);
        setAccountStatusError('Could not verify your account status. Check your connection and try again. Your session has been kept.');
        return;
      }

      setAccountStatusError(null);
      const currentStatus = profileData?.deleted_at
        ? 'deleted'
        : String(profileData?.account_status || 'unknown').trim().toLowerCase();
      setAccountStatus(currentStatus);
      setProfile(profileData || null);

      if (getAccountStatusError(profileData)) {
        console.warn(`User ${currentUser.email} has account_status: ${currentStatus}. Signing out.`);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('Could not sign out an inactive account:', signOutError);
        setProfile(null);
        setRoles([]);
        setPermissions([]);
        setRolePagePermissions(null);
        setRolePagePermissionsError(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsManager(false);
        return;
      }

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
      const managerStatus = adminStatus || assignedRoles.includes('manager');

      setIsSuperAdmin(superAdminStatus);
      setIsAdmin(adminStatus);
      setIsManager(managerStatus);

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

      await refreshRolePagePermissions();
    } catch (err) {
      console.error('Error fetching user roles/profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    const handleRolePermissionsUpdated = (event) => {
      if (event.detail && typeof event.detail === 'object') {
        setRolePagePermissions(event.detail);
        setRolePagePermissionsError(null);
      }
    };
    window.addEventListener('role-permissions-updated', handleRolePermissionsUpdated);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_UP') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setPermissions([]);
        setRolePagePermissions(null);
        setRolePagePermissionsError(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsManager(false);
        setAccountStatus('unknown');
        setAccountStatusError(null);
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        if (event === 'SIGNED_IN') {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
          setRolePagePermissions(null);
          setRolePagePermissionsError(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsManager(false);
          setAccountStatus('unknown');
          setAccountStatusError(null);
          setLoading(false);
          return;
        }

        const currentUser = currentSession.user;
        window.setTimeout(() => {
          if (!mounted) return;
          fetchUserData(currentUser).finally(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setPermissions([]);
        setRolePagePermissions(null);
        setRolePagePermissionsError(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsManager(false);
        setAccountStatus('unknown');
        setAccountStatusError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener('role-permissions-updated', handleRolePermissionsUpdated);
      subscription.unsubscribe();
    };
  }, [refreshRolePagePermissions]);

  useEffect(() => {
    if (!user?.id || accountStatus !== 'active') return undefined;

    const refresh = () => {
      refreshRolePagePermissions();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const channel = supabase
      .channel(`role-page-permissions-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_page_permissions' }, refresh)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime role permission updates unavailable:', status);
        }
      });

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user?.id, accountStatus, refreshRolePagePermissions]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data?.user) {
      // Check user profile account_status before proceeding
      const { data: prof, error: profileError } = await supabase
        .from('profiles')
        .select('account_status, deleted_at')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('Could not sign out an unverified account:', signOutError);
        throw new Error('We could not verify your account status. Please try again or contact a system administrator.');
      }

      const accountStatusError = getAccountStatusError(prof);
      if (accountStatusError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('Could not sign out an inactive account:', signOutError);
        throw new Error(accountStatusError);
      }

      // Log to audit_logs
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
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setAccountStatusError('Could not verify your account status. Check your connection and try again. Your session has been kept.');
      throw error;
    }
    if (!data?.user) throw new Error('No signed-in user is available to verify.');
    await fetchUserData(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        permissions,
        rolePagePermissions,
        rolePagePermissionsError,
        refreshRolePagePermissions,
        isAdmin,
        isSuperAdmin,
        isManager,
        canManageTeam: isManager,
        accountStatus,
        accountStatusError,
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
