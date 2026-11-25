import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchPublicSiteContent, savePublicPageContent } from '@/services/publicSiteContent.js';

// Default agency invoice settings
export const DEFAULT_INVOICE_SETTINGS = {
  brand: 'Habibi Adventure',
  tagline: 'TRAVEL & TOURS AGENCY',
  companyName: 'Habibi Adventure',
  addressLine1: '',
  addressLine2: '',
  phone: '',
  email: '',
  website: '',
  taxNumber: '',
  invoicePrefix: 'INV',
  creditNotePrefix: 'CN',
  notes: '',
  footerNote: '',
  vatRate: 0, // VAT rate percentage
};

const LEGACY_SAMPLE_INVOICE_DETAILS = {
  companyName: 'HABIBI ADVENTURE TRAVEL AGENCY SARL',
  addressLine1: '123 Luxury Boulevard, Hivernage',
  addressLine2: 'Marrakech, Morocco',
  phone: '+212 524-001122',
  email: 'contact@habibi-adventure.com',
  website: 'www.habibi-adventure.com',
  taxNumber: 'IF: 45892301 - RC: 98452 - ICE: 002394857000034',
};

function mergeInvoiceSettings(saved = {}) {
  const invoice = { ...DEFAULT_INVOICE_SETTINGS, ...saved };
  Object.entries(LEGACY_SAMPLE_INVOICE_DETAILS).forEach(([key, sampleValue]) => {
    if (invoice[key] === sampleValue) invoice[key] = DEFAULT_INVOICE_SETTINGS[key];
  });
  return invoice;
}

// Available languages in the Admin panel only
export const ADMIN_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇲🇦', dir: 'rtl' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
];

// Available Currencies
export const CURRENCY_LIST = [
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'fr-FR' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', locale: 'ar-SA' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'ar-AE' },
];

// Current active language for standalone helper functions
let currentAdminLanguage = 'en';

export function getAdminLanguage() {
  return currentAdminLanguage;
}

export function translate(text) {
  if (!text) return '';
  const lang = currentAdminLanguage || 'en';
  const dict = ADMIN_TRANSLATIONS[lang] || ADMIN_TRANSLATIONS.en;
  return dict[text] || ADMIN_TRANSLATIONS.en[text] || text;
}

// Translations dictionary for Admin Panel only
export const ADMIN_TRANSLATIONS = {
  en: {
    // Navigation / Groups
    nav_overview: 'OVERVIEW',
    nav_travel: 'TRAVEL',
    nav_management: 'MANAGEMENT',
    nav_finance: 'FINANCE',
    nav_insights: 'INSIGHTS & SYSTEM',
    nav_dashboard: 'Dashboard',
    nav_packages: 'Packages & Services',
    nav_bookings: 'Bookings',
    nav_customers: 'Customers',
    nav_messages: 'Contact Messages',
    nav_suppliers: 'Suppliers',
    nav_contracts: 'Contracts',
    nav_finance_title: 'Finance',
    nav_expenses: 'Expenses',
    nav_payments: 'Payments & Transactions',
    nav_analytics: 'Analytics',
    nav_settings: 'Settings',

    // Topbar
    portal_title: 'Habibi Adventure Portal',
    portal_subtitle: 'Manage bookings, clients, and agency operations',
    live_site: 'Live Site',
    notifications: 'Notifications',
    sign_out: 'Sign Out',
    signed_in_as: 'Signed in as',
    live_badge: 'Live',

    // Settings page
    settings_badge: 'SYSTEM CONFIGURATION',
    settings_title: 'Agency System & Settings',
    settings_subtitle: 'Configure project currency, admin panel language, invoice details, and system security.',
    tab_general: 'General & Currency',
    tab_invoice: 'Invoice Settings',
    tab_language: 'Admin Language',
    tab_security: 'Roles & Security',
    tab_database: 'System State',
    save_changes: 'Save Settings',
    saved_successfully: 'Settings updated successfully!',
    reset_defaults: 'Reset to Defaults',

    // Settings fields - General
    agency_name: 'Agency Name',
    contact_email: 'Official Contact Email',
    default_currency: 'Global Project Currency',
    currency_help: 'This currency will be used across packages, bookings, payments, finances, and public displays.',
    timezone: 'Agency Timezone',

    // Settings fields - Invoice
    inv_brand: 'Brand Display Name',
    inv_tagline: 'Brand Subtitle / Tagline',
    inv_legal_name: 'Company Legal Name',
    inv_address1: 'Address Line 1',
    inv_address2: 'Address Line 2 (City / Country)',
    inv_phone: 'Phone on Invoices',
    inv_email: 'Email on Invoices',
    inv_website: 'Website URL',
    inv_tax_id: 'Tax ID / Legal Registration (ICE / IF)',
    inv_prefix: 'Invoice Number Prefix',
    inv_cn_prefix: 'Credit Note Prefix',
    inv_vat: 'Default VAT Rate (%)',
    inv_footer_note: 'Invoice Footer & Terms Note',
    inv_preview_title: 'Invoice Live Preview',

    // Admin Language tab
    admin_lang_title: 'Admin Panel Language',
    admin_lang_desc: 'Select the operational language used in this administration portal. This setting only applies to the admin dashboard.',
    admin_lang_active: 'Active Admin Language',
    admin_lang_preview: 'Selected language will apply instantly to all admin headers, navigation, and badges.',

    // Common
    save: 'Save Changes',
    loading: 'Loading...',
    status: 'Status',
    date: 'Date',
    amount: 'Amount',
    customer: 'Customer',
    action: 'Action',

    // Roles
    role_super_admin: 'Super Admin',
    role_super_admin_desc: 'Full system access, security management, and role permission administration.',
    role_manager: 'Manager',
    role_manager_desc: 'Full administrative access across operations, teams, bookings, logistics, and settings.',
    role_receptionist: 'Receptionist',
    role_receptionist_desc: 'Front-desk customer care, reservation handling, check-in, and daily client inquiries.',
    role_employee: 'Employee',
    role_employee_desc: 'Operational staff member with role-based access to assigned packages and travel tasks.',
    role_accountant: 'Accountant',
    role_accountant_desc: 'Financial management, customer billing, payment ledgers, invoices, and expenses.',
  },
  fr: {
    nav_overview: 'APERÇU',
    nav_travel: 'VOYAGES',
    nav_management: 'GESTION',
    nav_finance: 'FINANCES',
    nav_insights: 'ANALYSES & SYSTÈME',
    nav_dashboard: 'Tableau de bord',
    nav_packages: 'Packages & Services',
    nav_bookings: 'Réservations',
    nav_customers: 'Clients',
    nav_messages: 'Messages de contact',
    nav_suppliers: 'Fournisseurs',
    nav_contracts: 'Contrats',
    nav_finance_title: 'Finances',
    nav_expenses: 'Dépenses',
    nav_payments: 'Paiements & Factures',
    nav_analytics: 'Statistiques',
    nav_settings: 'Paramètres',

    portal_title: 'Portail Habibi Adventure',
    portal_subtitle: 'Gérer les réservations, clients et opérations de voyage',
    live_site: 'Site Public',
    notifications: 'Notifications',
    sign_out: 'Déconnexion',
    signed_in_as: 'Connecté en tant que',
    live_badge: 'En ligne',

    settings_badge: 'CONFIGURATION SYSTÈME',
    settings_title: 'Paramètres & Configuration de l\'Agence',
    settings_subtitle: 'Configurez la devise globale, la langue du panneau admin, les factures et la sécurité.',
    tab_general: 'Général & Devise',
    tab_invoice: 'Facturation & Devis',
    tab_language: 'Langue de l\'Admin',
    tab_security: 'Rôles & Sécurité',
    tab_database: 'État du Système',
    save_changes: 'Enregistrer les paramètres',
    saved_successfully: 'Paramètres enregistrés avec succès !',
    reset_defaults: 'Rétablir les valeurs par défaut',

    agency_name: 'Nom de l\'agence',
    contact_email: 'Email officiel de contact',
    default_currency: 'Devise globale du projet',
    currency_help: 'Cette devise sera appliquée à travers tous les packages, réservations, paiements et vitrine publique.',
    timezone: 'Fuseau horaire',

    inv_brand: 'Marque affichée',
    inv_tagline: 'Slogan / Sous-titre',
    inv_legal_name: 'Raison sociale légale',
    inv_address1: 'Adresse (Ligne 1)',
    inv_address2: 'Adresse (Ligne 2 - Ville / Pays)',
    inv_phone: 'Téléphone sur la facture',
    inv_email: 'Email de contact facture',
    inv_website: 'Site web de l\'agence',
    inv_tax_id: 'Identifiants fiscaux (ICE / IF / RC)',
    inv_prefix: 'Préfixe de facture',
    inv_cn_prefix: 'Préfixe avoir / remboursement',
    inv_vat: 'Taux de TVA (%)',
    inv_footer_note: 'Note de bas de page et conditions',
    inv_preview_title: 'Aperçu de la Facture',

    admin_lang_title: 'Langue du Panneau d\'Administration',
    admin_lang_desc: 'Choisissez la langue de travail de l\'interface d\'administration. Ce réglage s\'applique uniquement au tableau de bord admin.',
    admin_lang_active: 'Langue active de l\'admin',
    admin_lang_preview: 'La langue sélectionnée s\'applique instantanément à la barre latérale, l\'en-tête et les boutons d\'administration.',

    save: 'Enregistrer',
    loading: 'Chargement...',
    status: 'Statut',
    date: 'Date',
    amount: 'Montant',
    customer: 'Client',
    action: 'Action',

    // Roles
    role_super_admin: 'Super Admin',
    role_super_admin_desc: 'Accès total au système, gestion de la sécurité et administration des permissions.',
    role_manager: 'Manager',
    role_manager_desc: 'Accès administratif complet aux opérations, équipes, réservations, logistique et paramètres.',
    role_receptionist: 'Réceptionniste',
    role_receptionist_desc: 'Accueil clientèle, prise en charge des réservations, enregistrement et demandes quotidiennes.',
    role_employee: 'Employé',
    role_employee_desc: 'Membre opérationnel avec accès aux voyages, forfaits et tâches assignées.',
    role_accountant: 'Comptable',
    role_accountant_desc: 'Gestion financière, facturation client, registres de paiement et dépenses opérationnelles.',
  },
  ar: {
    nav_overview: 'نظرة عامة',
    nav_travel: 'الأسفار والرحلات',
    nav_management: 'إدارة العمليات',
    nav_finance: 'المالية والمحاسبة',
    nav_insights: 'التحليلات والنظام',
    nav_dashboard: 'لوحة التحكم',
    nav_packages: 'الباقات والخدمات',
    nav_bookings: 'الحجوزات',
    nav_customers: 'الزبناء',
    nav_messages: 'رسائل التواصل',
    nav_suppliers: 'الموردون والشركاء',
    nav_contracts: 'العقود والاتفاقيات',
    nav_finance_title: 'المالية',
    nav_expenses: 'المصاريف',
    nav_payments: 'المدفوعات والفواتير',
    nav_analytics: 'الإحصائيات',
    nav_settings: 'الإعدادات',

    portal_title: 'بوابة حبيبي أدفنتشر',
    portal_subtitle: 'إدارة الحجوزات والزبناء والعمليات السياحية',
    live_site: 'الموقع المباشر',
    notifications: 'الإشعارات',
    sign_out: 'تسجيل الخروج',
    signed_in_as: 'مسجل كـ',
    live_badge: 'مباشر',

    settings_badge: 'إعدادات النظام',
    settings_title: 'إعدادات وكالة الأسفار والأمان',
    settings_subtitle: 'التحكم في العملة الرئيسية للمشروع، لغة لوحة التحكم، وإعدادات الفواتير المطبوعة.',
    tab_general: 'عام والعملة',
    tab_invoice: 'إعدادات الفواتير',
    tab_language: 'لغة لوحة التحكم',
    tab_security: 'الأدوار والأمان',
    tab_database: 'حالة النظام',
    save_changes: 'حفظ الإعدادات',
    saved_successfully: 'تم حفظ الإعدادات بنجاح!',
    reset_defaults: 'استعادة الافتراضيات',

    agency_name: 'اسم الوكالة',
    contact_email: 'البريد الإلكتروني الرسمي',
    default_currency: 'العملة الأساسية للمشروع بالكامل',
    currency_help: 'هذه العملة ستستخدم في جميع الباقات، الحجوزات، الدفعات، والصفحات العامة.',
    timezone: 'المنطقة الزمنية',

    inv_brand: 'الاسم التجاري على الفاتورة',
    inv_tagline: 'الشعار التعريفي',
    inv_legal_name: 'الاسم القانوني للشركة',
    inv_address1: 'العنوان السطري 1',
    inv_address2: 'العنوان السطري 2 (المدينة / الدولة)',
    inv_phone: 'رقم الهاتف في الفاتورة',
    inv_email: 'البريد في الفاتورة',
    inv_website: 'الموقع الإلكتروني',
    inv_tax_id: 'المعرف الضريبي (ICE / IF)',
    inv_prefix: 'بادئة ترقيم الفواتير',
    inv_cn_prefix: 'بادئة إشعار الدائن / الاسترجاع',
    inv_vat: 'نسبة الضريبة على القيمة المضافة (%)',
    inv_footer_note: 'ملاحظة أسفل الفاتورة والشروط',
    inv_preview_title: 'معاينة مباشرة للفاتورة',

    admin_lang_title: 'لغة لوحة تحكم الإدارة فقط',
    admin_lang_desc: 'اختر لغة العمل للوحة الإدارة. هذا الإعداد يخص واجهة المشرفين والمدراء فقط دون التأثير على الواجهة العامة للزوار.',
    admin_lang_active: 'اللغة الحالية للوحة',
    admin_lang_preview: 'تطبيق اللغة فوري على القائمة الجانبية وشريط المهام وجميع الأزرار.',

    save: 'حفظ التغييرات',
    loading: 'جاري التحميل...',
    status: 'الحالة',
    date: 'التاريخ',
    amount: 'المبلغ',
    customer: 'الزبون',
    action: 'إجراء',

    // Roles
    role_super_admin: 'المشرف العام (Super Admin)',
    role_super_admin_desc: 'وصول كامل وشامل للنظام وإدارة صلاحيات الأمان وأدوار الفريق.',
    role_manager: 'المدير (Manager)',
    role_manager_desc: 'صلاحيات إدارية شاملة للعمليات والفريق والحجوزات واللوجستيك والإعدادات.',
    role_receptionist: 'موظف الاستقبال (Receptionist)',
    role_receptionist_desc: 'خدمة واستقبال العملاء، إدارة الحجوزات، تسجيل الوصول والاستفسارات اليومية.',
    role_employee: 'موظف (Employee)',
    role_employee_desc: 'عضو تنفيذي في الفريق يتمتع بصلاحيات لإدارة الباقات والمهام المسندة إليه.',
    role_accountant: 'المحاسب (Accountant)',
    role_accountant_desc: 'إدارة المالية والمحاسبة وفواتير العملاء وسجلات الدفع والمصروفات.',
  },
  es: {
    nav_overview: 'RESUMEN',
    nav_travel: 'VIAJES',
    nav_management: 'GESTIÓN',
    nav_finance: 'FINANZAS',
    nav_insights: 'INFORMES Y SISTEMA',
    nav_dashboard: 'Panel Principal',
    nav_packages: 'Paquetes y Servicios',
    nav_bookings: 'Reservas',
    nav_customers: 'Clientes',
    nav_messages: 'Mensajes de contacto',
    nav_suppliers: 'Proveedores',
    nav_contracts: 'Contratos',
    nav_finance_title: 'Finanzas',
    nav_expenses: 'Gastos',
    nav_payments: 'Pagos y Facturas',
    nav_analytics: 'Analítica',
    nav_settings: 'Configuración',

    portal_title: 'Portal Habibi Adventure',
    portal_subtitle: 'Gestione reservas, clientes y operaciones de viaje',
    live_site: 'Sitio Web',
    notifications: 'Notificaciones',
    sign_out: 'Cerrar Sesión',
    signed_in_as: 'Conectado como',
    live_badge: 'En línea',

    settings_badge: 'CONFIGURACIÓN DEL SISTEMA',
    settings_title: 'Configuración General y de Seguridad',
    settings_subtitle: 'Controle la moneda del proyecto, el idioma del panel de administración y las facturas.',
    tab_general: 'General y Moneda',
    tab_invoice: 'Configuración de Factura',
    tab_language: 'Idioma del Admin',
    tab_security: 'Roles y Seguridad',
    tab_database: 'Estado de la Base de Datos',
    save_changes: 'Guardar Configuración',
    saved_successfully: '¡Configuración guardada exitosamente!',
    reset_defaults: 'Restablecer Valores',

    agency_name: 'Nombre de la Agencia',
    contact_email: 'Correo Electrónico de Contacto',
    default_currency: 'Moneda Global del Proyecto',
    currency_help: 'Esta moneda se aplicará en paquetes, reservas, pagos, finanzas y portal público.',
    timezone: 'Zona Horaria',

    inv_brand: 'Nombre de Marca',
    inv_tagline: 'Lema / Subtítulo',
    inv_legal_name: 'Razón Social Legal',
    inv_address1: 'Dirección (Línea 1)',
    inv_address2: 'Dirección (Línea 2 - Ciudad / País)',
    inv_phone: 'Teléfono en Facturas',
    inv_email: 'Correo en Facturas',
    inv_website: 'Sitio Web',
    inv_tax_id: 'Identificación Fiscal (NIF / CIF)',
    inv_prefix: 'Prefijo de Factura',
    inv_cn_prefix: 'Prefijo de Factura Rectificativa',
    inv_vat: 'IVA / Impuesto (%)',
    inv_footer_note: 'Nota al Pie y Términos',
    inv_preview_title: 'Vista Previa de Factura',

    admin_lang_title: 'Idioma del Panel de Administración',
    admin_lang_desc: 'Seleccione el idioma de trabajo del panel administrativo. Aplica únicamente al entorno del administrador.',
    admin_lang_active: 'Idioma Activo de Administración',
    admin_lang_preview: 'El idioma seleccionado se aplicará de inmediato al menú, encabezados y paneles.',

    save: 'Guardar Cambios',
    loading: 'Cargando...',
    status: 'Estado',
    date: 'Fecha',
    amount: 'Importe',
    customer: 'Cliente',
    action: 'Acción',

    // Roles
    role_super_admin: 'Super Admin',
    role_super_admin_desc: 'Acceso total al sistema, gestión de seguridad y administración de permisos de roles.',
    role_manager: 'Manager',
    role_manager_desc: 'Acceso administrativo total a operaciones, equipos, reservas, logística y configuración.',
    role_receptionist: 'Recepcionista',
    role_receptionist_desc: 'Atención al cliente, recepción, gestión de reservas y consultas diarias.',
    role_employee: 'Empleado',
    role_employee_desc: 'Personal operativo con acceso por roles a paquetes y tareas de viaje asignadas.',
    role_accountant: 'Contable',
    role_accountant_desc: 'Gestión financiera, facturación a clientes, cobros, pagos y control de gastos.',
  },
};

const SETTINGS_KEY = 'ha_agency_settings';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [hydratedFromDatabase, setHydratedFromDatabase] = useState(false);

  // Load initial settings from localStorage or fallback
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          agencyName: parsed.agencyName || 'Habibi Adventure',
          contactEmail: parsed.contactEmail || 'habibiadventure.26@gmail.com',
          timezone: parsed.timezone || 'Africa/Casablanca (UTC+1)',
          currency: parsed.currency === 'MAD' ? 'EUR' : (parsed.currency || 'EUR'),
          adminLanguage: parsed.adminLanguage || 'en',
          invoice: mergeInvoiceSettings(parsed.invoice),
        };
      }
    } catch (e) {
      console.warn('Failed to parse settings from storage:', e);
    }

    return {
      agencyName: 'Habibi Adventure',
      contactEmail: 'habibiadventure.26@gmail.com',
      timezone: 'Africa/Casablanca (UTC+1)',
      currency: 'EUR',
      adminLanguage: 'en',
      invoice: { ...DEFAULT_INVOICE_SETTINGS },
    };
  });

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((content) => {
        if (!active || !content?.agencySettings || Object.keys(content.agencySettings).length === 0) return;
        const saved = content.agencySettings;
        setSettings((current) => ({
          ...current,
          agencyName: saved.agencyName || current.agencyName,
          contactEmail: saved.contactEmail || current.contactEmail,
          timezone: saved.timezone || current.timezone,
          currency: saved.currency === 'MAD' ? 'EUR' : (saved.currency || current.currency),
          adminLanguage: saved.adminLanguage || current.adminLanguage,
          invoice: mergeInvoiceSettings(saved.invoice || current.invoice),
        }));
      })
      .catch((error) => {
        console.warn('Could not load agency settings from the database:', error);
      })
      .finally(() => {
        if (active) setHydratedFromDatabase(true);
      });
    return () => { active = false; };
  }, []);

  // Keep browser cache and database synchronized.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      currentAdminLanguage = settings.adminLanguage || 'en';
    } catch (e) {
      console.error('Failed to save settings:', e);
    }

    if (!hydratedFromDatabase) return undefined;
    const timeout = window.setTimeout(() => {
      savePublicPageContent('agencySettings', settings).catch((error) => {
        console.error('Could not save agency settings to the database:', error);
      });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [settings, hydratedFromDatabase]);

  // Update specific section or field
  const updateSettings = (updates) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
      invoice: updates.invoice ? { ...prev.invoice, ...updates.invoice } : prev.invoice,
    }));
  };

  const setCurrency = (currency) => {
    updateSettings({ currency });
  };

  const setAdminLanguage = (adminLanguage) => {
    updateSettings({ adminLanguage });
  };

  const updateInvoiceSettings = (invUpdates) => {
    setSettings((prev) => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        ...invUpdates,
      },
    }));
  };

  const resetSettings = () => {
    const defaults = {
      agencyName: 'Habibi Adventure',
      contactEmail: 'habibiadventure.26@gmail.com',
      timezone: 'Africa/Casablanca (UTC+1)',
      currency: 'EUR',
      adminLanguage: 'en',
      invoice: { ...DEFAULT_INVOICE_SETTINGS },
    };
    setSettings(defaults);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
    } catch (e) {
      console.error('Failed to reset settings:', e);
    }
  };

  // Translation helper for Admin
  const t = (key, fallback = '') => {
    const lang = settings.adminLanguage || 'en';
    const dict = ADMIN_TRANSLATIONS[lang] || ADMIN_TRANSLATIONS.en;
    return dict[key] || ADMIN_TRANSLATIONS.en[key] || fallback || key;
  };

  // Helper for raw string translations generated by codemod
  const translate = (text) => {
    if (!text) return '';
    const lang = settings.adminLanguage || 'en';
    const dict = ADMIN_TRANSLATIONS[lang] || ADMIN_TRANSLATIONS.en;
    return dict[text] || ADMIN_TRANSLATIONS.en[text] || text;
  };

  // Currency Formatter helper based on global project currency
  const formatMoney = (amount, customCurrency) => {
    const code = customCurrency === 'MAD' ? 'EUR' : (customCurrency || settings.currency || 'EUR');
    const num = Number(amount || 0);
    const currMeta = CURRENCY_LIST.find((c) => c.code === code);
    try {
      return new Intl.NumberFormat(currMeta?.locale || 'en-US', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `${code} ${num.toLocaleString()}`;
    }
  };

  const isRtl = settings.adminLanguage === 'ar';

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        currency: settings.currency,
        adminLanguage: settings.adminLanguage,
        invoice: settings.invoice,
        updateSettings,
        setCurrency,
        setAdminLanguage,
        updateInvoiceSettings,
        resetSettings,
        t,
        translate,
        formatMoney,
        isRtl,
      }}
    >
      <div dir={isRtl ? 'rtl' : 'ltr'} className={isRtl ? 'font-arabic' : ''}>
        {children}
      </div>
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
