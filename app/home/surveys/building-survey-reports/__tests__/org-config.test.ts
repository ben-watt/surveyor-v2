import {
  DEFAULT_ORG_CONFIG,
  formatOrgAddress,
  formatOrgDetails,
  getOrgContactEmail,
  validateOrgConfig,
  type OrganizationConfig,
} from '../org-config';

describe('Organization Configuration', () => {
  describe('DEFAULT_ORG_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_ORG_CONFIG.name).toBe('Clarke & Watt Building Consultancy');
      expect(DEFAULT_ORG_CONFIG.legalName).toBe('Clarke & Watt Building Consultancy Ltd');
      expect(DEFAULT_ORG_CONFIG.address).toBeDefined();
      expect(DEFAULT_ORG_CONFIG.contact).toBeDefined();
      expect(DEFAULT_ORG_CONFIG.branding).toBeDefined();
    });

    it('should have complete address details', () => {
      const { address } = DEFAULT_ORG_CONFIG;
      expect(address.suite).toBe('Suite D');
      expect(address.building).toBe('The Towers');
      expect(address.street).toBe('Towers Business Park, Wilmslow Road');
      expect(address.city).toBe('Manchester');
      expect(address.postcode).toBe('M20 2RY');
    });

    it('should have valid contact email', () => {
      expect(DEFAULT_ORG_CONFIG.contact.email).toBe('admin@cwbc.co.uk');
      expect(DEFAULT_ORG_CONFIG.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should be valid according to validation', () => {
      const result = validateOrgConfig(DEFAULT_ORG_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('formatOrgAddress', () => {
    it('should format complete address', () => {
      const lines = formatOrgAddress(DEFAULT_ORG_CONFIG);
      expect(lines).toEqual([
        'Suite D',
        'The Towers',
        'Towers Business Park, Wilmslow Road',
        'Manchester',
        'M20 2RY',
      ]);
    });

    it('should filter out undefined optional fields', () => {
      const configWithoutSuite: OrganizationConfig = {
        ...DEFAULT_ORG_CONFIG,
        address: {
          ...DEFAULT_ORG_CONFIG.address,
          suite: undefined,
        },
      };

      const lines = formatOrgAddress(configWithoutSuite);
      expect(lines).not.toContain(undefined);
      expect(lines).toHaveLength(4); // Without suite
      expect(lines[0]).toBe('The Towers');
    });

    it('should handle minimal address', () => {
      const minimalConfig: OrganizationConfig = {
        name: 'Test Org',
        legalName: 'Test Org Ltd',
        address: {
          building: 'Main Building',
          city: 'London',
          postcode: 'SW1A 1AA',
        },
        contact: { email: 'test@example.com' },
        branding: {},
      };

      const lines = formatOrgAddress(minimalConfig);
      expect(lines).toEqual(['Main Building', 'London', 'SW1A 1AA']);
    });

    it('should return array with at least 3 elements for valid config', () => {
      const lines = formatOrgAddress(DEFAULT_ORG_CONFIG);
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });

    it('should not include empty strings', () => {
      const lines = formatOrgAddress(DEFAULT_ORG_CONFIG);
      lines.forEach(line => {
        expect(line).toBeTruthy();
        expect(line.trim()).not.toBe('');
      });
    });
  });

  describe('formatOrgDetails', () => {
    it('should include legal name as first line', () => {
      const lines = formatOrgDetails(DEFAULT_ORG_CONFIG);
      expect(lines[0]).toBe('Clarke & Watt Building Consultancy Ltd');
    });

    it('should include all address lines after name', () => {
      const lines = formatOrgDetails(DEFAULT_ORG_CONFIG);
      const addressLines = formatOrgAddress(DEFAULT_ORG_CONFIG);

      expect(lines).toHaveLength(addressLines.length + 1);
      expect(lines.slice(1)).toEqual(addressLines);
    });

    it('should return array suitable for rendering', () => {
      const lines = formatOrgDetails(DEFAULT_ORG_CONFIG);

      // Should be able to use in React map
      lines.forEach(line => {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getOrgContactEmail', () => {
    it('should format email with label', () => {
      const result = getOrgContactEmail(DEFAULT_ORG_CONFIG);
      expect(result).toBe('Email: admin@cwbc.co.uk');
    });

    it('should handle different email formats', () => {
      const customConfig: OrganizationConfig = {
        ...DEFAULT_ORG_CONFIG,
        contact: { email: 'contact@example.org' },
      };

      const result = getOrgContactEmail(customConfig);
      expect(result).toBe('Email: contact@example.org');
    });
  });

  describe('validateOrgConfig', () => {
    it('should validate complete config as valid', () => {
      const result = validateOrgConfig(DEFAULT_ORG_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should require organization name', () => {
      const invalidConfig = { ...DEFAULT_ORG_CONFIG, name: '' };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Organization name is required');
    });

    it('should require legal name', () => {
      const invalidConfig = { ...DEFAULT_ORG_CONFIG, legalName: '' };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Legal name is required');
    });

    it('should require building address', () => {
      const invalidConfig = {
        ...DEFAULT_ORG_CONFIG,
        address: { ...DEFAULT_ORG_CONFIG.address, building: '' },
      };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Building address is required');
    });

    it('should require city', () => {
      const invalidConfig = {
        ...DEFAULT_ORG_CONFIG,
        address: { ...DEFAULT_ORG_CONFIG.address, city: '' },
      };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('City is required');
    });

    it('should require postcode', () => {
      const invalidConfig = {
        ...DEFAULT_ORG_CONFIG,
        address: { ...DEFAULT_ORG_CONFIG.address, postcode: '' },
      };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Postcode is required');
    });

    it('should require contact email', () => {
      const invalidConfig = {
        ...DEFAULT_ORG_CONFIG,
        contact: { email: '' },
      };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contact email is required');
    });

    it('should validate email format', () => {
      const invalidConfig = {
        ...DEFAULT_ORG_CONFIG,
        contact: { email: 'invalid-email' },
      };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should collect multiple errors', () => {
      const invalidConfig: Partial<OrganizationConfig> = {
        name: '',
        legalName: '',
      };
      const result = validateOrgConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+tag@company.org',
      ];

      validEmails.forEach(email => {
        const config = {
          ...DEFAULT_ORG_CONFIG,
          contact: { email },
        };
        const result = validateOrgConfig(config);

        expect(result.errors).not.toContain('Invalid email format');
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = ['notanemail', '@domain.com', 'user@', 'user @domain.com'];

      invalidEmails.forEach(email => {
        const config = {
          ...DEFAULT_ORG_CONFIG,
          contact: { email },
        };
        const result = validateOrgConfig(config);

        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields at type level', () => {
      // This is a compile-time test - if it compiles, it passes
      const config: OrganizationConfig = {
        name: 'Test',
        legalName: 'Test Ltd',
        address: {
          building: 'Building',
          city: 'City',
          postcode: 'PC1 1PC',
        },
        contact: {
          email: 'test@test.com',
        },
        branding: {},
      };

      expect(config).toBeDefined();
    });

    it('should allow optional address fields', () => {
      const config: OrganizationConfig = {
        name: 'Test',
        legalName: 'Test Ltd',
        address: {
          building: 'Building',
          city: 'City',
          postcode: 'PC1 1PC',
          // suite and street are optional
        },
        contact: {
          email: 'test@test.com',
          // phone and website are optional
        },
        branding: {
          // all branding fields are optional
        },
      };

      expect(config).toBeDefined();
    });
  });
});

