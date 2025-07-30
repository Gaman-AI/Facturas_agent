import { Translations } from '@/contexts/LanguageContext'

const es: Translations = {
  // Common
  'common.loading': 'Cargando...',
  'common.error': 'Error',
  'common.success': 'Éxito',
  'common.cancel': 'Cancelar',
  'common.confirm': 'Confirmar',
  'common.save': 'Guardar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.view': 'Ver',
  'common.close': 'Cerrar',
  'common.back': 'Regresar',
  'common.next': 'Siguiente',
  'common.previous': 'Anterior',
  'common.required': 'Requerido',
  'common.optional': 'Opcional',
  'common.yes': 'Sí',
  'common.no': 'No',

  // Navigation
  'nav.home': 'Inicio',
  'nav.dashboard': 'Dashboard',
  'nav.tasks': 'Tareas',
  'nav.profile': 'Perfil',
  'nav.settings': 'Configuración',
  'nav.logout': 'Cerrar Sesión',

  // Authentication
  'auth.login': 'Iniciar Sesión',
  'auth.register': 'Registrarse',
  'auth.logout': 'Cerrar Sesión',
  'auth.email': 'Email',
  'auth.password': 'Contraseña',
  'auth.forgotPassword': '¿Olvidaste tu contraseña?',
  'auth.noAccount': '¿No tienes cuenta?',
  'auth.hasAccount': '¿Ya tienes cuenta?',
  'auth.registerHere': 'Regístrate aquí',
  'auth.loginHere': 'Inicia sesión aquí',
  'auth.loggingIn': 'Iniciando sesión...',
  'auth.registering': 'Registrando...',
  'auth.creatingAccount': 'Creando cuenta...',

  // Login Page
  'login.title': 'Iniciar Sesión',
  'login.subtitle': 'Accede a tu cuenta del Sistema CFDI 4.0',
  'login.emailPlaceholder': 'tu@email.com',
  'login.passwordPlaceholder': 'Tu contraseña',
  'login.loginButton': 'Iniciar Sesión',
  'login.error.invalidCredentials': 'Credenciales inválidas',
  'login.error.generic': 'Error al iniciar sesión',

  // Registration Page
  'register.title': 'Crear Cuenta',
  'register.subtitle': 'Registro para el Sistema de Automatización CFDI 4.0',
  'register.createAccountButton': 'Crear Cuenta',

  // Registration Form Sections
  'register.accessInfo': 'Información de Acceso',
  'register.companyInfo': 'Información de la Empresa',
  'register.addressInfo': 'Dirección Fiscal',
  'register.taxInfo': 'Información Fiscal',

  // Registration Fields
  'register.email.label': 'Email',
  'register.email.placeholder': 'tu@email.com',
  'register.password.label': 'Contraseña',
  'register.password.placeholder': 'Mínimo 8 caracteres',
  'register.rfc.label': 'RFC',
  'register.rfc.placeholder': 'XAXX010101000',
  'register.companyName.label': 'Razón Social',
  'register.companyName.placeholder': 'Nombre de la empresa',
  'register.country.label': 'País',
  'register.street.label': 'Calle',
  'register.street.placeholder': 'Nombre de la calle',
  'register.exteriorNumber.label': 'Núm. Exterior',
  'register.exteriorNumber.placeholder': '123',
  'register.interiorNumber.label': 'Núm. Interior',
  'register.interiorNumber.placeholder': 'A, B, 1, 2...',
  'register.colony.label': 'Colonia',
  'register.colony.placeholder': 'Nombre de la colonia',
  'register.municipality.label': 'Municipio',
  'register.municipality.placeholder': 'Municipio/Delegación',
  'register.zipCode.label': 'Código Postal',
  'register.zipCode.placeholder': '12345',
  'register.state.label': 'Estado',
  'register.state.placeholder': 'Selecciona tu estado',
  'register.taxRegime.label': 'Régimen Fiscal',
  'register.taxRegime.placeholder': 'Selecciona tu régimen fiscal',
  'register.cfdiUse.label': 'Uso de CFDI',
  'register.cfdiUse.placeholder': 'Selecciona el uso de CFDI',

  // Validation Messages
  'validation.email.required': 'El email es requerido',
  'validation.email.invalid': 'Email inválido',
  'validation.password.required': 'La contraseña es requerida',
  'validation.password.minLength': 'La contraseña debe tener al menos {{min}} caracteres',
  'validation.password.uppercase': 'Debe contener al menos una mayúscula',
  'validation.password.lowercase': 'Debe contener al menos una minúscula',
  'validation.password.number': 'Debe contener al menos un número',
  'validation.rfc.required': 'El RFC es requerido',
  'validation.rfc.invalid': 'Formato de RFC inválido',
  'validation.rfc.length': 'RFC debe tener {{min}}-{{max}} caracteres',
  'validation.companyName.required': 'La razón social es requerida',
  'validation.companyName.minLength': 'La razón social debe tener al menos {{min}} caracteres',
  'validation.country.required': 'El país es requerido',
  'validation.street.required': 'La calle es requerida',
  'validation.street.minLength': 'La calle debe tener al menos {{min}} caracteres',
  'validation.exteriorNumber.required': 'El número exterior es requerido',
  'validation.colony.required': 'La colonia es requerida',
  'validation.colony.minLength': 'La colonia debe tener al menos {{min}} caracteres',
  'validation.municipality.required': 'El municipio es requerido',
  'validation.municipality.minLength': 'El municipio debe tener al menos {{min}} caracteres',
  'validation.zipCode.required': 'El código postal es requerido',
  'validation.zipCode.invalid': 'Código postal inválido',
  'validation.zipCode.length': 'El código postal debe tener {{length}} dígitos',
  'validation.state.required': 'El estado es requerido',
  'validation.state.minLength': 'El estado debe tener al menos {{min}} caracteres',
  'validation.taxRegime.required': 'El régimen fiscal es requerido',
  'validation.cfdiUse.required': 'El uso de CFDI es requerido',

  // Home Page
  'home.title': 'Sistema de Automatización CFDI 4.0',
  'home.subtitle': 'Automatiza el llenado de formularios CFDI 4.0 en portales de proveedores con nuestro agente de navegador potenciado por IA',
  'home.getStarted': 'Comenzar Gratis',
  'home.login': 'Iniciar Sesión',
  'home.loadingApp': 'Cargando aplicación...',
  'home.redirectingToDashboard': 'Redirigiendo al dashboard...',

  // Features
  'features.secure': 'Seguro y Confiable',
  'features.intelligent': 'Automatización Inteligente',
  'features.compatible': 'Compatibilidad Total',

  // Footer
  'footer.developedBy': 'Desarrollado por',
  'footer.copyright': '© {{year}}',

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.welcome': 'Bienvenido',
  'dashboard.recentTasks': 'Tareas Recientes',
  'dashboard.statistics': 'Estadísticas',
  'dashboard.noTasks': 'No hay tareas disponibles',

  // Language Switcher
  'language.switch': 'Cambiar idioma',
  'language.spanish': 'Español',
  'language.english': 'English',
  'language.current': 'Idioma actual: {{language}}',

  // Error Messages
  'error.generic': 'Ha ocurrido un error',
  'error.network': 'Error de conexión',
  'error.unauthorized': 'No autorizado',
  'error.notFound': 'Recurso no encontrado',
  'error.serverError': 'Error del servidor',
  'error.registrationFailed': 'Error en el registro',
  'error.loginFailed': 'Error al iniciar sesión',

  // Success Messages
  'success.registrationComplete': 'Registro completado exitosamente',
  'success.loginComplete': 'Inicio de sesión exitoso',
  'success.profileUpdated': 'Perfil actualizado',
  'success.taskCreated': 'Tarea creada exitosamente',
  'success.taskCompleted': 'Tarea completada',

  // Tasks
  'tasks.title': 'Tareas CFDI',
  'tasks.create': 'Crear Tarea',
  'tasks.status.pending': 'Pendiente',
  'tasks.status.running': 'Ejecutándose',
  'tasks.status.completed': 'Completada',
  'tasks.status.failed': 'Fallida',
  'tasks.status.cancelled': 'Cancelada',
  'tasks.noTasks': 'No hay tareas disponibles',
  'tasks.createFirst': 'Crea tu primera tarea CFDI',

  // Profile
  'profile.title': 'Mi Perfil',
  'profile.edit': 'Editar Perfil',
  'profile.save': 'Guardar Cambios',
  'profile.companyInfo': 'Información de la Empresa',
  'profile.addressInfo': 'Dirección Fiscal',
  'profile.taxInfo': 'Información Fiscal',

  // Settings
  'settings.title': 'Configuración',
  'settings.language': 'Idioma',
  'settings.notifications': 'Notificaciones',
  'settings.security': 'Seguridad',
  'settings.account': 'Cuenta',

  // Metadata
  'meta.title': 'Sistema de Automatización CFDI 4.0',
  'meta.description': 'Sistema automatizado para el llenado de formularios CFDI 4.0 con agente de navegador potenciado por IA',
  'meta.keywords': 'CFDI, 4.0, automatización, facturación, México, RFC, SAT'
}

export default es 