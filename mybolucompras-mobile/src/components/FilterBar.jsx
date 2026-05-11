import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function FilterBar({ search, onSearchChange }) {
  const { dark } = useTheme();
  const s = styles(dark);

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons
          name="search"
          size={18}
          color={dark ? colors.textSecondary.dark : colors.textSecondary.light}
          style={s.searchIcon}
        />
        <TextInput
          style={s.input}
          placeholder="Buscar gasto..."
          placeholderTextColor={dark ? colors.textSecondary.dark : colors.textSecondary.light}
          value={search}
          onChangeText={onSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={dark ? colors.textSecondary.dark : colors.textSecondary.light}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark ? colors.surface.dark : colors.surface.light,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
    padding: 0,
  },
});
