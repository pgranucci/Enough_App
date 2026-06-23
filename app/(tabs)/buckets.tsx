import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddBucketButton } from '@/components/buckets/add-bucket-button';
import { CreateBucketModal } from '@/components/buckets/create-bucket-modal';
import { ExpandableBucketCard } from '@/components/buckets/expandable-bucket-card';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getHouseholdAnnualIncome } from '@/constants/profile';
import type { BucketItem } from '@/constants/buckets';

function BucketsContent() {
  const { colors } = useAppTheme();
  const {
    loading,
    bucketEntries,
    addCustomBucket,
    updateCustomBucket,
    removeCustomBucket,
    profile,
    patchExpenses,
    retirement,
    updateRetirement,
  } = useAppData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBucket, setEditingBucket] = useState<BucketItem | null>(null);

  const visibleBuckets = bucketEntries;

  const bucketLabelsById = useMemo(() => {
    const labels: Record<string, string> = {
      emergency: 'Emergency',
      slush: 'Slush',
      retirement: 'Retirement',
    };
    for (const entry of bucketEntries) {
      if (!('children' in entry)) {
        labels[entry.id] = entry.name;
      }
    }
    return labels;
  }, [bucketEntries]);

  const householdGross = useMemo(() => getHouseholdAnnualIncome(profile), [profile]);

  const expenseControls = {
    expenses: profile.expenses,
    accounts: retirement.accounts,
    bucketLabelsById,
    onPatch: patchExpenses,
  };

  const retirementControls = {
    retirement,
    householdGrossAnnual: householdGross,
    onPatch: updateRetirement,
  };

  if (loading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <ScreenHeader title="Buckets" />

          {visibleBuckets.map((entry) => (
            <ExpandableBucketCard
              key={entry.id}
              entry={entry}
              expenseControls={expenseControls}
              retirementControls={retirementControls}
              onRemoveBucket={removeCustomBucket}
              onEditBucket={(bucket) => {
                setEditingBucket(bucket);
                setModalVisible(true);
              }}
            />
          ))}

          <View style={styles.addCustomRow}>
            <AddBucketButton
              onPress={() => {
                setEditingBucket(null);
                setModalVisible(true);
              }}
              iconColor={colors.tint}
            />
          </View>
        </ScrollView>

        <CreateBucketModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingBucket(null);
          }}
          onCreate={addCustomBucket}
          onUpdate={updateCustomBucket}
          editBucket={editingBucket}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

export default function BucketsScreen() {
  return <BucketsContent />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  addCustomRow: {
    alignItems: 'flex-end',
  },
});
