const CONTACTS_KEY = 'mybolu:recent_contacts';

export const contactService = {
  getRecent() {
    try {
      const stored = localStorage.getItem(CONTACTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveContact(contact) {
    try {
      const recent = this.getRecent();
      const filtered = recent.filter(c => c.id !== contact.id);
      const next = [contact, ...filtered].slice(0, 5);
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
      return next;
    } catch {
      return [];
    }
  },
};
