import { ProfileCollapsibleSection } from '@/components/profile/profile-collapsible-section';
import { RetirementInputField } from '@/components/retirement/retirement-input-field';
import {
  RETIREMENT_ASSUMPTION_FIELDS,
  type RetirementFieldConfig,
  type RetirementInputs,
  type RetirementInputKey,
} from '@/constants/retirement';
import { normalizeFiniteNumber } from '@/utils/numbers';

type RetirementPlannerInputCardsProps = {
  retirement: RetirementInputs;
  onUpdate: (patch: Partial<RetirementInputs>) => void;
};

export function RetirementPlannerInputCards({
  retirement,
  onUpdate,
}: RetirementPlannerInputCardsProps) {
  const updateField = (key: RetirementInputKey, text: string) => {
    const value = normalizeFiniteNumber(text.replace(/[^0-9.-]/g, ''), 0);
    onUpdate({ [key]: value });
  };

  const fieldValue = (key: RetirementInputKey) => String(retirement[key]);

  const renderSection = (title: string, fields: RetirementFieldConfig[]) => (
    <ProfileCollapsibleSection title={title}>
      {fields.map((field) => (
        <RetirementInputField
          key={field.key}
          field={field}
          value={fieldValue(field.key)}
          onChange={(text) => updateField(field.key, text)}
        />
      ))}
    </ProfileCollapsibleSection>
  );

  return <>{renderSection('Assumptions', RETIREMENT_ASSUMPTION_FIELDS)}</>;
}
