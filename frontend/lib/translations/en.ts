import { Translations } from '@/contexts/LanguageContext'

const en: Translations = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.previous': 'Previous',
  'common.required': 'Required',
  'common.optional': 'Optional',
  'common.yes': 'Yes',
  'common.no': 'No',

  // Navigation
  'nav.home': 'Home',
  'nav.dashboard': 'Dashboard',
  'nav.tasks': 'Tasks',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'nav.logout': 'Logout',

  // Authentication
  'auth.login': 'Login',
  'auth.register': 'Register',
  'auth.logout': 'Logout',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.forgotPassword': 'Forgot your password?',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.registerHere': 'Register here',
  'auth.loginHere': 'Login here',
  'auth.loggingIn': 'Logging in...',
  'auth.registering': 'Registering...',
  'auth.creatingAccount': 'Creating account...',

  // Login Page
  'login.title': 'Login',
  'login.subtitle': 'Access your CFDI 4.0 System account',
  'login.emailPlaceholder': 'your@email.com',
  'login.passwordPlaceholder': 'Your password',
  'login.loginButton': 'Login',
  'login.error.invalidCredentials': 'Invalid credentials',
  'login.error.generic': 'Login error',

  // Registration Page
  'register.title': 'Create Account',
  'register.subtitle': 'Registration for CFDI 4.0 Automation System',
  'register.createAccountButton': 'Create Account',

  // Registration Form Sections
  'register.accessInfo': 'Access Information',
  'register.companyInfo': 'Company Information',
  'register.addressInfo': 'Tax Address',
  'register.taxInfo': 'Tax Information',

  // Registration Fields
  'register.email.label': 'Email',
  'register.email.placeholder': 'your@email.com',
  'register.password.label': 'Password',
  'register.password.placeholder': 'Minimum 8 characters',
  'register.rfc.label': 'RFC',
  'register.rfc.placeholder': 'XAXX010101000',
  'register.companyName.label': 'Company Name',
  'register.companyName.placeholder': 'Company name',
  'register.country.label': 'Country',
  'register.street.label': 'Street',
  'register.street.placeholder': 'Street name',
  'register.exteriorNumber.label': 'Exterior Number',
  'register.exteriorNumber.placeholder': '123',
  'register.interiorNumber.label': 'Interior Number',
  'register.interiorNumber.placeholder': 'A, B, 1, 2...',
  'register.colony.label': 'Colony',
  'register.colony.placeholder': 'Colony name',
  'register.municipality.label': 'Municipality',
  'register.municipality.placeholder': 'Municipality/Borough',
  'register.zipCode.label': 'Zip Code',
  'register.zipCode.placeholder': '12345',
  'register.state.label': 'State',
  'register.state.placeholder': 'Select your state',
  'register.taxRegime.label': 'Tax Regime',
  'register.taxRegime.placeholder': 'Select your tax regime',
  'register.cfdiUse.label': 'CFDI Use',
  'register.cfdiUse.placeholder': 'Select CFDI use',

  // Validation Messages
  'validation.email.required': 'Email is required',
  'validation.email.invalid': 'Invalid email',
  'validation.password.required': 'Password is required',
  'validation.password.minLength': 'Password must be at least {{min}} characters',
  'validation.password.uppercase': 'Must contain at least one uppercase letter',
  'validation.password.lowercase': 'Must contain at least one lowercase letter',
  'validation.password.number': 'Must contain at least one number',
  'validation.rfc.required': 'RFC is required',
  'validation.rfc.invalid': 'Invalid RFC format',
  'validation.rfc.length': 'RFC must be {{min}}-{{max}} characters',
  'validation.companyName.required': 'Company name is required',
  'validation.companyName.minLength': 'Company name must be at least {{min}} characters',
  'validation.country.required': 'Country is required',
  'validation.street.required': 'Street is required',
  'validation.street.minLength': 'Street must be at least {{min}} characters',
  'validation.exteriorNumber.required': 'Exterior number is required',
  'validation.colony.required': 'Colony is required',
  'validation.colony.minLength': 'Colony must be at least {{min}} characters',
  'validation.municipality.required': 'Municipality is required',
  'validation.municipality.minLength': 'Municipality must be at least {{min}} characters',
  'validation.zipCode.required': 'Zip code is required',
  'validation.zipCode.invalid': 'Invalid zip code',
  'validation.zipCode.length': 'Zip code must be {{length}} digits',
  'validation.state.required': 'State is required',
  'validation.state.minLength': 'State must be at least {{min}} characters',
  'validation.taxRegime.required': 'Tax regime is required',
  'validation.cfdiUse.required': 'CFDI use is required',

  // Home Page
  'home.title': 'CFDI 4.0 Automation System',
  'home.subtitle': 'Automate CFDI 4.0 form filling on vendor portals with our AI-powered browser agent',
  'home.getStarted': 'Get Started Free',
  'home.login': 'Login',
  'home.loadingApp': 'Loading application...',
  'home.redirectingToDashboard': 'Redirecting to dashboard...',

  // Features
  'features.secure': 'Secure and Reliable',
  'features.intelligent': 'Intelligent Automation',
  'features.compatible': 'Full Compatibility',

  // Footer
  'footer.developedBy': 'Developed by',
  'footer.copyright': '© {{year}}',

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.welcome': 'Welcome',
  'dashboard.recentTasks': 'Recent Tasks',
  'dashboard.statistics': 'Statistics',
  'dashboard.noTasks': 'No tasks available',

  // Language Switcher
  'language.switch': 'Switch language',
  'language.spanish': 'Español',
  'language.english': 'English',
  'language.current': 'Current language: {{language}}',

  // Error Messages
  'error.generic': 'An error occurred',
  'error.network': 'Network error',
  'error.unauthorized': 'Unauthorized',
  'error.notFound': 'Resource not found',
  'error.serverError': 'Server error',
  'error.registrationFailed': 'Registration failed',
  'error.loginFailed': 'Login failed',

  // Success Messages
  'success.registrationComplete': 'Registration completed successfully',
  'success.loginComplete': 'Login successful',
  'success.profileUpdated': 'Profile updated',
  'success.taskCreated': 'Task created successfully',
  'success.taskCompleted': 'Task completed',

  // Tasks
  'tasks.title': 'CFDI Tasks',
  'tasks.create': 'Create Task',
  'tasks.status.pending': 'Pending',
  'tasks.status.running': 'Running',
  'tasks.status.completed': 'Completed',
  'tasks.status.failed': 'Failed',
  'tasks.status.cancelled': 'Cancelled',
  'tasks.noTasks': 'No tasks available',
  'tasks.createFirst': 'Create your first CFDI task',

  // Profile
  'profile.title': 'My Profile',
  'profile.edit': 'Edit Profile',
  'profile.save': 'Save Changes',
  'profile.companyInfo': 'Company Information',
  'profile.addressInfo': 'Tax Address',
  'profile.taxInfo': 'Tax Information',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.notifications': 'Notifications',
  'settings.security': 'Security',
  'settings.account': 'Account',

  // Metadata
  'meta.title': 'CFDI 4.0 Automation System',
  'meta.description': 'Automated system for filling CFDI 4.0 forms with AI-powered browser agent',
  'meta.keywords': 'CFDI, 4.0, automation, invoicing, Mexico, RFC, SAT'
}

export default en 