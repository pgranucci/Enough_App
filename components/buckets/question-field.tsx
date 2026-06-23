import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { BucketQuestion } from '@/constants/custom-bucket-templates';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatWholeNumberInput } from '@/utils/format';
import { formatMonthYearInput } from '@/utils/month-year-input';

type QuestionFieldProps = {
  question: BucketQuestion;
  value: string;
  onChange: (value: string) => void;
};

export function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  const { colors } = useAppTheme();
  const inputType = question.inputType ?? (question.id === 'name' ? 'text' : 'number');
  const isMonthYear = inputType === 'monthYear';

  const handleChange = (text: string) => {
    if (isMonthYear) {
      onChange(formatMonthYearInput(text));
      return;
    }
    if (question.suffix === '$') {
      onChange(formatWholeNumberInput(text));
      return;
    }
    onChange(text);
  };

  return (
    <View style={styles.field}>
      <ThemedText type="captionMedium">{question.label}</ThemedText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}>
        {question.suffix === '$' && (
          <ThemedText style={[styles.prefix, { color: colors.textMuted }]}>$</ThemedText>
        )}
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={question.placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType={inputType === 'text' ? 'default' : 'number-pad'}
          autoCapitalize={isMonthYear ? 'none' : inputType === 'text' ? 'sentences' : 'none'}
          style={[styles.input, { color: colors.text }]}
        />
        {question.suffix === '%' && (
          <ThemedText style={[styles.suffix, { color: colors.textMuted }]}>%</ThemedText>
        )}
        {question.suffix &&
          question.suffix !== '$' &&
          question.suffix !== '%' && (
            <ThemedText style={[styles.suffix, { color: colors.textMuted }]}>
              {question.suffix}
            </ThemedText>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  prefix: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  suffix: {
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
});
