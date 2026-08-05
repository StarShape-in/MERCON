import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, ListFilter } from 'lucide-react-native';
import type { DriverSortOption } from '../types';

const OPTIONS: { value: DriverSortOption; label: string }[] = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'trips', label: 'Most Trips' },
  { value: 'available', label: 'Available' },
  { value: 'online', label: 'Online' },
];

interface SortDropdownProps {
  value: DriverSortOption;
  onChange: (value: DriverSortOption) => void;
  className?: string;
}

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <View className={className}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        className="flex-row items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5"
      >
        <ListFilter size={13} color="#3B3B44" strokeWidth={2} />
        <Text className="text-xs font-medium text-gray-700">{selected.label}</Text>
        <ChevronDown size={13} color="#6E6E80" strokeWidth={2} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-8" onPress={() => setOpen(false)}>
          <View className="w-full max-w-xs gap-1 rounded-2xl bg-white p-2">
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { onChange(opt.value); setOpen(false); }}
                className="flex-row items-center justify-between rounded-xl px-3 py-2.5"
              >
                <Text className="text-sm text-gray-700">{opt.label}</Text>
                {value === opt.value && <Check size={16} color="#F24822" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
