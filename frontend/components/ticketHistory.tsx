'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  X,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { ticketService, type Ticket } from '@/services/ticketService';
import { tokenManager } from '@/utils/tokenManager';
import { LanguageToggle } from '@/components/LanguageToggle';

interface TicketHistoryProps {
  className?: string;
}

export function TicketHistory({ className = '' }: TicketHistoryProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fetchTickets = async (page = 1, search = '', status = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const token = await tokenManager.getValidToken();
      if (!token) {
        throw new Error('No valid session found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(status !== 'all' && { status })
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/tickets?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesión expirada. Inicia sesión nuevamente.');
        }
        throw new Error(`Failed to fetch tickets: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error?.message || 'Failed to load ticket history');
      }

      const fetchedTickets = Array.isArray(data?.data?.tickets) ? data.data.tickets : [];
      setTickets(fetchedTickets);
      setTotalPages(data?.data?.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets(currentPage, searchQuery, statusFilter);
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchTickets(1, query, statusFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchTickets(1, searchQuery, status);
  };

  const handlePageChange = (page: number) => {
    fetchTickets(page, searchQuery, statusFilter);
  };

  const handleViewImage = (ticket: Ticket) => {
    if (ticket.file_url) {
      setSelectedImageUrl(ticket.file_url);
      setImageModalOpen(true);
      setDetailsModalOpen(false);
    } else {
      alert(t('history.imageNotAvailable'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      uploaded: { variant: 'secondary' as const, label: t('history.status.uploaded') },
      processing: { variant: 'default' as const, label: t('history.status.processing') },
      processed: { variant: 'default' as const, label: t('history.status.processed') },
      failed: { variant: 'destructive' as const, label: t('history.status.failed') },
      archived: { variant: 'outline' as const, label: t('history.status.archived') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatTicketDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting ticket date:', error);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  if (loading && tickets.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{t('history.loadingTickets')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <p className="text-red-500 mb-4">{t('history.errorLoading')}: {error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('history.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#208692]">{t('history.title')}</h2>
          <p className="text-gray-600">{t('history.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => router.push('/dashboard')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('history.backToDashboard')}
          </Button>
          <LanguageToggle />
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t('history.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('history.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.allStatus')}</SelectItem>
            <SelectItem value="uploaded">{t('history.status.uploaded')}</SelectItem>
            <SelectItem value="processing">{t('history.status.processing')}</SelectItem>
            <SelectItem value="processed">{t('history.status.processed')}</SelectItem>
            <SelectItem value="failed">{t('history.status.failed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('history.noTicketsFound')}</h3>
            <p className="text-gray-500 text-center">
              {searchQuery || statusFilter !== 'all'
                ? t('history.noTicketsMatch')
                : t('history.uploadFirst')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg text-[#208692]">
                        {ticket.comercio || t('history.unknownStore')}
                      </h3>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{ticket.file_name}</span>
                      </div>

                      {ticket.ticket_id && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{t('history.ticketId')}:</span>
                          <span>{ticket.ticket_id}</span>
                        </div>
                      )}

                      {ticket.total && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{t('history.total')}:</span>
                          <span className="font-semibold text-[#208692]">
                            {formatCurrency(ticket.total)}
                          </span>
                        </div>
                      )}

                      {ticket.fecha && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{t('history.date')}:</span>
                          <span>{formatTicketDate(ticket.fecha)}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{t('history.uploaded')}:</span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ width: '144px', minWidth: '144px', maxWidth: '144px' }}
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t('history.viewDetails')}
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-[#208692]">
                              {t('history.ticketDetails')} - {ticket.comercio || t('history.unknownStore')}
                            </DialogTitle>
                          </DialogHeader>
                          {selectedTicket && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('history.fileName')}</label>
                                  <p className="text-sm">{selectedTicket.file_name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('history.status')}</label>
                                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('history.comercio')}</label>
                                  <p className="text-sm">{selectedTicket.comercio || t('history.unknownStore')}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('history.total')}</label>
                                  <p className="text-sm font-semibold text-[#208692]">
                                    {formatCurrency(selectedTicket.total)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('history.date')}</label>
                                  <p className="text-sm">
                                    {selectedTicket.fecha ? formatTicketDate(selectedTicket.fecha) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">{t('history.uploaded')}</label>
                                  <p className="text-sm">{formatDate(selectedTicket.created_at)}</p>
                                </div>
                                {selectedTicket.error_message && (
                                  <div className="col-span-2">
                                    <label className="text-sm font-medium text-red-500">{t('history.errorMessage')}</label>
                                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                                      {selectedTicket.error_message}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {(selectedTicket.mesa_folio || selectedTicket.id_ticket || selectedTicket.store_branch_plaza ||
                                selectedTicket.payment_type || selectedTicket.tc_number || selectedTicket.tr_number ||
                                selectedTicket.fol_vta || selectedTicket.register_station_terminal ||
                                selectedTicket.card_last_4_digits) && (
                                <div className="border-t pt-4">
                                  <h4 className="font-medium text-gray-700 mb-3">{t('history.additionalDetails')}</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    {selectedTicket.mesa_folio && (
                                      <div>
                                        <label className="text-gray-500">{t('history.mesaFolio')}</label>
                                        <p>{selectedTicket.mesa_folio}</p>
                                      </div>
                                    )}
                                    {selectedTicket.id_ticket && (
                                      <div>
                                        <label className="text-gray-500">{t('history.idTicket')}</label>
                                        <p>{selectedTicket.id_ticket}</p>
                                      </div>
                                    )}
                                    {selectedTicket.store_branch_plaza && (
                                      <div>
                                        <label className="text-gray-500">{t('history.storeBranchPlaza')}</label>
                                        <p>{selectedTicket.store_branch_plaza}</p>
                                      </div>
                                    )}
                                    {selectedTicket.payment_type && (
                                      <div>
                                        <label className="text-gray-500">{t('history.paymentType')}</label>
                                        <p>{selectedTicket.payment_type}</p>
                                      </div>
                                    )}
                                    {selectedTicket.tc_number && (
                                      <div>
                                        <label className="text-gray-500">{t('history.tcNumber')}</label>
                                        <p>{selectedTicket.tc_number}</p>
                                      </div>
                                    )}
                                    {selectedTicket.tr_number && (
                                      <div>
                                        <label className="text-gray-500">{t('history.trNumber')}</label>
                                        <p>{selectedTicket.tr_number}</p>
                                      </div>
                                    )}
                                    {selectedTicket.fol_vta && (
                                      <div>
                                        <label className="text-gray-500">{t('history.folVta')}</label>
                                        <p>{selectedTicket.fol_vta}</p>
                                      </div>
                                    )}
                                    {selectedTicket.register_station_terminal && (
                                      <div>
                                        <label className="text-gray-500">{t('history.registerStationTerminal')}</label>
                                        <p>{selectedTicket.register_station_terminal}</p>
                                      </div>
                                    )}
                                    {selectedTicket.card_last_4_digits && (
                                      <div>
                                        <label className="text-gray-500">{t('history.cardLast4Digits')}</label>
                                        <p>{selectedTicket.card_last_4_digits}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewImage(ticket)}
                      style={{ width: '144px', minWidth: '144px', maxWidth: '144px' }}
                      className={`border-[#208692] text-[#208692] hover:bg-[#E5EADF] ${!ticket.file_url ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!ticket.file_url}
                      title={!ticket.file_url ? t('history.noImageTooltip') : t('history.viewTicket')}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {t('history.viewTicket')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('history.previous')}
          </Button>
          <span className="text-sm text-gray-600">
            {t('history.pageOf', { current: currentPage.toString(), total: totalPages.toString() }).replace('{current}', currentPage.toString()).replace('{total}', totalPages.toString())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {t('history.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[#208692]">{t('history.ticketImage')}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImageModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6 pt-0">
            {selectedImageUrl && (
              <div className="flex justify-center">
                <img
                  src={selectedImageUrl}
                  alt={t('history.ticketImage')}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border border-gray-200"
                  onLoad={() => console.log('✅ Image loaded successfully:', selectedImageUrl)}
                  onError={(e) => {
                    console.error('❌ Error loading image:', selectedImageUrl, e);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            {!selectedImageUrl && (
              <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="text-6xl text-gray-300">📷</div>
                <div className="text-center">
                  <p className="text-gray-500 text-lg font-medium">{t('history.noImageAvailable')}</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {t('history.noImageDescription')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

