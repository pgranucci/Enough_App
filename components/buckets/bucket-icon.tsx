import { FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  getTemplateById,
  resolveBucketTemplateId,
} from '@/constants/custom-bucket-templates';

type BucketIconProps = {
  bucketId: string;
  color: string;
  size?: number;
  sourceTemplateId?: string;
  bucketName?: string;
};

export function BucketIcon({
  bucketId,
  color,
  size = 20,
  sourceTemplateId,
  bucketName,
}: BucketIconProps) {
  if (bucketId === 'retirement') {
    return <MaterialCommunityIcons name="palm-tree" size={size} color={color} />;
  }
  if (bucketId === 'slush') {
    return <FontAwesome6 name="sack-dollar" size={size} color={color} />;
  }
  if (bucketId === 'emergency') {
    return <Ionicons name="shield-checkmark-outline" size={size} color={color} />;
  }
  const templateId = resolveBucketTemplateId(sourceTemplateId, bucketName);
  if (templateId) {
    const template = getTemplateById(templateId);
    if (template) {
      return <Ionicons name={template.icon} size={size} color={color} />;
    }
  }
  return <Ionicons name="flag-outline" size={size} color={color} />;
}
