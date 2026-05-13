require('dotenv').config();

const appJson = require('./app.json');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

module.exports = ({ config }) => {
  const baseConfig = config || appJson.expo;
  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra || {}),
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl ?? baseConfig.extra?.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        supabaseAnonKey ?? baseConfig.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  };
};
