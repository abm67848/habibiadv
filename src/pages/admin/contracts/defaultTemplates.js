// Reusable Standard Contract Template
// Preserves the official 16-section architecture and annex structure,
// fully in Spanish as required, connected with customizable settings and variables.

import {
  DEFAULT_MAIN_TEMPLATE,
  DEFAULT_DYNAMIC_SECTIONS,
  getSavedContractTemplate,
  getSavedContractHeaderSettings,
  saveContractTemplate,
  saveContractHeaderSettings,
  resetContractTemplateToDefault,
} from './templateEngine.js';

export {
  DEFAULT_MAIN_TEMPLATE,
  DEFAULT_DYNAMIC_SECTIONS,
  getSavedContractTemplate,
  getSavedContractHeaderSettings,
  saveContractTemplate,
  saveContractHeaderSettings,
  resetContractTemplateToDefault,
};

export const DEFAULT_TEMPLATES = [
  DEFAULT_MAIN_TEMPLATE,
  {
    id: 'tpl-spanish-official-16',
    name: 'Contrato Oficial de Viajes Turísticos (16 Cláusulas)',
    code: 'SPANISH_OFFICIAL_16_SECTIONS',
    description: 'Plantilla contractual oficial completa con 16 artículos, encabezado editable, cuenta Santander y anexos organizativos.',
    primary_language: 'es',
    secondary_language: null,
    version: 3,
    is_active: true,
    sections: DEFAULT_DYNAMIC_SECTIONS,
  },
];
