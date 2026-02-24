/**
 * Vehicle Template Mapping System
 * Maps vehicle model and variant combinations to their numeric IDs
 */

export interface VehicleTemplate {
  id: number;
  model: string;
  variant: string;
}

/**
 * All valid vehicle template combinations
 * Source: Backend vehicle_template table
 */
export const VEHICLE_TEMPLATES: VehicleTemplate[] = [
  { id: 4, model: 'E-Zulu', variant: 'Standard' },
  { id: 5, model: 'Flex', variant: 'Standard' },
  { id: 6, model: 'Zoom', variant: 'Standard' },
  { id: 7, model: 'Zoom', variant: 'Big B' },
  { id: 8, model: 'Zing', variant: 'Standard' },
  { id: 9, model: 'Zing', variant: 'Big B' },
  { id: 10, model: 'Zing', variant: 'HSS' },
  { id: 11, model: 'E-Luna', variant: 'X2' },
  { id: 12, model: 'E-Luna', variant: 'X3' },
  { id: 13, model: 'E-Luna', variant: 'X3 Go' },
  { id: 14, model: 'E-Luna', variant: 'X3 Plus' },
  { id: 15, model: 'E-Luna', variant: 'X3 Pro' },
  { id: 16, model: 'E-Luna', variant: 'X3 Prime' },
];

/**
 * Get unique models from the template list
 */
export const getAvailableModels = (): string[] => {
  const models = new Set(VEHICLE_TEMPLATES.map(t => t.model));
  return Array.from(models).sort();
};

/**
 * Get variants available for a specific model
 */
export const getVariantsForModel = (model: string): string[] => {
  return VEHICLE_TEMPLATES
    .filter(t => t.model === model)
    .map(t => t.variant)
    .sort();
};

/**
 * Lookup function: converts model + variant to template ID
 * @throws Error if the combination is invalid
 */
export const getTemplateId = (model: string, variant: string): number => {
  const template = VEHICLE_TEMPLATES.find(
    t => t.model === model && t.variant === variant
  );
  
  if (!template) {
    throw new Error(
      `Invalid model-variant combination: "${model}" - "${variant}". ` +
      `This combination does not exist in the vehicle template database.`
    );
  }
  
  return template.id;
};

/**
 * Validate if a model-variant combination exists
 * @returns true if valid, false otherwise
 */
export const isValidCombination = (model: string, variant: string): boolean => {
  return VEHICLE_TEMPLATES.some(
    t => t.model === model && t.variant === variant
  );
};

/**
 * Get template object by ID
 */
export const getTemplateById = (id: number): VehicleTemplate | undefined => {
  return VEHICLE_TEMPLATES.find(t => t.id === id);
};
