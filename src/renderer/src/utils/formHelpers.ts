import { FormField } from '@renderer/components/DinamicForm/DynamicForm';

/**
 * Convierte un key en camelCase o snake_case a un label legible
 * Ejemplo: "nombre_usuario" → "Nombre Usuario"
 */
export const toLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1') // Separa camelCase
    .replace(/_/g, ' ') // Reemplaza guiones bajos
    .replace(/^./, (str) => str.toUpperCase()) // Primera letra mayúscula
    .trim();
};

/**
 * Genera campos de formulario dinámicamente basado en un objeto de configuración
 * 
 * @param config - Objeto con los valores iniciales (inferirá tipos automáticamente)
 * @param typeOverrides - Objeto para forzar tipos específicos en ciertos campos
 * @returns Array de FormField para usar en DynamicForm
 * 
 * @example
 * const fields = generateFormFields(
 *   { nombre: '', edad: 0, activo: true },
 *   { edad: 'number', activo: 'checkbox' }
 * );
 */
export const generateFormFields = (
  config: Record<string, any>,
  typeOverrides?: Record<string, 'text' | 'number' | 'checkbox' | 'select' | 'textarea'>
): FormField[] => {
  return Object.entries(config).map(([key, value]) => {
    // Inferir tipo basado en el valor
    let inferredType: FormField['type'];

    if (typeof value === 'boolean') {
      inferredType = 'checkbox';
    } else if (typeof value === 'number') {
      inferredType = 'number';
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      'label' in value[0] &&
      'value' in value[0]
    ) {
      // Detecta arrays de opciones para select
      inferredType = 'select';
    } else if (typeof value === 'string' && value.length > 100) {
      // Strings largos se convierten en textarea
      inferredType = 'textarea';
    } else {
      // Por defecto, text input
      inferredType = 'text';
    }

    // Aplicar override si existe
    const finalType = typeOverrides?.[key] ?? inferredType;

    // Extraer opciones solo si es tipo select
    const options =
      finalType === 'select' && Array.isArray(value)
        ? value.filter(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              'label' in item &&
              'value' in item
          )
        : undefined;

    // Construir el campo
    const formField: FormField = {
      key,
      label: toLabel(key),
      type: finalType,
      value: finalType === 'select' ? undefined : value,
      required: true,
      ...(options && { options }),
    };

    return formField;
  });
};

/**
 * Extrae los valores de un array de FormFields y los convierte en un objeto plano
 * Útil para enviar datos a la API
 * 
 * @example
 * const data = formFieldsToValues(fields);
 * // { nombre: "Juan", edad: 25, activo: true }
 */
export const formFieldsToValues = <T extends { key: string; value: any }>(
  fields: T[]
): Record<string, any> => {
  return fields.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Actualiza un campo específico en un array de FormFields
 * 
 * @example
 * const updated = updateFormField(fields, 'nombre', 'Juan');
 */
export const updateFormField = (
  fields: FormField[],
  key: string,
  value: any
): FormField[] => {
  return fields.map((field) =>
    field.key === key ? { ...field, value } : field
  );
};

/**
 * Valida si todos los campos requeridos tienen valor
 */
export const validateFormFields = (fields: FormField[]): boolean => {
  return fields
    .filter((field) => field.required)
    .every((field) => {
      if (field.type === 'checkbox') return true; // Checkboxes siempre son válidos
      if (field.type === 'number') return field.value !== null && field.value !== undefined;
      return field.value !== '' && field.value !== null && field.value !== undefined;
    });
};

/**
 * Obtiene los errores de validación
 */
export const getFormErrors = (fields: FormField[]): Record<string, string> => {
  const errors: Record<string, string> = {};

  fields
    .filter((field) => field.required)
    .forEach((field) => {
      if (field.type === 'checkbox') return;

      const isEmpty =
        field.value === '' || field.value === null || field.value === undefined;

      if (isEmpty) {
        errors[field.key] = `${field.label} es requerido`;
      }
    });

  return errors;
};