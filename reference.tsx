import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import { LogoutOutlined, CloudUpload, DescriptionOutlined, PersonOutline, AttachMoney, ContentCopy } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../utils/axios';
// @ts-ignore
import extensionApiService from '../services/extensionApiService';

// Utility: Parse raw ticket text into key-value pairs
function parseStructuredText(rawText: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawText) return result;
  rawText.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\s#\-\.]+)\s*[:\-=]\s*(.+)$/i);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value) result[key] = value;
    }
  });
  return result;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<string>('');
  const [isSendingToExtension, setIsSendingToExtension] = useState(false);
  const [ticketData, setTicketData] = useState<{
    Comercio: string;
    Fecha: string;
    Total: string;
    'TC#': string;
    'TR#': string;
    'ID': string;
    'Fol_Vta': string;
    'ID_Ticket': string;
    'Mesa_Folio': string;
  }>({
    Comercio: '',
    Fecha: '',
    Total: '',
    'TC#': '',
    'TR#': '',
    'ID': '',
    'Fol_Vta': '',
    'ID_Ticket': '',
    'Mesa_Folio': ''
  });
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [structuredText, setStructuredText] = useState<Record<string, string>>({});

  const [apiToken, setApiToken] = useState<string>('');
  const [apiTokenLoading, setApiTokenLoading] = useState<boolean>(false);
  const [apiTokenError, setApiTokenError] = useState<string>('');
  const [apiTokenCopied, setApiTokenCopied] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleProcessTicket = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axiosInstance.post('/api/images/process-ticket', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Extraer los datos del ticket del texto
      const datos_ticket: typeof ticketData = {
        Comercio: '',
        Fecha: '',
        Total: '',
        'TC#': '',
        'TR#': '',
        'ID': '',
        'Fol_Vta': '',
        'ID_Ticket': '',
        'Mesa_Folio': ''
      };

      const lineas: string[] = response.data.texto_ticket.split('\n');
      
      // Primero buscar el ID Ticket
      lineas.forEach((linea: string) => {
        // Buscar específicamente por "ticket" o "tkt" en la línea
        if (linea.toLowerCase().includes('ticket') || linea.toLowerCase().includes('tkt')) {
          // Buscar un patrón que coincida con el formato del ID Ticket (letras y números)
          const match = linea.match(/[A-Z0-9]{8,}/);
          if (match) {
            datos_ticket['ID_Ticket'] = match[0];
            console.log('ID Ticket encontrado:', match[0]);
          }
        }
        if (linea.toLowerCase().includes('mesa') || linea.toLowerCase().includes('folio')) {
          const match = linea.match(/\d+/);
          if (match) {
            datos_ticket['Mesa_Folio'] = match[0];
          }
        }
      });

      // Luego procesar los demás campos
      lineas.forEach((linea: string) => {
        if (linea.includes(':')) {
          const [key, value] = linea.split(':').map((s: string) => s.trim());
          // No sobrescribir ID_Ticket si ya fue encontrado
          if (key in datos_ticket && key !== 'ID_Ticket') {
            datos_ticket[key as keyof typeof datos_ticket] = value;
          }
        }
      });
      
      console.log('Datos del ticket finales:', datos_ticket);
      setTicketData(datos_ticket);
      setShowWarning(true);

      const structuredText = parseStructuredText(response.data.texto_ticket);
      setStructuredText(structuredText);
    } catch (error) {
      console.error('Error processing ticket:', error);
      setShowWarning(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFacturar = async (tienda: 'oxxo' | 'walmart') => {
    try {
      setIsProcessing(true);
      const endpoint = tienda === 'oxxo' ? '/api/facturacion/facturar/oxxo' : '/api/facturacion/facturar/walmart';
      const response = await axiosInstance.post(endpoint, {
        MESA: ticketData['Mesa_Folio'],
        FECHA: ticketData.Fecha,
        TOTAL: ticketData.Total,
        ID_TKT: ticketData['ID_Ticket'],
      });
      console.log('Factura generada:', response.data);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al generar factura:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    if (!text || text.includes('confidenceLevel')) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleSendToExtension = async () => {
    if (!user) {
      alert('❌ Usuario no autenticado');
      return;
    }

    setIsSendingToExtension(true);
    setExtensionStatus('📤 Enviando datos a la extensión...');

    try {
      // Prepare data for the API
      const userData = {
        rfc: user.rfc || '',
        email: user.email || '',
        razonSocial: user.razon_social || '',
        companyName: user.razon_social || ''
      };

      const ticketDataFormatted = {
        Fecha: ticketData.Fecha,
        Mesa_Folio: ticketData['Mesa_Folio'],
        ID_Ticket: ticketData['ID_Ticket'],
        Total: ticketData.Total,
        Comercio: ticketData.Comercio,
        'TC#': ticketData['TC#'],
        'TR#': ticketData['TR#']
      };

      console.log('🚀 Sending data via API bridge:', { userData, ticketDataFormatted });

      // Use the new API service
      const result = await extensionApiService.sendDataToExtension(userData, ticketDataFormatted);

      if (result.success) {
        setExtensionStatus(`✅ Datos enviados correctamente (Sesión: ${result.sessionId})`);
        
        // Start monitoring for extension pickup
        extensionApiService.startStatusMonitoring(result.sessionId, (update: any) => {
          console.log('📊 Extension status update:', update);
          
          if (update.type === 'data_consumed') {
            setExtensionStatus('🎯 ¡Extensión recibió los datos! Procesando...');
          } else if (update.type === 'autofill_completed') {
            const result = update.result;
            if (result.success) {
              setExtensionStatus(`🎉 ¡Autofill completado! Campos llenados: ${result.filled_fields?.length || 0}`);
            } else {
              setExtensionStatus(`⚠️ Autofill parcial: ${result.error_details || 'Ver consola para detalles'}`);
            }
          } else if (update.type === 'waiting') {
            setExtensionStatus(`🔄 Esperando que la extensión recoja los datos... (${update.checkCount}/${update.maxChecks})`);
          } else if (update.type === 'timeout') {
            setExtensionStatus('⏰ Timeout: La extensión no recogió los datos. Verifique que esté instalada y activa.');
          }
        });

        // Clear status after 5 minutes
        setTimeout(() => {
          setExtensionStatus('');
        }, 5 * 60 * 1000);

      } else {
        setExtensionStatus(`❌ Error: ${result.error}`);
        console.error('Extension API Error:', result);
        
        // Fallback to old method
        console.log('🔄 Trying fallback method...');
        setExtensionStatus('🔄 Probando método alternativo...');
        console.log('[DEBUG][WEBAPP] structuredText before fallback:', structuredText);
        handleLegacyExtensionMethod(userData, ticketDataFormatted);
      }

    } catch (error) {
      console.error('❌ Extension communication error:', error);
      setExtensionStatus(`❌ Error de comunicación: ${error}`);
      
      // Fallback to old method
      handleLegacyExtensionMethod({
        rfc: user.rfc || '',
        email: user.email || '',
        razonSocial: user.razon_social || ''
      }, {
        Fecha: ticketData.Fecha,
        Mesa_Folio: ticketData['Mesa_Folio'],
        ID_Ticket: ticketData['ID_Ticket'],
        Total: ticketData.Total,
        Comercio: ticketData.Comercio
      });
    } finally {
      setIsSendingToExtension(false);
    }
  };

  const handleLegacyExtensionMethod = (userData: any, ticketDataFormatted: any) => {
    // Keep the old method as fallback
    const dataToSend = {
      type: 'TICKET_DATA_FROM_WEBAPP',
      userData,
      ticketData: ticketDataFormatted,
      structuredText
    };
    
    console.log('🔄 Using legacy extension communication...', dataToSend);
    console.log('[DEBUG][WEBAPP] structuredText before sending:', structuredText);
    
    const windowChrome = (window as any).chrome;
    
    if (windowChrome && windowChrome.runtime) {
      const extensionId = 'odpdedfehaijlilkimhkloijkalnbmbi'; // Updated to current extension ID
      
      try {
        windowChrome.runtime.sendMessage(extensionId, dataToSend, (response: any) => {
          if (windowChrome.runtime.lastError) {
            console.log('❌ Legacy method failed:', windowChrome.runtime.lastError.message);
            setExtensionStatus('⚠️ Método alternativo: Usando postMessage');
            window.postMessage(dataToSend, window.location.origin);
          } else {
            console.log('✅ Legacy method success:', response);
            setExtensionStatus('✅ Datos enviados mediante método alternativo');
          }
        });
      } catch (e) {
        console.log('❌ Legacy method exception:', e);
        setExtensionStatus('⚠️ Usando postMessage como último recurso');
        window.postMessage(dataToSend, window.location.origin);
      }
    } else {
      console.log('❌ Chrome runtime not available');
      setExtensionStatus('⚠️ Chrome runtime no disponible, usando postMessage');
      window.postMessage(dataToSend, window.location.origin);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGenerateApiToken = async () => {
    setApiTokenLoading(true);
    setApiTokenError('');
    try {
      const response = await axiosInstance.post('/api/auth/generate-api-token');
      setApiToken(response.data.api_token);
    } catch (error: any) {
      setApiTokenError('Error al generar el token. Intenta de nuevo.');
    } finally {
      setApiTokenLoading(false);
    }
  };

  const handleCopyApiToken = async () => {
    if (!apiToken) return;
    try {
      await navigator.clipboard.writeText(apiToken);
      setApiTokenCopied(true);
      setTimeout(() => setApiTokenCopied(false), 2000);
    } catch (error) {
      setApiTokenError('No se pudo copiar el token.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          bgcolor: '#3d8396',
          boxShadow: '0 3px 5px 2px rgba(23, 58, 64, 0.2)',
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              color: '#fff',
              fontWeight: 500,
              flexGrow: 1
            }}
          >
            Sistema de Facturación
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              '&:hover': {
                bgcolor: 'rgba(23, 58, 64, 0.1)'
              }
            }}
          >
            <LogoutOutlined />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonOutline sx={{ color: '#00BFA6', mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Datos del Usuario
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">RFC</Typography>
                  <Typography variant="body1">{user?.rfc}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{user?.email}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Razón Social</Typography>
                  <Typography variant="body1">{user?.razon_social}</Typography>
                </Grid>
              </Grid>
              <Grid item xs={12} md={12}>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGenerateApiToken}
                    disabled={apiTokenLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    {apiTokenLoading ? 'Generando...' : 'Generar Token de API'}
                  </Button>
                  <TextField
                    label="Token de API"
                    value={apiToken}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleCopyApiToken} disabled={!apiToken}>
                            <ContentCopy />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{ minWidth: 300 }}
                  />
                  {apiTokenCopied && (
                    <Typography variant="body2" color="success.main">¡Copiado!</Typography>
                  )}
                  {apiTokenError && (
                    <Typography variant="body2" color="error.main">{apiTokenError}</Typography>
                  )}
                </Box>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CloudUpload sx={{ color: '#00BFA6', mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Subir Ticket
                </Typography>
              </Box>
              <Box
                sx={{
                  border: '2px dashed #E0E7FF',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: '#FAFBFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    backgroundColor: '#E0E7FF',
                  }}
                >
                  <AttachMoney sx={{ color: '#00BFA6', fontSize: '28px' }} />
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Selecciona o arrastra una imagen de tu ticket
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="raised-button-file"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="raised-button-file">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<CloudUpload />}
                    sx={{
                      background: 'linear-gradient(45deg, #00BFA6 30%, #2196F3 90%)',
                      boxShadow: '0 3px 5px 2px rgba(0, 191, 166, .3)',
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 4
                    }}
                  >
                    Seleccionar Imagen
                  </Button>
                </label>
                {selectedFile && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Archivo seleccionado: {selectedFile.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleProcessTicket}
                        disabled={isProcessing}
                        sx={{
                          background: 'linear-gradient(45deg, #00BFA6 30%, #2196F3 90%)',
                          boxShadow: '0 3px 5px 2px rgba(0, 191, 166, .3)',
                          borderRadius: '8px',
                          textTransform: 'none',
                          minWidth: '200px',
                          position: 'relative',
                        }}
                      >
                        {isProcessing ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress
                              size={20}
                              sx={{
                                color: 'white',
                                position: 'absolute',
                                left: '50%',
                                marginLeft: '-10px',
                              }}
                            />
                            <span style={{ opacity: 0 }}>Extraer Ticket Data</span>
                          </Box>
                        ) : (
                          'Extraer Ticket Data'
                        )}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <DescriptionOutlined sx={{ color: '#00BFA6', mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Ticket Data
                </Typography>
              </Box>
              {showWarning && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="warning" sx={{ borderRadius: 1 }}>
                    Por favor, verifica que los datos extraídos sean correctos antes de proceder con la facturación.
                  </Alert>
                </Box>
              )}
              {showSuccess && (
                <Box sx={{ mb: 3 }}>
                  <Alert 
                    severity="success" 
                    sx={{ borderRadius: 1 }}
                    onClose={() => setShowSuccess(false)}
                  >
                    La factura se está generando. Si los datos son correctos, llegará a tu correo electrónico en unos minutos.
                  </Alert>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      height: '100%',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Mesa/Folio
                    </Typography>
                    <TextField
                      fullWidth
                      value={ticketData['Mesa_Folio'] && !ticketData['Mesa_Folio'].includes('confidenceLevel') ? ticketData['Mesa_Folio'] : ''}
                      onChange={(e) => setTicketData({ ...ticketData, 'Mesa_Folio': e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: ticketData['Mesa_Folio'] && !ticketData['Mesa_Folio'].includes('confidenceLevel') ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyToClipboard(ticketData['Mesa_Folio'])}
                              sx={{ 
                                color: '#00BFA6',
                                '&:hover': { bgcolor: 'rgba(0, 191, 166, 0.1)' }
                              }}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': {
                            borderColor: '#E0E7FF',
                          },
                          '&:hover fieldset': {
                            borderColor: '#00BFA6',
                          },
                        },
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      height: '100%',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Fecha
                    </Typography>
                    <TextField
                      fullWidth
                      value={ticketData['Fecha'] && !ticketData['Fecha'].includes('confidenceLevel') ? ticketData['Fecha'] : ''}
                      onChange={(e) => setTicketData({ ...ticketData, 'Fecha': e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: ticketData['Fecha'] && !ticketData['Fecha'].includes('confidenceLevel') ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyToClipboard(ticketData['Fecha'])}
                              sx={{ 
                                color: '#00BFA6',
                                '&:hover': { bgcolor: 'rgba(0, 191, 166, 0.1)' }
                              }}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': {
                            borderColor: '#E0E7FF',
                          },
                          '&:hover fieldset': {
                            borderColor: '#00BFA6',
                          },
                        },
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      height: '100%',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Total
                    </Typography>
                    <TextField
                      fullWidth
                      value={ticketData['Total'] && !ticketData['Total'].includes('confidenceLevel') 
                        ? `$${parseFloat(ticketData['Total']).toFixed(2)}` 
                        : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace('$', '').replace(',', '');
                        setTicketData({ ...ticketData, 'Total': value });
                      }}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: ticketData['Total'] && !ticketData['Total'].includes('confidenceLevel') ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyToClipboard(`$${parseFloat(ticketData['Total']).toFixed(2)}`)}
                              sx={{ 
                                color: '#00BFA6',
                                '&:hover': { bgcolor: 'rgba(0, 191, 166, 0.1)' }
                              }}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': {
                            borderColor: '#E0E7FF',
                          },
                          '&:hover fieldset': {
                            borderColor: '#00BFA6',
                          },
                        },
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      height: '100%',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      ID Ticket
                    </Typography>
                    <TextField
                      fullWidth
                      value={ticketData['ID_Ticket'] && !ticketData['ID_Ticket'].includes('confidenceLevel') ? ticketData['ID_Ticket'] : ''}
                      onChange={(e) => setTicketData({ ...ticketData, 'ID_Ticket': e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        endAdornment: ticketData['ID_Ticket'] && !ticketData['ID_Ticket'].includes('confidenceLevel') ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyToClipboard(ticketData['ID_Ticket'])}
                              sx={{ 
                                color: '#00BFA6',
                                '&:hover': { bgcolor: 'rgba(0, 191, 166, 0.1)' }
                              }}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': {
                            borderColor: '#E0E7FF',
                          },
                          '&:hover fieldset': {
                            borderColor: '#00BFA6',
                          },
                        },
                      }}
                    />
                  </Paper>
                </Grid>
              </Grid>
              {/* Extension Status Display */}
              {extensionStatus && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity={
                    extensionStatus.includes('❌') ? 'error' :
                    extensionStatus.includes('⚠️') ? 'warning' :
                    extensionStatus.includes('✅') || extensionStatus.includes('🎉') ? 'success' :
                    'info'
                  }>
                    {extensionStatus}
                  </Alert>
                </Box>
              )}
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  disabled={isSendingToExtension}
                  sx={{ flex: 1, borderRadius: '8px', textTransform: 'none', py: 1.5 }}
                  onClick={() => {
                    const dataToSend = {
                      type: 'TICKET_DATA_FROM_WEBAPP',
                      _messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      userData: {
                        rfc: user?.rfc || '',
                        email: user?.email || '',
                        razonSocial: user?.razon_social || ''
                      },
                      ticketData: {
                        date: ticketData['Fecha'],
                        folio: ticketData['Mesa_Folio'],
                        ticketId: ticketData['ID_Ticket'],
                        total: ticketData['Total'],
                        comercio: ticketData['Comercio']
                      }
                    };
                    
                    // Add confirmation listener
                    const confirmationListener = (event: any) => {
                      if (event.data.type === 'TICKET_DATA_CONFIRMATION' && 
                          event.data._confirmationFor === dataToSend._messageId) {
                        window.removeEventListener('message', confirmationListener);
                        if (event.data.success) {
                          alert('✅ Datos enviados correctamente a la extensión');
                        } else {
                          alert('⚠️ Error al enviar datos: ' + (event.data.error || 'Error desconocido'));
                        }
                      }
                    };
                    
                    window.addEventListener('message', confirmationListener);
                    
                    // Send the message
                    window.postMessage(dataToSend, window.location.origin);
                    
                    // Timeout after 3 seconds if no confirmation
                    setTimeout(() => {
                      window.removeEventListener('message', confirmationListener);
                    }, 3000);
                  }}
                >
                  Enviar a Extensión
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleFacturar('oxxo')}
                  sx={{
                    flex: 1,
                    background: 'linear-gradient(45deg, #00BFA6 30%, #2196F3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(0, 191, 166, .3)',
                    borderRadius: '8px',
                    textTransform: 'none',
                    py: 1.5,
                  }}
                >
                  Facturar en OXXO
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleFacturar('walmart')}
                  sx={{
                    flex: 1,
                    background: 'linear-gradient(45deg, #00BFA6 30%, #2196F3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(0, 191, 166, .3)',
                    borderRadius: '8px',
                    textTransform: 'none',
                    py: 1.5,
                  }}
                >
                  Facturar en Walmart
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: 'white',
          borderTop: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            Desarrollado por{' '}
            <Box
              component="span"
              sx={{
                color: '#00BFA6',
                fontWeight: 600,
              }}
            >
              Gaman.ai
            </Box>{' '}
            © 2025
          </Typography>
        </Container>
      </Box>
      <Snackbar
        open={showCopyNotification}
        autoHideDuration={2000}
        onClose={() => setShowCopyNotification(false)}
        message="Dato copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default Dashboard; 