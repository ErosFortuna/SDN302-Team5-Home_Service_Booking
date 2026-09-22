import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon, AppIconKey } from '../ui/Icon';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Space } from '../../constants/spacing';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: AppIconKey;
  onRightPress?: () => void;
  rightLabel?: string;
  style?: ViewStyle;
  transparent?: boolean;
}

export function Header({
  title,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  rightLabel,
  style,
  transparent = false,
}: HeaderProps) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, transparent && styles.transparent]}>
      <View style={[styles.container, style]}>
        {/* Left: Back Button */}
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.iconButton} accessibilityLabel="Quay lại">
              <Icon name="back" size={24} color={Colors.neutral[800]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.centerContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right: Action */}
        <View style={styles.rightContainer}>
          {(rightIcon || rightLabel) && (
            <TouchableOpacity onPress={onRightPress} style={styles.rightAction} accessibilityLabel="Tùy chọn">
              {rightLabel && <Text style={styles.rightLabel}>{rightLabel}</Text>}
              {rightIcon && <Icon name={rightIcon} size={24} color={Colors.primary[500]} />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.neutral[0],
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // Standard header height
    paddingHorizontal: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    backgroundColor: Colors.neutral[0],
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iconButton: {
    padding: Space.xs,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    padding: Space.xs,
  },
  rightLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.primary[500],
  },
});
