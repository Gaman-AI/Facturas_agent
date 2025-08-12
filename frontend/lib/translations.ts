// Simple English-only translation utility
export const translations = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.submit': 'Submit',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.personaFisica': 'Persona Física',
  'common.personaMoral': 'Persona Moral',

  // Auth
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.register': 'Register',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.rememberMe': 'Remember me',
  'auth.signIn': 'Sign In',
  'auth.signUp': 'Sign Up',
  'auth.alreadyHaveAccount': 'Already have an account?',
  'auth.dontHaveAccount': "Don't have an account?",

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.welcome': 'Welcome',
  'dashboard.subtitle': 'Manage your tasks and automate workflows.',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.systemStatus': 'System Status',
  'dashboard.viewHistory': 'View History',

  // Profile
  'profile.title': 'Profile',
  'profile.edit': 'Edit Profile',
  'profile.companyInfo': 'Company Information',
  'profile.noProfile': 'No Profile',
  'profile.basicFunctions': 'Complete your profile to unlock advanced features.',

  // Tasks
  'tasks.create': 'Create Task',
  'tasks.simple.title': 'Simple Task Submission',
  'tasks.simple.description': 'Submit a quick task for immediate execution.',
  'tasks.simple.taskLabel': 'What would you like the agent to do?',
  'tasks.simple.placeholder': 'Example: Search for OpenAI latest updates on Google and summarize the findings',
  'tasks.simple.hint': 'Be specific about what you want to accomplish',
  'tasks.simple.quickTasks': 'Quick Tasks',
  'tasks.simple.aiModel': 'AI Model',
  'tasks.simple.creating': 'Creating Task...',
  'tasks.simple.submit': 'Start Task',
  'tasks.simple.userNote': 'Task will be executed as',
  'tasks.validation.taskRequired': 'Task description is required',
  'tasks.validation.taskTooLong': 'Task description is too long',
  'tasks.success.created': 'Task created successfully',
  'tasks.quick.searchGoogle': 'Search for recent news about a specific topic on Google',
  'tasks.quick.checkWeather': 'Check weather forecast for a city',
  'tasks.quick.findProduct': 'Find laptop prices on MercadoLibre',
  'tasks.quick.socialMedia': 'Check latest posts on Twitter',

  // Register
  'register.companyName.label': 'Company Name',
  'register.addressInfo': 'Address',
  'register.taxRegime.label': 'Tax Regime',
  'register.cfdiUse.label': 'CFDI Use',

  // Home
  'home.loadingApp': 'Loading application...',
  'home.redirectingToDashboard': 'Redirecting to dashboard...',
  'home.title': 'CFDI 4.0 Automation System',
  'home.subtitle': 'Automate CFDI form filling with artificial intelligence',
  'home.getStarted': 'Get Started',
  'home.login': 'Login',
  'home.tryDemo': 'Try Demo',

  // Features
  'features.secure': 'Secure',
  'features.intelligent': 'Intelligent',
  'features.compatible': 'Compatible',

  // Footer
  'footer.developedBy': 'Developed by',
  'footer.copyright': 'All rights reserved.',

  // Language
  'language.switch': 'Switch language',
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let translation = translations[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    });
  }

  return translation;
} 