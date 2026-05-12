import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACTS_KEY = '@mybolu:recent_contacts';

export const contactService = {
  async getRecent() {
    try {
      const stored = await AsyncStorage.getItem(CONTACTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  async saveContact(contact) {
    // contact: { id, email, nombre }
    try {
      const recent = await this.getRecent();
      const filtered = recent.filter(c => c.id !== contact.id);
      const next = [contact, ...filtered].slice(0, 5); // Keep last 5
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
      return next;
    } catch (e) {
      console.error('Error saving contact', e);
    }
  }
};
