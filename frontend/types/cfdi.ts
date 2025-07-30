// CFDI 4.0 Types and Constants

export interface RegimenFiscal {
  code: string;
  description: string;
  type: 'fisica' | 'moral' | 'both';
}

export interface UsoCFDI {
  code: string;
  description: string;
  applicable_to: 'fisica' | 'moral' | 'both';
}

export interface EstadoMexicano {
  code: string;
  name: string;
}

// Regímenes Fiscales según SAT
export const REGIMENES_FISCALES: RegimenFiscal[] = [
  // Persona Física
  { code: '605', description: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', type: 'fisica' },
  { code: '606', description: 'Arrendamiento', type: 'fisica' },
  { code: '608', description: 'Demás ingresos', type: 'fisica' },
  { code: '610', description: 'Residentes en el Extranjero sin Establecimiento Permanente en México', type: 'fisica' },
  { code: '611', description: 'Ingresos por Dividendos (socios y accionistas)', type: 'fisica' },
  { code: '612', description: 'Personas Físicas con Actividades Empresariales y Profesionales', type: 'fisica' },
  { code: '614', description: 'Ingresos por intereses', type: 'fisica' },
  { code: '616', description: 'Sin obligaciones fiscales', type: 'fisica' },
  { code: '621', description: 'Incorporación Fiscal', type: 'fisica' },
  { code: '629', description: 'De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales', type: 'fisica' },
  { code: '630', description: 'Enajenación de acciones en bolsa de valores', type: 'fisica' },
  
  // Persona Moral
  { code: '601', description: 'General de Ley Personas Morales', type: 'moral' },
  { code: '603', description: 'Personas Morales con Fines no Lucrativos', type: 'moral' },
  { code: '609', description: 'Consolidación', type: 'moral' },
  { code: '620', description: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', type: 'moral' },
  { code: '622', description: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', type: 'both' },
  { code: '623', description: 'Opcional para Grupos de Sociedades', type: 'moral' },
  { code: '624', description: 'Coordinados', type: 'moral' },
  { code: '625', description: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', type: 'both' },
  { code: '626', description: 'Régimen Simplificado de Confianza', type: 'both' },
];

// Usos de CFDI según SAT
export const USOS_CFDI: UsoCFDI[] = [
  { code: 'G01', description: 'Adquisición de mercancías', applicable_to: 'both' },
  { code: 'G02', description: 'Devoluciones, descuentos o bonificaciones', applicable_to: 'both' },
  { code: 'G03', description: 'Gastos en general', applicable_to: 'both' },
  { code: 'I01', description: 'Construcciones', applicable_to: 'both' },
  { code: 'I02', description: 'Mobilario y equipo de oficina por inversiones', applicable_to: 'both' },
  { code: 'I03', description: 'Equipo de transporte', applicable_to: 'both' },
  { code: 'I04', description: 'Equipo de computo y accesorios', applicable_to: 'both' },
  { code: 'I05', description: 'Dados, troqueles, moldes, matrices y herramental', applicable_to: 'both' },
  { code: 'I06', description: 'Comunicaciones telefónicas', applicable_to: 'both' },
  { code: 'I07', description: 'Comunicaciones satelitales', applicable_to: 'both' },
  { code: 'I08', description: 'Otra maquinaria y equipo', applicable_to: 'both' },
  { code: 'D01', description: 'Honorarios médicos, dentales y gastos hospitalarios', applicable_to: 'fisica' },
  { code: 'D02', description: 'Gastos médicos por incapacidad o discapacidad', applicable_to: 'fisica' },
  { code: 'D03', description: 'Gastos funerales', applicable_to: 'fisica' },
  { code: 'D04', description: 'Donativos', applicable_to: 'fisica' },
  { code: 'D05', description: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)', applicable_to: 'fisica' },
  { code: 'D06', description: 'Aportaciones voluntarias al SAR', applicable_to: 'fisica' },
  { code: 'D07', description: 'Primas por seguros de gastos médicos', applicable_to: 'fisica' },
  { code: 'D08', description: 'Gastos de transportación escolar obligatoria', applicable_to: 'fisica' },
  { code: 'D09', description: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones', applicable_to: 'fisica' },
  { code: 'D10', description: 'Pagos por servicios educativos (colegiaturas)', applicable_to: 'fisica' },
  { code: 'S01', description: 'Sin efectos fiscales', applicable_to: 'both' },
  { code: 'CP01', description: 'Pagos', applicable_to: 'both' },
  { code: 'CN01', description: 'Nómina', applicable_to: 'both' },
];

// Estados de México
export const ESTADOS_MEXICANOS: EstadoMexicano[] = [
  { code: 'AGS', name: 'Aguascalientes' },
  { code: 'BC', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHIS', name: 'Chiapas' },
  { code: 'CHIH', name: 'Chihuahua' },
  { code: 'CDMX', name: 'Ciudad de México' },
  { code: 'COAH', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DGO', name: 'Durango' },
  { code: 'MEX', name: 'Estado de México' },
  { code: 'GTO', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HGO', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MICH', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NL', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QRO', name: 'Querétaro' },
  { code: 'QROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAMPS', name: 'Tamaulipas' },
  { code: 'TLAX', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
]; 