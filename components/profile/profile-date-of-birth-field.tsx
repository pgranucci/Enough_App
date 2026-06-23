import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileInputField } from '@/components/profile/profile-input-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  calculateAgeFromDateOfBirth,
  formatDateOfBirthDisplay,
  isValidDateOfBirth,
  parseDateOfBirthInput,
} from '@/utils/profile-age';

type ProfileDateOfBirthFieldProps = {
  label: string;
  value: string;
  onChange: (isoDateOfBirth: string, derivedAge: number | null) => void;
  placeholder?: string;
  labelType?: 'captionMedium' | 'defaultSemiBold';
  labelInside?: boolean;
  embedded?: boolean;
  showAge?: boolean;
};

export function ProfileDateOfBirthField({
  label,
  value,
  onChange,
  placeholder = 'MM/DD/YYYY',
  labelType = 'captionMedium',
  labelInside = false,
  embedded = false,
  showAge = true,
}: ProfileDateOfBirthFieldProps) {
  const { colors } = useAppTheme();
  const [display, setDisplay] = useState(() => formatDateOfBirthDisplay(value));
  const derivedAge = isValidDateOfBirth(value) ? calculateAgeFromDateOfBirth(value) : null;

  useEffect(() => {
    if (isValidDateOfBirth(value)) {
      setDisplay(formatDateOfBirthDisplay(value));
    }
  }, [value]);

  return (
    <View style={styles.root}>
      <ProfileInputField
        label={label}
        labelType={labelType}
        labelInside={labelInside}
        embedded={embedded}
        value={display}
        supportingText={showAge && labelInside && derivedAge != null ? `Age ${derivedAge}` : undefined}
        trailingIcon={
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
        }
        onChange={(text) => {
          const formatted = formatDateOfBirthDisplay(text);
          setDisplay(formatted);
          const iso = parseDateOfBirthInput(formatted);
          if (iso) {
            onChange(iso, calculateAgeFromDateOfBirth(iso));
          } else if (formatted.replace(/\D/g, '').length === 0) {
            onChange('', null);
          }
        }}
        placeholder={placeholder}
        keyboardType="number-pad"
      />
      {showAge && !labelInside && derivedAge != null ? (
        <ThemedText type="small" style={{ color: colors.textMuted }}>
          Age {derivedAge} today
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.xs,
  },
});
