import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, ImageSourcePropType, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Icon } from './Icon';

interface ProviderCardProps {
  name:       string;
  rating:     number;
  reviewCount:number;
  distance?:  string;
  avatar?:    ImageSourcePropType;
  verified?:  boolean;
  onPress?:   () => void;
  style?:     ViewStyle;
}

export function ProviderCard({
  name, rating, reviewCount, distance, avatar, verified = false, onPress, style,
}: ProviderCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.providerCard, style]}
    >
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image source={avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {verified && (
          <View style={styles.verifiedBadge}>
            <Text style={{ fontSize: 8 }}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.providerInfo}>
        <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
        <View style={styles.ratingRow}>
          <Icon name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({reviewCount})</Text>
        </View>
        {distance && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Icon name="location" size={13} color={Colors.neutral[400]} />
            <Text style={styles.distance}>{distance}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  providerCard: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.neutral[0],
    borderRadius:   Radius.lg,
    padding:        Space.lg,
    gap:            Space.md,
    minWidth:       160,
    borderWidth:    1,
    borderColor:    Colors.neutral[200],
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width:        52,
    height:       52,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    backgroundColor: Colors.primary[100],
    alignItems:    'center',
    justifyContent:'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize:   FontSize.xl,
    color:      Colors.primary[700],
  },
  verifiedBadge: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    backgroundColor: Colors.primary[500],
    borderRadius:    Radius.full,
    width:           18,
    height:          18,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     Colors.neutral[0],
  },
  providerInfo: { flex: 1, gap: 3 },
  providerName: {
    fontFamily: FontFamily.semiBold,
    fontSize:   FontSize.md,
    color:      Colors.neutral[800],
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: {
    fontFamily: FontFamily.semiBold,
    fontSize:   FontSize.sm,
    color:      Colors.neutral[800],
  },
  reviewCount: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.sm,
    color:      Colors.neutral[400],
  },
  distance: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.sm,
    color:      Colors.neutral[500],
  },
});
