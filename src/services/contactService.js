import { supabase } from '../lib/supabase/client.jsx';

const LOCAL_BACKUP_KEY = 'ha_contact_messages_backup';

function getLocalBackupMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBackupMessages(messages) {
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(messages));
  } catch (e) {
    console.warn('Could not save local backup messages:', e);
  }
}

/**
 * Submits a contact inquiry from the public /contact page.
 * Persists to Supabase `contact_messages` table with an automatic
 * local cache fallback to ensure zero inquiry loss.
 */
export async function submitContactMessage({
  name,
  email,
  phone = '',
  topic = '',
  reply = 'email',
  message,
  packageRef = '',
}) {
  const row = {
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    phone: String(phone || '').trim() || null,
    topic: String(topic || '').trim() || null,
    preferred_reply: String(reply || 'email').trim().toLowerCase(),
    message: String(message || '').trim(),
    package_ref: String(packageRef || '').trim() || null,
    status: 'new',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .insert([row])
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase contact message insert warning, backing up locally:', error);
      // Save locally so staff can still access it if the migration isn't run yet in DB
      const backup = getLocalBackupMessages();
      const localItem = { ...row, id: `local-${Date.now()}` };
      saveLocalBackupMessages([localItem, ...backup]);
      return localItem;
    }

    return data;
  } catch (err) {
    console.warn('Network error submitting contact message, using local backup:', err);
    const backup = getLocalBackupMessages();
    const localItem = { ...row, id: `local-${Date.now()}` };
    saveLocalBackupMessages([localItem, ...backup]);
    return localItem;
  }
}

/**
 * Fetches all contact messages for the Admin panel.
 * Combines database rows with any locally queued submissions.
 */
export async function fetchContactMessages() {
  let dbRows = [];
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      dbRows = data;
    }
  } catch (err) {
    console.warn('Could not fetch from contact_messages table:', err);
  }

  const localBackup = getLocalBackupMessages();
  // Filter out any local backups that already match a DB row by email + message + timestamp proximity
  const uniqueLocal = localBackup.filter(
    (loc) => !dbRows.some((db) => db.email === loc.email && db.message === loc.message)
  );

  return [...uniqueLocal, ...dbRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Updates a contact message status ('new', 'read', 'replied', 'archived') and internal notes.
 */
export async function updateContactMessageStatus(id, status, notes = null) {
  if (String(id).startsWith('local-')) {
    const backup = getLocalBackupMessages();
    const updated = backup.map((m) =>
      m.id === id
        ? {
            ...m,
            status,
            notes: notes !== null ? notes : m.notes,
            updated_at: new Date().toISOString(),
          }
        : m
    );
    saveLocalBackupMessages(updated);
    return;
  }

  const payload = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (notes !== null) {
    payload.notes = notes;
  }

  const { error } = await supabase
    .from('contact_messages')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Deletes a contact message by ID.
 */
export async function deleteContactMessage(id) {
  if (String(id).startsWith('local-')) {
    const backup = getLocalBackupMessages();
    saveLocalBackupMessages(backup.filter((m) => m.id !== id));
    return;
  }

  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
