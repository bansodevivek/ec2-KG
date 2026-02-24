# Vehicle Template Lookup System

## Overview
This system converts user-selected model and variant combinations into a numeric template ID, then sends **ONLY that ID** to the backend API.

## Architecture

### 1. Data Structure (`src/utils/vehicleTemplates.ts`)

All valid model-variant combinations are stored as objects:

```typescript
export interface VehicleTemplate {
  id: number;
  model: string;
  variant: string;
}

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
```

### 2. Lookup Function

**Validates** the combination and returns the ID:

```typescript
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
```

### 3. Helper Functions

```typescript
// Get all available models
getAvailableModels(): string[]

// Get variants for a specific model
getVariantsForModel(model: string): string[]

// Validate without throwing
isValidCombination(model: string, variant: string): boolean
```

## API Integration Example

### Before Submission:
```typescript
// User selects:
model: "E-Luna"
variant: "X3 Pro"

// Frontend validates and converts:
templateId = getTemplateId("E-Luna", "X3 Pro") // Returns 15
```

### API Call:
```typescript
const payload = {
  id: 15,  // ← ONLY the numeric ID is sent
  vin: "KINETIC-ARIS-2025-111",
  vcu_id: "VCU-ID-9988",
  battery_serial_number: "BATT-SN-1122",
  cluster_id: "CLUST-001",
  motor_serial_number: "MOT-77",
  controller_serial_number: "CONT-88",
  charger_serial_number: "CHG-10",
  colour: "Midnight Blue"
};

await registerVehicleEOL(payload);
```

## Implementation in AddVehicle Component

### State Management:
```typescript
const [formData, setFormData] = useState({
  model: '',
  variant: '',
  // ... other fields
});

const [availableVariants, setAvailableVariants] = useState<string[]>([]);
```

### Dynamic Variant Loading:
```typescript
const handleChange = (e) => {
  const { name, value } = e.target;
  
  if (name === 'model') {
    // Update variants when model changes
    const variants = getVariantsForModel(value);
    setAvailableVariants(variants);
    setFormData(prev => ({
      ...prev,
      model: value,
      variant: '' // Reset variant
    }));
  }
};
```

### Form Submission with Validation:
```typescript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate selections
  if (!formData.model || !formData.variant) {
    throw new Error('Please select both vehicle model and variant');
  }
  
  // Convert to ID (throws if invalid)
  let templateId: number;
  try {
    templateId = getTemplateId(formData.model, formData.variant);
  } catch (err: any) {
    throw new Error(`Invalid vehicle configuration: ${err.message}`);
  }
  
  // Send ONLY the ID to backend
  const payload = {
    id: templateId,
    // ... other fields
  };
  
  await registerVehicleEOL(payload);
};
```

## UI Components

### Model Dropdown:
```tsx
<select name="model" value={formData.model} onChange={handleChange} required>
  <option value="">Select Model</option>
  {getAvailableModels().map(model => (
    <option key={model} value={model}>{model}</option>
  ))}
</select>
```

### Variant Dropdown (dependent on model):
```tsx
<select 
  name="variant" 
  value={formData.variant} 
  onChange={handleChange} 
  required
  disabled={!formData.model}
>
  <option value="">
    {formData.model ? 'Select Variant' : 'Select Model First'}
  </option>
  {availableVariants.map(variant => (
    <option key={variant} value={variant}>{variant}</option>
  ))}
</select>
```

## Error Prevention

✅ **Invalid combinations blocked at frontend** - no API call made  
✅ **Dropdown prevents invalid selections** - only valid variants shown per model  
✅ **Validation before API call** - throws error if combination doesn't exist  
✅ **No hardcoded if/else chains** - uses data-driven lookup  
✅ **Backend receives only numeric ID** - no model/variant strings sent  

## Adding New Models/Variants

Simply update the `VEHICLE_TEMPLATES` array:

```typescript
export const VEHICLE_TEMPLATES: VehicleTemplate[] = [
  // ... existing templates
  { id: 17, model: 'NewModel', variant: 'Premium' },
];
```

No code changes needed - the system is fully data-driven!
