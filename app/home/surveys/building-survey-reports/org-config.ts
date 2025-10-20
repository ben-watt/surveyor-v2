/**
 * Organization configuration for report branding
 * 
 * This configuration contains organization-specific details used in reports.
 * Currently hard-coded, but designed to be easily migrated to database/tenant
 * configuration in future phases when multi-tenant support is added.
 * 
 * @see Phase 7 in building-survey-report-refactoring-plan.md for multi-tenant migration
 */

export interface OrganizationAddress {
  suite?: string;
  building: string;
  street?: string;
  city: string;
  postcode: string;
}

export interface OrganizationContact {
  email: string;
  phone?: string;
  website?: string;
}

export interface OrganizationBranding {
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Complete organization configuration structure
 */
export interface OrganizationConfig {
  /** Short name for the organization */
  name: string;
  /** Full legal name */
  legalName: string;
  /** Physical address details */
  address: OrganizationAddress;
  /** Contact information */
  contact: OrganizationContact;
  /** Branding and visual identity */
  branding: OrganizationBranding;
}

/**
 * Default organization configuration (Clarke & Watt Building Consultancy)
 * 
 * TODO: Move to database when implementing multi-tenant support
 */
export const DEFAULT_ORG_CONFIG: OrganizationConfig = {
  name: 'Clarke & Watt Building Consultancy',
  legalName: 'Clarke & Watt Building Consultancy Ltd',
  address: {
    suite: 'Suite D',
    building: 'The Towers',
    street: 'Towers Business Park, Wilmslow Road',
    city: 'Manchester',
    postcode: 'M20 2RY',
  },
  contact: {
    email: 'admin@cwbc.co.uk',
  },
  branding: {},
};

/**
 * Format organization address as an array of strings for display
 * Filters out undefined/null values to handle optional fields
 * 
 * @param config - Organization configuration
 * @returns Array of address lines, ready for rendering
 * 
 * @example
 * const lines = formatOrgAddress(DEFAULT_ORG_CONFIG);
 * lines.forEach(line => <p>{line}</p>);
 */
export const formatOrgAddress = (config: OrganizationConfig): string[] => {
  const { address } = config;
  return [
    address.suite,
    address.building,
    address.street,
    address.city,
    address.postcode,
  ].filter((line): line is string => Boolean(line));
};

/**
 * Format full organization details as an array of strings
 * Includes name and address, useful for letterheads
 * 
 * @param config - Organization configuration
 * @returns Array of all organization detail lines
 * 
 * @example
 * const lines = formatOrgDetails(DEFAULT_ORG_CONFIG);
 * // ['Clarke & Watt Building Consultancy Ltd', 'Suite D', 'The Towers', ...]
 */
export const formatOrgDetails = (config: OrganizationConfig): string[] => {
  return [config.legalName, ...formatOrgAddress(config)];
};

/**
 * Get organization contact line (email format)
 * 
 * @param config - Organization configuration
 * @returns Formatted email contact string
 */
export const getOrgContactEmail = (config: OrganizationConfig): string => {
  return `Email: ${config.contact.email}`;
};

/**
 * Validate organization configuration
 * Ensures all required fields are present
 * 
 * @param config - Organization configuration to validate
 * @returns Object with valid flag and any error messages
 */
export const validateOrgConfig = (
  config: Partial<OrganizationConfig>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.name) errors.push('Organization name is required');
  if (!config.legalName) errors.push('Legal name is required');
  if (!config.address?.building) errors.push('Building address is required');
  if (!config.address?.city) errors.push('City is required');
  if (!config.address?.postcode) errors.push('Postcode is required');
  if (!config.contact?.email) errors.push('Contact email is required');

  // Validate email format
  if (config.contact?.email && !isValidEmail(config.contact.email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Simple email validation
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

